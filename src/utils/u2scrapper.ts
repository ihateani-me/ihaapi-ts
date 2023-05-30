/* eslint-disable @typescript-eslint/no-this-alias */
import _ from "lodash";
import * as cheerio from "cheerio";
import xml2js from "xml2js";
import { DateTime } from "luxon";
import axios, { AxiosInstance } from "axios";

import { filter_empty, is_none, Nullable, sortObjectsByKey } from "./swissknife";
import { logger as TopLogger } from "./logger";

import { MongoConnection } from "../controller/mongo_client";

import config from "../config";
import { AnyDict } from "./imagebooru/base";

const MainLogger = TopLogger.child({ cls: "U2Scrapper" });

const U2_DATABASE = new MongoConnection("u2db", false);
if (is_none(config.u2.cookies) && is_none(config.u2.passkey)) {
    MainLogger.warn("Disabling U2 Scrapper since both passkey and cookies are null");
} else {
    U2_DATABASE.connect();
}
// Used for Offers, the one thing needed are nexusphp_u2

function default_settings() {
    return "cat15=1&cat16=1&rows=20&icat=1&ismalldescr=1&isize=1&iuplder=1&trackerssl=1";
}

interface U2RSSResults {
    items: AnyDict[];
    meta: AnyDict;
}

interface U2Torrent {
    title: string;
    original_title: string;
    category: string;
    link: string;
    download_link: string;
    author: string;
    size: string;
    publishedAt: string;
    pubSort: number;
}

interface U2OfferTorrent {
    id?: string;
    title?: string;
    summary?: string;
    link?: string;
    category?: string;
    size?: string;
    author?: string;
    vote_url?: string;
    vote_data?: {
        for?: number;
        against?: number;
    };
    posted?: string;
    timeout?: string;
}

async function feedParse(text_data: string): Promise<U2RSSResults> {
    const parsedFeeds = await xml2js.parseStringPromise(text_data);
    const metaData: AnyDict = _.get(parsedFeeds, "rss.channel.0");
    const itemsSets: AnyDict[] = _.get(metaData, "item", []);
    const metaDataParsed: AnyDict = {};
    for (const [metaKey, metaVal] of Object.entries(metaData)) {
        if (metaKey === "item" || metaKey === "items") {
            continue;
        }
        metaDataParsed[metaKey] = metaVal[0];
    }
    const itemsSetsParsed = itemsSets.map((res) => {
        const mapped: AnyDict = {};
        for (const [key, val] of Object.entries(res)) {
            const item = val[0];
            if (key === "category") {
                mapped[key] = item["_"];
            } else if (key === "enclosure") {
                mapped[key] = item["$"];
            } else if (key === "guid") {
                mapped[key] = item["_"];
            } else {
                mapped[key] = item;
            }
        }
        return mapped;
    });
    return {
        meta: metaDataParsed,
        items: itemsSetsParsed,
    };
}

class U2Sessions {
    session: AxiosInstance;
    no_cookies: boolean;

    constructor() {
        const U2_COOKIES = config.u2.cookies;
        const SESSION_HEADERS: any = {
            "Cache-Control": "no-cache",
            "User-Agent":
                // eslint-disable-next-line max-len
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.116 Safari/537.36",
        };
        if (!is_none(U2_COOKIES)) {
            SESSION_HEADERS["Cookie"] = U2_COOKIES;
        }
        const session = axios.create({ headers: SESSION_HEADERS });
        this.session = session;
        this.no_cookies = is_none(U2_COOKIES) ? true : false;
    }

    async request(url: string) {
        if (this.no_cookies && !url.includes("passkey")) {
            return "";
        }
        return (await this.session.get(url)).data;
    }
}

export async function getU2TorrentsRSS(options: Nullable<string> = null): Promise<[U2Torrent[], string]> {
    const logger = MainLogger.child({ fn: "getU2TorrentsRSS" });
    const sess = new U2Sessions();
    const U2_PASSKEY = config.u2.passkey;
    if (is_none(options)) {
        options = default_settings();
    } else {
        options += "&icat=1&ismalldescr=1&isize=1&iuplder=1";
        options += "&trackerssl=1";
    }
    if (is_none(U2_PASSKEY)) {
        logger.warn("`U2_PASSKEY` are not provided in env file.");
        return [[], "webmaster doesn't provide U2 Passkey"];
    }
    options += "&passkey=" + U2_PASSKEY;
    logger.info("fetching rss...");
    let res;
    try {
        res = await sess.request(`https://u2.dmhy.org/torrentrss.php?${options}`);
    } catch (err) {
        logger.error(err);
        let errStr = "Unknown error occurred.";
        if (err instanceof Error) {
            errStr = err.toString();
        }
        return [[], "Exception occured: " + errStr];
    }

    if (is_none(res) || !res) {
        return [[], "Exception occurred: Invalid data received from U2"];
    }

    let u2_res;
    try {
        u2_res = await feedParse(res);
    } catch (err) {
        logger.error(err);
        console.error(err);
        let errStr = "Unknown error occurred.";
        if (err instanceof Error) {
            errStr = err.toString();
        }
        return [[], "Exception occured: " + errStr];
    }
    if (Object.keys(u2_res).length < 1) {
        return [[], "Exception occured: failed to parse U2 data."];
    }

    let u2_results: U2Torrent[] = [];
    logger.info("finalizing results...");
    u2_res["items"].forEach((entry_data) => {
        // @ts-ignore
        const dataset: U2Torrent = {};
        const title_regex =
            /\[(?<category>[a-zA-Z0-9_ ]+)\](?<main_title>.*)\[(?<torrent_size>[\d. \w]+)\]\[(?<uploader>.*)\]/gim;
        const temp_title = entry_data["title"];
        const title_array = title_regex.exec(temp_title)?.groups;
        let temp_author = entry_data["author"];
        if (temp_author.includes("<i>")) {
            temp_author = temp_author.replace(/(<i>|<\/i>)/g, "");
        }
        const author = temp_author;

        const pubdate_parsed = DateTime.fromISO(entry_data["pubdate"]);

        dataset["title"] = _.get(title_array, "main_title", "");
        dataset["original_title"] = temp_title;
        dataset["category"] = entry_data["category"];
        dataset["link"] = entry_data["link"];
        dataset["download_link"] = entry_data["enclosure"]["url"];
        dataset["author"] = author;
        dataset["size"] = _.get(title_array, "torrent_size", "0.0 B");
        dataset["publishedAt"] = pubdate_parsed
            .setZone("Asia/Jakarta")
            .toFormat("ddd, DD MMM YYYY HH:mm:ss Z");
        dataset["pubSort"] = pubdate_parsed.toUnixInteger();
        u2_results.push(dataset);
    });
    u2_results = sortObjectsByKey(u2_results, "pubSort");
    return [u2_results, "Success"];
}

export async function getU2TorrentOffers(): Promise<[U2OfferTorrent[], string]> {
    const logger = MainLogger.child({ fn: "getU2TorrentOffers" });
    const sess = new U2Sessions();
    if (sess.no_cookies) {
        logger.warn("`U2_COOKIES` are not provided in env file.");
        return [[], "webmaster doesn't provide U2 Cookies"];
    }

    logger.info("requesting offers page...");
    let res;
    try {
        res = await sess.request(`https://u2.dmhy.org/offers.php`);
    } catch (err) {
        logger.error(err);
        let errStr = "Unknown error occurred.";
        if (err instanceof Error) {
            errStr = err.toString();
        }
        return [[], "Exception occured: " + errStr];
    }

    if (is_none(res) || !res) {
        return [[], "Exception occurred: Invalid data received from U2"];
    }

    const $ = cheerio.load(res);

    // scuffed way to only select the main tr and not inner one.
    // this is bad, and very hacky, and might be broken.
    // :FubukiWorry:
    logger.info("processing results...");
    const $main_table = $("table.mainouter");
    const $torrents_set: cheerio.Cheerio<any>[] = $main_table
        .find("table.torrents > tbody > tr")
        .map((index, elem) => {
            return $(elem);
        })
        .get();
    // let $main_head = $torrents_set[0];
    const parsed_data = $torrents_set.slice(1).map(($torrent) => {
        const all_td = $torrent.children("td");
        if (all_td.length == 0) {
            return {};
        }

        // category
        const category_name = $(all_td[0]).children("a").text().trimRight();
        const title_set = $(all_td[1]).find("table.torrentname > tbody > tr");

        // name, desc, and url
        const $torrent_alink = $(title_set[0]).find("a");
        const torrent_name = $torrent_alink.attr("title");
        const torrent_desc = $(title_set[1]).find("td.embedded.overflow-control").text().trim();
        let offer_url_data = $torrent_alink.attr("href");
        if (!is_none(offer_url_data)) {
            offer_url_data = offer_url_data.trim();
        } else {
            offer_url_data = "";
        }
        const offer_url = "https://u2.dmhy.org/offers.php" + offer_url_data;
        const offer_id = offer_url.substr(
            offer_url.indexOf("?id=") + 4,
            offer_url.indexOf("&off_detail") - offer_url.indexOf("?id=") - 4
        );

        // vote data
        const $torrent_votes = $(all_td[2]).find("a");
        const offer_vote_url = "https://u2.dmhy.org/offers.php" + $torrent_votes.attr("href");
        const accept_vote = parseInt($($torrent_votes.children("font")[0]).text().trim());
        const reject_vote = parseInt($($torrent_votes.children("font")[1]).text().trim());

        // torrent size
        const torrent_sizes_arr = filter_empty(
            $(all_td[3])
                .text()
                .split(/^([\d.]*)([\w]+)$/gm)
        );
        const torrent_size = torrent_sizes_arr.join(" ");

        // upload date
        const upload_date_arr = filter_empty(
            $(all_td[5])
                .text()
                .split(/^([\d]{2,4}-[\d]{1,2}-[\d]{2})(.*)$/gm)
        );
        const torrent_uploaded = upload_date_arr.join(" ");

        // vote timeout date
        const timeout_date_arr = filter_empty(
            $(all_td[6])
                .text()
                .split(/^([\d]{2,4}-[\d]{1,2}-[\d]{2})(.*)$/gm)
        );
        const torrent_timeout = timeout_date_arr.join(" ");

        // uploader name
        const torrent_uploader = $(all_td[7]).text();

        return {
            id: offer_id,
            title: torrent_name,
            summary: torrent_desc,
            link: offer_url,
            category: category_name,
            size: torrent_size,
            author: torrent_uploader,
            vote_url: offer_vote_url,
            vote_data: {
                for: accept_vote,
                against: reject_vote,
            },
            posted: torrent_uploaded,
            timeout: torrent_timeout,
        };
    });

    return [parsed_data, "Success"];
}

export async function checkNewestRSS(
    options: Nullable<string> = null,
    sort_from_newest: boolean = false
): Promise<U2Torrent[]> {
    const logger = MainLogger.child({ fn: "checkNewestU2RSS" });
    let u2_dataset, _m;
    try {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        [u2_dataset, _m] = await getU2TorrentsRSS(options);
    } catch (e) {
        return [];
    }

    if (u2_dataset.length < 1) {
        return [];
    }

    logger.info("Fetching old data...");
    const u2_olddata = (await U2_DATABASE.open_collection("u2data"))[0];
    let u2_filtered_data: any[] = [];
    u2_dataset.forEach((new_data) => {
        if (!u2_olddata["data"].includes(new_data["link"])) {
            u2_filtered_data.push(new_data);
            u2_olddata["data"].push(new_data["link"]);
        }
    });

    if (u2_filtered_data.length > 0) {
        logger.info("Updating old data...");
        await U2_DATABASE.update_collection("u2data", u2_olddata);
    }
    if (sort_from_newest) {
        u2_filtered_data = u2_filtered_data.reverse();
    }
    return u2_filtered_data;
}

export async function checkNewestOffers(sort_from_newest: boolean = false): Promise<U2OfferTorrent[]> {
    const logger = MainLogger.child({ fn: "checkNewestU2Offers" });
    let u2_dataset, _m;
    try {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        [u2_dataset, _m] = await getU2TorrentOffers();
    } catch (e) {
        return [];
    }

    if (u2_dataset.length < 1) {
        return [];
    }

    logger.info("Fetching old data...");
    const u2_olddata = (await U2_DATABASE.open_collection("offersdata"))[0];
    let u2_filtered_data: any[] = [];
    u2_dataset.forEach((new_data) => {
        if (!u2_olddata["data"].includes(new_data["link"])) {
            u2_filtered_data.push(new_data);
            u2_olddata["data"].push(new_data["link"]);
        }
    });

    if (u2_filtered_data.length > 0) {
        logger.info("Updating old data...");
        await U2_DATABASE.update_collection("offersdata", u2_olddata);
    }
    if (sort_from_newest) {
        u2_filtered_data = u2_filtered_data.reverse();
    }
    return u2_filtered_data;
}
