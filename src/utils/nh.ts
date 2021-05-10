import moment from "moment-timezone";
import getMimeType from "mime-type-check";
import axios, { AxiosInstance } from "axios";
import { basename } from "path";

import { logger as TopLogger } from "./logger";
import { getValueFromKey, is_none, Nulled, removeKeyFromObjects, sortObjectsByKey } from "./swissknife";

import { RedisDB } from "../controller";

import config from "../config";
import { nhImage } from "../graphql/schemas";

const MainLogger = TopLogger.child({ cls: "nHentai" });

interface ImageNHData {
    h: number;
    w: number;
    t: "p" | "j" | "g";
}

interface nhTagsData {
    artists?: (string | number)[][];
    categories?: (string | number)[][];
    groups?: (string | number)[][];
    languages?: (string | number)[][];
    tags?: (string | number)[][];
    parodies?: (string | number)[][];
    characters?: (string | number)[][];
}

export interface nhInfoData {
    id: string;
    media_id?: string;
    title: string;
    original_title?: {
        japanese?: string;
        other?: string;
    };
    cover: nhImage;
    tags: nhTagsData;
    images: string[];
    images_size?: number[][];
    url: string;
    posted_time: number;
    favorites: number;
    total_pages: number;
    page_ident?: number;
    status_code?: number;
}

interface nhSearchData {
    query?: string;
    current_page?: number;
    total_page?: number;
    results?: nhInfoData[];
    total_data?: number;
    message?: string;
    status_code?: number;
}

const CHROME_UA =
    // eslint-disable-next-line max-len
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.116 Safari/537.36";
const REDIS_PASSWORD = config["redis"]["password"];
const REDIS_HOST = config["redis"]["host"];
const REDIS_PORT = config["redis"]["port"];
const REDIS_INSTANCE = new RedisDB(
    is_none(REDIS_HOST) ? "127.0.0.1" : REDIS_HOST,
    isNaN(REDIS_PORT) ? 6379 : REDIS_PORT,
    REDIS_PASSWORD
);

function sleep(ms: number) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

async function nhRequest(url: string, session: AxiosInstance): Promise<[any, number]> {
    const resp = await session.get(url);
    if (resp.status != 200) {
        if (resp.status == 404 || resp.status == 403) {
            return [{ message: "no results", status_code: 404 }, 404];
        } else {
            return [
                {
                    message: "Unknown error occured.",
                    status_code: resp.status,
                },
                resp.status,
            ];
        }
    }

    return [resp.data, 200];
}

async function nhParseJson(
    res_data: { [key: string]: any },
    page_ident: number | Nulled = null
): Promise<nhInfoData> {
    const parsed_data: nhInfoData = {
        id: "",
        media_id: "",
        title: "",
        original_title: { japanese: "", other: "" },
        // @ts-ignore
        cover: {},
        tags: {},
        images: [],
        url: "",
        posted_time: 0,
        favorites: 0,
        total_pages: 0,
    };
    const parsed_tags: {
        parodies: any[];
        characters: any[];
        tags: any[];
        artists: any[];
        groups: any[];
        languages: any[];
        categories: any[];
    } = {
        parodies: [],
        characters: [],
        tags: [],
        artists: [],
        groups: [],
        languages: [],
        categories: [],
    };
    const exts_map = { j: "jpg", p: "png", g: "gif" };
    const availtags = {
        tag: "tags",
        language: "languages",
        group: "groups",
        artist: "artists",
        category: "categories",
        parody: "parodies",
        character: "characters",
    };

    const media_id = res_data["media_id"];
    const titles = res_data["title"];

    parsed_data["id"] = res_data["id"];
    parsed_data["media_id"] = media_id;
    parsed_data["title"] = getValueFromKey(titles, "pretty", getValueFromKey(titles, "english", ""));
    // @ts-ignore
    parsed_data["original_title"]["japanese"] = getValueFromKey(titles, "japanese", "") as string;
    // @ts-ignore
    parsed_data["original_title"]["other"] = getValueFromKey(titles, "english", "") as string;

    const image_set = res_data["images"];
    const cover_sizes = [image_set["cover"]["w"], image_set["cover"]["h"]];
    const cover_image_ext = image_set["cover"]["t"];

    const parsedCoverURL = `https://api.ihateani.me/v1/nh/t/${media_id}/cover.${getValueFromKey(
        exts_map,
        cover_image_ext,
        "jpg"
    )}`;

    parsed_data["cover"] = {
        url: parsedCoverURL,
        original_url: parsedCoverURL.replace(
            "https://api.ihateani.me/v1/nh/t/",
            "https://t.nhentai.net/galleries/"
        ),
        sizes: cover_sizes,
        type: "thumbnail",
    };

    // Parse tags
    const tags = res_data["tags"];
    for (let i = 0; i < tags.length; i++) {
        const tag_elem = tags[i];
        const tag_name = getValueFromKey(availtags, tag_elem["type"]);
        if (is_none(tag_name)) {
            continue;
        }
        const tags_data = [tag_elem["name"], tag_elem["count"]];
        parsed_tags[tag_name as keyof typeof parsed_tags].push(tags_data);
    }
    parsed_data["tags"] = parsed_tags;

    const images = image_set["pages"] as ImageNHData[];
    const img_list: string[] = [];
    const size_list: any[][] = [];

    for (let i = 0; i < images.length; i++) {
        const elem_img = images[i];
        const img_ext = getValueFromKey(exts_map, elem_img["t"], "jpg");
        const img_url = `https://api.ihateani.me/v1/nh/i/${media_id}/${i + 1}.${img_ext}`;
        const img_px = [elem_img["w"], elem_img["h"]];
        img_list.push(img_url);
        size_list.push(img_px);
    }
    parsed_data["images"] = img_list;
    parsed_data["images_size"] = size_list;

    parsed_data["url"] = `https://nhentai.net/g/${res_data["id"]}`;
    const current_time = moment.utc().unix();
    parsed_data["posted_time"] = getValueFromKey(res_data, "upload_date", current_time);
    parsed_data["favorites"] = getValueFromKey(res_data, "num_favorites", 0);
    parsed_data["total_pages"] = getValueFromKey(res_data, "num_pages", img_list.length);

    if (!is_none(page_ident)) {
        parsed_data["page_ident"] = page_ident;
    }

    return parsed_data;
}

export async function nhFetchInfo(doujin_id: string): Promise<[nhInfoData | string, number]> {
    const logger = MainLogger.child({ fn: "fetchInfo" });
    logger.info(`Fetching code: ${doujin_id}`);
    const cache_data: nhInfoData = await REDIS_INSTANCE.get(`nhi${doujin_id}`);
    if (!is_none(cache_data)) {
        logger.info(`Cache exist for ${doujin_id}, using it...`);
        cache_data["status_code"] = 200;
        return [cache_data, 200];
    }

    const session = axios.create({
        headers: {
            "User-Agent": CHROME_UA,
        },
    });

    logger.info("Communicating with nhentai.");
    const [res_data, stat_code] = await nhRequest(`https://nhentai.net/api/gallery/${doujin_id}`, session);
    if (stat_code != 200) {
        logger.error(`err ${stat_code}: ${res_data["message"]}`);
        return [res_data, stat_code];
    }

    logger.info("Parsing results...");
    const parsed_info = await nhParseJson(res_data);
    await REDIS_INSTANCE.setex(`nhi${doujin_id}`, 60 * 60 * 24 * 3, parsed_info);
    parsed_info["status_code"] = 200;
    return [parsed_info, 200];
}

export async function nhSearchDoujin(query: string, page: number): Promise<[nhSearchData, number]> {
    const logger = MainLogger.child({ fn: "searchDoujin" });
    logger.info(`Searching: ${query}`);
    const session = axios.create({
        headers: {
            "User-Agent": CHROME_UA,
        },
    });

    logger.info("Communicating with nhentai.");
    const request_url = `https://nhentai.net/api/galleries/search?query=${encodeURIComponent(
        query
    )}&page=${page}`;
    const [res_data, stat_code] = await nhRequest(request_url, session);
    if (stat_code != 200) {
        logger.error(`err ${stat_code}: ${res_data["message"]}`);
        return [res_data, stat_code];
    }

    logger.info("Parsing results...");
    const request_results: object[] = res_data["result"];
    if (is_none(request_results)) {
        logger.error("err 404: no results");
        return [{ status_code: 400, message: "no results" }, 404];
    }
    let parsed_results: nhInfoData[] = [];
    for (let index = 0; index < request_results.length; index++) {
        const obj_parsed = await nhParseJson(request_results[index], index);
        parsed_results.push(obj_parsed);
    }

    parsed_results = sortObjectsByKey(parsed_results, "page_ident");
    parsed_results = removeKeyFromObjects(parsed_results, "page_ident") as nhInfoData[];

    const json_final_data: nhSearchData = {
        query: query,
        current_page: page,
        total_page: res_data["num_pages"],
        results: parsed_results,
        total_data: parsed_results.length,
    };

    return [json_final_data, 200];
}

export async function nhLatestDoujin(page: number): Promise<[nhSearchData, number]> {
    const logger = MainLogger.child({ fn: "latestDoujin" });
    logger.info(`Fetching page: ${page}`);
    const cache_data: nhSearchData = await REDIS_INSTANCE.get(`nhlatest_page${page}`);
    if (!is_none(cache_data)) {
        logger.info(`Cache exist for latest page ${page}, using it...`);
        cache_data["status_code"] = 200;
        return [cache_data, 200];
    }
    const session = axios.create({
        headers: {
            "User-Agent": CHROME_UA,
        },
    });

    logger.info("Communicating with nhentai.");
    const request_url = `https://nhentai.net/api/galleries/all?page=${page}`;
    const [res_data, stat_code] = await nhRequest(request_url, session);
    if (stat_code != 200) {
        logger.error(`err ${stat_code}: ${res_data["message"]}`);
        return [res_data, stat_code];
    }

    logger.info("Parsing results...");
    const request_results: object[] = res_data["result"];
    if (is_none(request_results)) {
        logger.error("err 404: no results");
        return [{ status_code: 400, message: "no results" }, 404];
    }
    let parsed_results: nhInfoData[] = [];
    for (let index = 0; index < request_results.length; index++) {
        const obj_parsed = await nhParseJson(request_results[index], index);
        parsed_results.push(obj_parsed);
    }

    parsed_results = sortObjectsByKey(parsed_results, "page_ident");
    parsed_results = removeKeyFromObjects(parsed_results, "page_ident") as nhInfoData[];

    const json_final_data: nhSearchData = {
        total_page: res_data["num_pages"],
        current_page: page,
        results: parsed_results,
        total_data: parsed_results.length,
    };

    await REDIS_INSTANCE.setex(`nhlatest_page${page}`, 60 * 30, json_final_data);
    return [json_final_data, 200];
}

async function nhInternalImageCaching(url: string, session: AxiosInstance): Promise<[Buffer | null, string]> {
    const logger = MainLogger.child({ fn: "imageCaching" });
    logger.info(`finding cache: ${url}`);
    const base_name = basename(url).split(".");
    const ext = base_name.slice(base_name.length - 1, base_name.length).join(".");
    const mimetype = getMimeType(ext);
    let img_cache;
    try {
        img_cache = await REDIS_INSTANCE.get(url);
    } catch (e) {
        return [null, ""];
    }
    if (is_none(img_cache)) {
        logger.info(`${url} cache not found, requesting.`);
        let r_img, stat_code;
        while (true) {
            [r_img, stat_code] = await nhRequest(url, session);
            if (stat_code == 404) {
                return [null, ""];
            }
            if (stat_code < 400) {
                break;
            }
            logger.warn("failed to request, retrying in 500ms");
            await sleep(500);
        }
        logger.info(`Caching ${url}`);
        const buffer_image = Buffer.from(r_img, "binary");
        await REDIS_INSTANCE.setex(url, 60 * 60 * 24 * 7, buffer_image.toString("base64"));
        // used for expressjs return.
        return [buffer_image, mimetype];
    } else {
        logger.info(`${url} cache found.`);
        // used for expressjs return.
        const buffer_image = Buffer.from(img_cache, "base64");
        return [buffer_image, mimetype];
    }
}

export async function nhImageProxy(
    doujin_id: string,
    page: number
): Promise<[nhInfoData | nhSearchData | Buffer, string, number]> {
    const logger = MainLogger.child({ fn: "imageProxy" });
    if (page < 1) {
        page = 1;
    }
    const session = axios.create({
        headers: {
            "User-Agent": CHROME_UA,
        },
        responseType: "arraybuffer",
    });
    logger.info(`finding info cache: ${doujin_id}`);
    let parsed_info: nhInfoData = await REDIS_INSTANCE.get(`nhi${doujin_id}`);
    if (!is_none(parsed_info)) {
        logger.info(`${doujin_id}: info cache found`);
    } else {
        let inf_stat_code: number;
        // @ts-ignore
        [parsed_info, inf_stat_code] = await nhFetchInfo(doujin_id);
        if (inf_stat_code != 200) {
            return [parsed_info, "", inf_stat_code];
        }
    }

    logger.info(`${doujin_id}: getting image set`);
    const images = parsed_info["images"];
    let image_url;
    try {
        image_url = images[page - 1];
    } catch (e) {
        logger.error(`${doujin_id}: number out of bounds`);
        return [{ status_code: 404, message: "page number doesn't exists" }, "", 404];
    }

    if (image_url.includes("nh/i")) {
        image_url = image_url.replace("https://api.ihateani.me/v1/nh/i/", "https://i.nhentai.net/galleries/");
    } else if (image_url.includes("nh/t")) {
        image_url = image_url.replace("https://api.ihateani.me/v1/nh/t/", "https://t.nhentai.net/galleries/");
    }

    logger.info(`${doujin_id}: getting image cache...`);
    const [image_buffer, mimetype] = await nhInternalImageCaching(image_url, session);
    if (is_none(image_buffer)) {
        return [{ status_code: 404, message: "image not found" }, "", 404];
    }
    return [image_buffer, mimetype, 200];
}

export async function nhImagePathProxy(
    path: string,
    is_thumbnail: boolean = false
): Promise<[nhSearchData | Buffer, string]> {
    const logger = MainLogger.child({ fn: "imagePathProxy" });
    let base_url = "https://i.nhentai.net/galleries/";
    if (is_thumbnail) {
        base_url = "https://t.nhentai.net/galleries/";
    }

    const session = axios.create({
        headers: {
            "User-Agent": CHROME_UA,
        },
        responseType: "arraybuffer",
    });

    const image_url = `${base_url}${path}`;
    logger.info(`getting image proxy: ${path}`);
    const [image_buffer, mimetype] = await nhInternalImageCaching(image_url, session);
    if (is_none(image_buffer)) {
        return [{ status_code: 404, message: "image not found" }, ""];
    }
    return [image_buffer, mimetype];
}
