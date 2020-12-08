import axios, { AxiosInstance } from 'axios';
import moment = require("moment-timezone");
import { RedisDB } from "../dbconn/redis_client";
import { getValueFromKey, is_none, removeKeyFromObjects, sortObjectsByKey } from "./swissknife";
import getMimeType = require('mime-type-check');
import { basename } from 'path';

interface nhInfoData {
    id: string
    title: string
    original_title?: {
        japanase?: string
        other?: string
    }
    cover: string
    tags: {
        artists?: (string | number)[][]
        categories?: (string | number)[][]
        groups?: (string | number)[][]
        languages?: (string | number)[][]
        tags?: (string | number)[][]
        parodies?: (string | number)[][]
        characters?: (string | number)[][]
    }
    images: string[]
    images_size?: number[][];
    url: string
    posted_time: number
    favorites: number
    total_pages: number
    page_ident?: number
    status_code?: number
}

interface nhSearchData {
    query?: string
    current_page?: number
    total_page?: number
    results?: nhInfoData[]
    total_data?: number
    message?: string
    status_code?: number
}

const CHROME_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.116 Safari/537.36";
const REDIS_PASSWORD = process.env.REDIS_PASSWORD;
const REDIS_HOST = process.env.REDIS_HOST;
const REDIS_PORT = parseInt(process.env.REDIS_PORT);
const REDIS_INSTANCE = new RedisDB(is_none(REDIS_HOST) ? "127.0.0.1" : REDIS_HOST, isNaN(REDIS_PORT) ? 6379 : REDIS_PORT, REDIS_PASSWORD);

function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

async function nhRequest(url: string, session: AxiosInstance): Promise<[any, number]> {
    let resp = await session.get(url);
    if (resp.status != 200) {
        if (resp.status == 404 || resp.status == 403) {
            return [{ message: "no results", status_code: 404 }, 404];
        } else {
            return [
                {
                    message: "Unknown error occured.",
                    status_code: resp.status
                },
                resp.status
            ];
        };
    };

    return [resp.data, 200];
}

async function nhParseJson(res_data: object, page_ident = null): Promise<nhInfoData> {
    let parsed_data = {
        "id": "",
        "title": "",
        "original_title": { "japanese": "", "other": "" },
        "cover": "",
        "tags": {},
        "images": [],
        "url": "",
        "posted_time": 0,
        "favorites": 0,
        "total_pages": 0
    };
    var parsed_tags = {
        "parodies": [],
        "characters": [],
        "tags": [],
        "artists": [],
        "groups": [],
        "languages": [],
        "categories": []
    };
    let exts_map = { "j": "jpg", "p": "png", "g": "gif" };
    let availtags = {
        "tag": "tags",
        "language": "languages",
        "group": "groups",
        "artist": "artists",
        "category": "categories",
        "parody": "parodies",
        "character": "characters"
    };

    let media_id = res_data["media_id"];
    let titles = res_data["title"];

    parsed_data["id"] = res_data["id"];
    parsed_data["title"] = getValueFromKey(titles, "pretty", getValueFromKey(titles, "english", ""));
    parsed_data["original_title"]["japanese"] = getValueFromKey(titles, "japanese", "");
    parsed_data["original_title"]["other"] = getValueFromKey(titles, "english", "");

    let image_set = res_data["images"];
    let cover_image_ext = image_set["cover"]["t"];

    parsed_data["cover"] = `https://api.ihateani.me/v1/nh/t/${media_id}/cover.${getValueFromKey(exts_map, cover_image_ext, "jpg")}`;

    // Parse tags
    let tags = res_data["tags"];
    for (let i = 0; i < tags.length; i++) {
        let tag_elem = tags[i];
        let tag_name = getValueFromKey(availtags, tag_elem["type"]);
        if (is_none(tag_name)) {
            continue;
        }
        let tags_data = [tag_elem["name"], tag_elem["count"]];
        parsed_tags[tag_name].push(tags_data);
    }
    parsed_data["tags"] = parsed_tags;

    let images = image_set["pages"];
    var img_list = [];
    var size_list = [];

    for (let i = 0; i < images.length; i++) {
        let elem_img = images[i];
        let img_ext = getValueFromKey(elem_img, elem_img["t"], "jpg");
        let img_url = `https://api.ihateani.me/v1/nh/i/${media_id}/${i + 1}.${img_ext}`;
        let img_px = [elem_img["w"], elem_img["h"]];
        img_list.push(img_url);
        size_list.push(img_px);
    }
    parsed_data["images"] = img_list;
    parsed_data["images_size"] = size_list;

    parsed_data["url"] = `https://nhentai.net/g/${res_data["id"]}`;
    let current_time = moment.utc().unix();
    parsed_data["posted_time"] = getValueFromKey(res_data, "upload_date", current_time);
    parsed_data["favorites"] = getValueFromKey(res_data, "num_favorites", 0);
    parsed_data["total_pages"] = getValueFromKey(res_data, "num_pages", img_list.length);

    if (!is_none(page_ident)) {
        parsed_data["page_ident"] = page_ident;
    }

    return parsed_data;
}

export async function nhFetchInfo(doujin_id: string): Promise<[nhInfoData | string, number]> {
    console.info(`[nh:info] Fetching code: ${doujin_id}`);
    let cache_data: nhInfoData = await REDIS_INSTANCE.get(`nhi${doujin_id}`);
    if (!is_none(cache_data)) {
        console.log(`[nh:info] Cache exist for ${doujin_id}, using it...`);
        cache_data["status_code"] = 200;
        return [cache_data, 200];
    }

    let session = axios.create({
        headers: {
            "User-Agent": CHROME_UA
        }
    });

    console.info("[nh:info] Communicating with nhentai.");
    let [res_data, stat_code] = await nhRequest(`https://nhentai.net/api/gallery/${doujin_id}`, session);
    if (stat_code != 200) {
        console.error(`[nh:info] err ${stat_code}: ${res_data['message']}`);
        return [res_data, stat_code];
    }

    console.info("[nh:info] Parsing results...");
    let parsed_info = await nhParseJson(res_data);
    await REDIS_INSTANCE.setex(`nhi${doujin_id}`, 60 * 60 * 24 * 3, parsed_info);
    parsed_info["status_code"] = 200;
    return [parsed_info, 200];
}

export async function nhSearchDoujin(query: string, page: number): Promise<[nhSearchData, number]> {
    console.info(`[nh:search] Searching: ${query}`);
    let session = axios.create({
        headers: {
            "User-Agent": CHROME_UA
        }
    });

    console.info("[nh:search] Communicating with nhentai.");
    let request_url = `https://nhentai.net/api/galleries/search?query=${encodeURIComponent(query)}&page=${page}`;
    let [res_data, stat_code] = await nhRequest(request_url, session);
    if (stat_code != 200) {
        console.error(`[nh:search] err ${stat_code}: ${res_data['message']}`);
        return [res_data, stat_code];
    }

    console.info("[nh:search] Parsing results...");
    let request_results: object[] = res_data["result"];
    if (is_none(request_results)) {
        console.error("[nh:search] err 404: no results");
        return [{ "status_code": 400, "message": "no results" }, 404];
    }
    let parsed_results: nhInfoData[] = [];
    for (let index = 0; index < request_results.length; index++) {
        let obj_parsed = await nhParseJson(request_results[index], index);
        parsed_results.push(obj_parsed);
    }

    parsed_results = sortObjectsByKey(parsed_results, "page_ident");
    parsed_results = removeKeyFromObjects(parsed_results, "page_ident");

    let json_final_data: nhSearchData = {
        "query": query,
        "current_page": page,
        "total_page": res_data["num_pages"],
        "results": parsed_results,
        "total_data": parsed_results.length
    };

    return [json_final_data, 200];
}

export async function nhLatestDoujin(page: number): Promise<[nhSearchData, number]> {
    console.info(`[nh:latest] Fetching page: ${page}`);
    let cache_data: nhSearchData = await REDIS_INSTANCE.get(`nhlatest_page${page}`);
    if (!is_none(cache_data)) {
        console.log(`[nh:latest] Cache exist for latest page ${page}, using it...`);
        cache_data["status_code"] = 200;
        return [cache_data, 200];
    }
    let session = axios.create({
        headers: {
            "User-Agent": CHROME_UA
        }
    });

    console.info("[nh:latest] Communicating with nhentai.");
    let request_url = `https://nhentai.net/api/galleries/all?page=${page}`;
    let [res_data, stat_code] = await nhRequest(request_url, session);
    if (stat_code != 200) {
        console.error(`[nh:search] err ${stat_code}: ${res_data['message']}`);
        return [res_data, stat_code];
    }

    console.info("[nh:latest] Parsing results...");
    let request_results: object[] = res_data["result"];
    if (is_none(request_results)) {
        console.error("[nh:latest] err 404: no results");
        return [{ "status_code": 400, "message": "no results" }, 404];
    }
    let parsed_results: nhInfoData[] = [];
    for (let index = 0; index < request_results.length; index++) {
        let obj_parsed = await nhParseJson(request_results[index], index);
        parsed_results.push(obj_parsed);
    }

    parsed_results = sortObjectsByKey(parsed_results, "page_ident");
    parsed_results = removeKeyFromObjects(parsed_results, "page_ident");

    let json_final_data: nhSearchData = {
        "total_page": res_data["num_pages"],
        "current_page": page,
        "results": parsed_results,
        "total_data": parsed_results.length
    };

    await REDIS_INSTANCE.setex(`nhlatest_page${page}`, 60 * 30, json_final_data);
    return [json_final_data, 200];
}

async function nhInternalImageCaching(url: string, session: AxiosInstance): Promise<[Buffer, string]> {
    console.info(`[nh:imgcache] finding cache: ${url}`);
    let base_name = basename(url).split(".");
    let ext = base_name.slice(base_name.length - 1, base_name.length).join(".");
    let mimetype = getMimeType(ext);
    try {
        var img_cache = await REDIS_INSTANCE.get(url);
    } catch (e) {
        return [null, null];
    }
    if (is_none(img_cache)) {
        console.info(`[nh:imgcache] ${url} cache not found, requesting.`);
        while (true) {
            var [r_img, stat_code] = await nhRequest(url, session);
            if (stat_code == 404) {
                return [null, null];
            }
            if (stat_code < 400) {
                break;
            }
            console.warn("[nh:imgcache:req] failed to request, retrying in 500ms");
            await sleep(500);
        }
        console.log(`[nh:imgcache] Caching ${url}`);
        let buffer_image = Buffer.from(r_img, "binary");
        await REDIS_INSTANCE.setex(url, 60 * 60 * 24 * 7, buffer_image.toString("base64"));
        // used for expressjs return.
        return [buffer_image, mimetype];
    } else {
        console.info(`[nhproxy:imgcache] ${url} cache found.`);
        // used for expressjs return.
        let buffer_image = Buffer.from(img_cache, "base64");
        return [buffer_image, mimetype];
    }
}

export async function nhImageProxy(doujin_id: string, page: number): Promise<[nhInfoData | nhSearchData | Buffer, string, number]> {
    if (page < 1) { page = 1};
    let session = axios.create({
        headers: {
            "User-Agent": CHROME_UA
        },
        responseType: "arraybuffer"
    });
    console.info(`[nh:simg] finding info cache: ${doujin_id}`)
    let parsed_info: nhInfoData = await REDIS_INSTANCE.get(`nhi${doujin_id}`)
    if (!is_none(parsed_info)) {
        console.info(`[nh:simg:${doujin_id}] info cache found`);
    } else {
        let inf_stat_code: number;
        // @ts-ignore
        [parsed_info, inf_stat_code] = await nhFetchInfo(doujin_id);
        if (inf_stat_code != 200) {
            return [parsed_info, null, inf_stat_code]
        }
    }

    console.info(`[nh:simg:${doujin_id}] getting image set`);
    let images = parsed_info["images"];
    try {
        var image_url = images[page - 1];
    } catch (e) {
        console.error(`[nh:simg:${doujin_id}] number out of bounds`);
        return [
            {"status_code": 404, "message": "page number doesn't exists"},
            null,
            404,
        ]
    }

    if (image_url.includes("nh/i")) {
        image_url = image_url.replace("https://api.ihateani.me/v1/nh/i/", "https://i.nhentai.net/galleries/");
    } else if (image_url.includes("nh/t")) {
        image_url = image_url.replace("https://api.ihateani.me/v1/nh/t/", "https://t.nhentai.net/galleries/");
    }

    console.info(`[nh:simg:${doujin_id}] getting image cache...`);
    let [image_buffer, mimetype] = await nhInternalImageCaching(image_url, session);
    if (is_none(image_buffer)) {
        return [{"status_code": 404, "message": "image not found"}, null, 404];
    }
    return [image_buffer, mimetype, 200];
}

export async function nhImagePathProxy(path: string, is_thumbnail: boolean = false): Promise<[nhSearchData | Buffer, string]> {
    var base_url = "https://i.nhentai.net/galleries/";
    if (is_thumbnail) {
        base_url = "https://t.nhentai.net/galleries/";
    }

    let session = axios.create({
        headers: {
            "User-Agent": CHROME_UA
        },
        responseType: "arraybuffer"
    });

    let image_url = `${base_url}${path}`;
    console.info(`[nh:imgproxy] getting image proxy: ${path}`);
    let [image_buffer, mimetype] = await nhInternalImageCaching(image_url, session);
    if (is_none(image_buffer)) {
        return [{"status_code": 404, "message": "image not found"}, null];
    }
    return [image_buffer, mimetype];
}
