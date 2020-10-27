import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import FeedParser = require('feedparser');
import cheerio = require("cheerio");
import fs = require("fs");
import { is_none, sortObjectsByKey } from './swissknife';
import moment = require('moment-timezone');
import * as stringToStream from "string-to-stream";

const DUMPED_JSON_DATA = __dirname + "/u2_scrapped.json";
const U2_PASSKEY = process.env.U2_PASSKEY;
// Used for Offers, the one thing needed are nexusphp_u2
const U2_COOKIES = process.env.U2_COOKIES;

function default_settings() {
    return "cat15=1&cat16=1&rows=20&icat=1&ismalldescr=1&isize=1&iuplder=1&trackerssl=1";
}

interface U2RSSResults {
    meta?: FeedParser.Meta
    items?: FeedParser.Item[]
}

interface U2Torrent {
    title: string
    original_title: string
    category: string
    link: string
    download_link: string
    author: string
    size: string
    publishedAt: string
    pubSort: number
}

async function feedParse(text_data: string): Promise<U2RSSResults> {
    // @ts-ignore
    let parser = new FeedParser({resume_saxerror: true, addmeta: false});
    stringToStream(text_data, "utf-8").pipe(parser);
    var promiseRss = new Promise((resolve, reject) => {
        const PARSED_DATA = {"items": [], "meta": null};
        parser.on("error", (err) => {
            reject(err);
        });
    
        parser.on("readable", function () {
            var stream = this;
            PARSED_DATA["meta"] = stream.meta;
            var item;
    
            while (item = stream.read()) {
                PARSED_DATA["items"].push(item);
            }
        });

        parser.on("end", () => {
            resolve(PARSED_DATA);
        })
    });

    return (await Promise.all([promiseRss]))[0];
}


class U2Sessions {
    session: AxiosInstance;
    no_cookies: boolean

    constructor() {
        const session = axios.create({
            headers: {
                "Cache-Control": "no-cache",
                "Cookie": is_none(U2_COOKIES) ? "" : U2_COOKIES,
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.116 Safari/537.36"
            }
        });
        this.session = session;
        this.no_cookies = is_none(U2_COOKIES) ? true : false;
    }

    async request(url: string) {
        if (this.no_cookies) {
            return "";
        }
        return (await this.session.get(url)).data;
    }
}


export async function getU2TorrentsRSS(options: string = null): Promise<[U2Torrent[], string]> {
    const sess = new U2Sessions();
    if (is_none(options)) {
        options = default_settings();
    } else {
        options += "&icat=1&ismalldescr=1&isize=1&iuplder=1";
        options += "&trackerssl=1";
    }
    if (is_none(U2_PASSKEY)) {
        console.warn("[getU2TorrentsRSS] `U2_PASSKEY` are not provided in env file.");
        return [[], "webmaster doesn't provide U2 Passkey"];
    }
    console.log("[getU2TorrentsRSS] fetching rss...");
    try {
        var res = await sess.request(`https://u2.dmhy.org/torrentrss.php?${options}`);
    } catch (err) {
        console.error(err);
        return [[], "Exception occured: " + err.toString()];
    }

    if (is_none(res) || !res) {
        return [[], "Exception occurred: Invalid data received from U2"];
    }

    try {
        var u2_res = await feedParse(res);
    } catch (err) {
        console.error(err);
        return [[], "Exception occured: " + err.toString()];
    }
    if (Object.keys(u2_res).length < 1) {
        return [[], "Exception occured: failed to parse U2 data."];
    }

    var u2_results: U2Torrent[] = [];
    u2_res["items"].forEach((entry_data) => {
        // @ts-ignore
        let dataset: U2Torrent = {};
        let title_regex = /\[(?<category>\w+)\](?<main_title>.*)\[(?<torrent_size>[\d. \w]+)\]\[(?<uploader>\w+)\]/gmi;
        let temp_title = entry_data["title"];
        let title_array = title_regex.exec(temp_title).groups;
        let temp_author = entry_data["author"];
        let author = `${temp_author}@u2.dmhy.org (${temp_author})`;

        let pubdate_parsed = moment(entry_data["pubdate"]);

        dataset["title"] = title_array["main_title"];
        dataset["original_title"] = temp_title;
        dataset["category"] = entry_data["categories"][0];
        dataset["link"] = entry_data["link"];
        dataset["download_link"] = entry_data["enclosures"][0]["url"];
        dataset["author"] = author;
        dataset["size"] = title_array["torrent_size"];
        dataset["publishedAt"] = pubdate_parsed.tz("Asia/Jakarta").format("ddd, DD MMM YYYY HH:mm:ss Z");
        dataset["pubSort"] = pubdate_parsed.unix();
        u2_results.push(dataset);
    });
    u2_results = sortObjectsByKey(u2_results, "pubSort");
    return [u2_results, "Success"];
}
