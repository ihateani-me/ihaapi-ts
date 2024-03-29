import * as cheerio from "cheerio";
import FormData from "form-data";
import xml2js from "xml2js";
import winston from "winston";
import axios, { AxiosInstance } from "axios";

import { logger as MainLogger } from "./logger";
import { fallbackNaN, getValueFromKey, hasKey, is_none, map_bool, sortObjectsByKey } from "./swissknife";

import packageJson from "../../package.json";

const CHROME_UA =
    // eslint-disable-next-line max-len
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.116 Safari/537.36";

function padZeros(num: number, size: number): string {
    let s = num.toString() + "";
    while (s.length < size) s = "0" + s;
    return s;
}

export interface SauceFinderResult {
    title: string;
    source: string;
    confidence: number;
    thumbnail: string;
    extra_info?: object;
    indexer?: string;
}

export interface SauceNAOSettings {
    api_key?: string;
    dbmask_enable?: string;
    dbmask_disable?: string;
    db_index?: number;
    numres?: number;
    minsim?: number;
    testmode?: boolean;
}

export class SauceNAO {
    api_key: string;
    minsim: number;
    numres: number;
    db_index: number;
    dbmask: string;
    dbmaski: string;
    test_mode: boolean;
    logger: winston.Logger;

    constructor(settings?: SauceNAOSettings) {
        this.api_key = getValueFromKey(settings, "api_key") as string;
        if (is_none(this.api_key)) {
            throw new Error("Please add an SAUCENAO_API_KEY to your .env to start using SauceNAO module.");
        } else if (this.api_key == "PLEASECHANGETHIS") {
            throw new Error(
                "Please change the SAUCENAO_API_KEY in your .env to start using SauceNAO module."
            );
        }
        this.minsim = getValueFromKey(settings, "minsim", 57.5) as number;
        this.numres = getValueFromKey(settings, "numres", 6) as number;
        this.db_index = getValueFromKey(settings, "db_index", 999) as number;
        this.dbmask = getValueFromKey(settings, "dbmask_enable") as string;
        this.dbmaski = getValueFromKey(settings, "dbmask_disable") as string;
        this.test_mode = getValueFromKey(settings, "testmode", false) as boolean;
        this.logger = MainLogger.child({ cls: "SauceNAO" });
        this.precheckSettings();
    }

    /**
     * This will precheck settings for number and boolean.
     */
    private precheckSettings() {
        this.minsim = fallbackNaN(parseFloat, this.minsim, 57.5);
        if (this.minsim <= 0 || this.minsim >= 100) {
            this.minsim = 57.5;
        }
        this.numres = fallbackNaN(parseInt, this.numres, 6);
        this.db_index = fallbackNaN(parseInt, this.db_index, 999);
        if (this.db_index < 0 || (this.db_index > 37 && this.db_index !== 999)) {
            this.db_index = 999;
        }
        if (typeof this.test_mode !== "boolean") {
            this.test_mode = false;
        }
    }

    /**
     * A generic booru type website formatter
     * SauceNAO return the same format for all the booru website,
     * so this was made as a general function/parser
     * @param results_data a dictionary of `data` from the SauceNAO API
     * @param headers_data a dictionary of `header` from the SauceNAO API
     * @param key_id the string ID or identifier for every booru website (suffixed with `_id`)
     */
    private formatBaseBooru(
        results_data: { [x: string]: any },
        headers_data: { [x: string]: any },
        key_id: string
    ): [string, object, string] {
        let source = "";
        if (hasKey(results_data, "ext_urls")) {
            if (results_data["ext_urls"]) {
                source = results_data["ext_urls"][0];
            }
        }

        let title = "";
        if (hasKey(results_data, "creator")) {
            title += `[${results_data["creator"]}] `;
        }
        if (hasKey(results_data, "material")) {
            title += `${results_data["creator"]} `;
        }
        if (hasKey(results_data, "characters")) {
            if (title[title.length - 1] != ",") {
                title = title.slice(0, title.length - 1) + ", ";
            }
            title += `${results_data["characters"]} `;
        }
        if (hasKey(results_data, key_id)) {
            title += `(${results_data[key_id]})`;
        }
        title = title.trimRight();

        if (!title) {
            title = headers_data["index_name"];
        }

        return [title, {}, source];
    }

    /**
     * Formatter for Yande.re website
     * using `.formatBaseBooru` general function
     * @param results_data a dictionary of `data` from the SauceNAO API
     * @param headers_data a dictionary of `header` from the SauceNAO API
     */
    private formatYandere(
        results_data: { [x: string]: any },
        headers_data: { [x: string]: any }
    ): [string, object, string, string] {
        const [t, ei, s] = this.formatBaseBooru(results_data, headers_data, "yandere_id");
        return [t, ei, s, "yande.re"];
    }

    /**
     * Formatter for Danbooru website
     * using `.formatBaseBooru` general function
     * @param results_data a dictionary of `data` from the SauceNAO API
     * @param headers_data a dictionary of `header` from the SauceNAO API
     */
    private formatDanbooru(
        results_data: { [x: string]: any },
        headers_data: { [x: string]: any }
    ): [string, object, string, string] {
        const [t, ei, s] = this.formatBaseBooru(results_data, headers_data, "danbooru_id");
        return [t, ei, s, "danbooru"];
    }

    /**
     * Formatter for Gelbooru website
     * using `.formatBaseBooru` general function
     * @param results_data a dictionary of `data` from the SauceNAO API
     * @param headers_data a dictionary of `header` from the SauceNAO API
     */
    private formatGelbooru(
        results_data: { [x: string]: any },
        headers_data: { [x: string]: any }
    ): [string, object, string, string] {
        const [t, ei, s] = this.formatBaseBooru(results_data, headers_data, "gelbooru_id");
        return [t, ei, s, "gelbooru"];
    }

    /**
     * Formatter for E621 website
     * using `.formatBaseBooru` general function
     * @param results_data a dictionary of `data` from the SauceNAO API
     * @param headers_data a dictionary of `header` from the SauceNAO API
     */
    private formatE621(
        results_data: { [x: string]: any },
        headers_data: { [x: string]: any }
    ): [string, object, string, string] {
        const [t, ei, s] = this.formatBaseBooru(results_data, headers_data, "e621_id");
        return [t, ei, s, "e621"];
    }

    /**
     * Formatter for Sankaku Complex website
     * using `.formatBaseBooru` general function
     * @param results_data a dictionary of `data` from the SauceNAO API
     * @param headers_data a dictionary of `header` from the SauceNAO API
     */
    private formatSankaku(
        results_data: { [x: string]: any },
        headers_data: { [x: string]: any }
    ): [string, object, string, string] {
        const [t, ei, s] = this.formatBaseBooru(results_data, headers_data, "sankaku_id");
        return [t, ei, s, "sankaku"];
    }

    /**
     * Formatter for Idol Complex website
     * using `.formatBaseBooru` general function
     * @param results_data a dictionary of `data` from the SauceNAO API
     * @param headers_data a dictionary of `header` from the SauceNAO API
     */
    private formatIdolcomplex(
        results_data: { [x: string]: any },
        headers_data: { [x: string]: any }
    ): [string, object, string, string] {
        const [t, ei, s] = this.formatBaseBooru(results_data, headers_data, "idol_id");
        return [t, ei, s, "idolcomplex"];
    }

    /**
     * Formatter for Konachan website
     * using `.formatBaseBooru` general function
     * @param results_data a dictionary of `data` from the SauceNAO API
     * @param headers_data a dictionary of `header` from the SauceNAO API
     */
    private formatKonachan(
        results_data: { [x: string]: any },
        headers_data: { [x: string]: any }
    ): [string, object, string, string] {
        const [t, ei, s] = this.formatBaseBooru(results_data, headers_data, "konachan_id");
        return [t, ei, s, "konachan"];
    }

    /**
     * Formatter for anime (using anidb)
     * Also a wrapper for hanime one too
     * @param results_data a dictionary of `data` from the SauceNAO API
     * @param headers_data a dictionary of `header` from the SauceNAO API
     */
    private formatAniDB(
        results_data: { [x: string]: any },
        headers_data: { [x: string]: any }
    ): [string, object, string, string] {
        let title = "";
        const extra_info: any = {};
        if (hasKey(results_data, "source")) {
            title += results_data["source"];
            if (hasKey(results_data, "part")) {
                title += `- Episode ${padZeros(results_data["part"], 2)}`;
            }
            if (hasKey(results_data, "anidb_aid")) {
                title += ` (anidb-${results_data["anidb_aid"]})`;
            }
        }
        if (hasKey(results_data, "est_time")) {
            extra_info["timestamp"] = results_data["est_time"];
        }
        title = title.trimRight();
        if (!title) {
            title = headers_data["index_name"];
        }
        let source = "";
        if (hasKey(results_data, "ext_urls")) {
            if (results_data["ext_urls"]) {
                source = results_data["ext_urls"][0];
            }
        }
        return [title, extra_info, source, "anidb"];
    }

    /**
     * Formatter for H-Anime
     * using `.formatAniDB` function since it's the same type
     * @param results_data a dictionary of `data` from the SauceNAO API
     * @param headers_data a dictionary of `header` from the SauceNAO API
     */
    private formatHAnime(results_data: any, headers_data: any): [string, object, string, string] {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const [t, ei, s, _] = this.formatAniDB(results_data, headers_data);
        return [t, ei, s, "anidb-hanime"];
    }

    /**
     * Formatter for H-Misc (NHentai and other doujinshi general media :D)
     * @param results_data a dictionary of `data` from the SauceNAO API
     * @param headers_data a dictionary of `header` from the SauceNAO API
     */
    private formatHMisc(
        results_data: { [x: string]: any },
        headers_data: { [x: string]: any }
    ): [string, object, string, string] {
        let title = "";
        let source = "";
        if (hasKey(results_data, "eng_name")) {
            title = results_data["eng_name"];
            source = `https://nhentai.net/search?q=${encodeURIComponent(title)}`;
        } else if (hasKey(results_data, "jp_name")) {
            title = results_data["jp_name"];
            source = `https://nhentai.net/search?q=${encodeURIComponent(title)}`;
        } else {
            title = headers_data["index_name"];
            source = "https://nhentai.net/";
        }
        return [title, {}, source, "nhentai"];
    }

    /**
     * Formatter for H-Magazine
     * @param results_data a dictionary of `data` from the SauceNAO API
     * @param headers_data a dictionary of `header` from the SauceNAO API
     */
    private formatHMagz(
        results_data: { [x: string]: any },
        headers_data: { [x: string]: any }
    ): [string, object, string, string] {
        let title = "";
        if (hasKey(results_data, "title")) {
            title += results_data["title"];
            if (hasKey(results_data, "part")) {
                title += ` ${results_data["part"]}`;
            }
            if (hasKey(results_data, "date")) {
                title += ` (${results_data["date"]})`;
            }
        }
        if (!title) {
            title = headers_data["index_name"];
        }
        return [title, {}, "", "h-magazine"];
    }

    /**
     * Formatter for H-CG Game
     * @param results_data a dictionary of `data` from the SauceNAO API
     * @param headers_data a dictionary of `header` from the SauceNAO API
     */
    private formatHGamesCG(
        results_data: { [x: string]: any },
        headers_data: { [x: string]: any }
    ): [string, object, string, string] {
        let title = "";
        if (hasKey(results_data, "company")) {
            title += `[${results_data["company"]}] `;
        }
        if (hasKey(results_data, "title")) {
            title += results_data["title"];
            if (hasKey(results_data, "getchu_id")) {
                title += ` (getchu-${results_data["getchu_id"]})`;
            }
        }
        if (!title) {
            title = headers_data["index_name"];
        }
        return [title, {}, "", "h-game.cg"];
    }

    /**
     * Formatter for pixiv website
     * @param results_data a dictionary of `data` from the SauceNAO API
     * @param headers_data a dictionary of `header` from the SauceNAO API
     */
    private formatPixiv(
        results_data: { [x: string]: any },
        headers_data: { [x: string]: any }
    ): [string, object, string, string] {
        let title = "";
        if (hasKey(results_data, "member_name")) {
            title += `[${results_data["member_name"]}] `;
        }
        if (hasKey(results_data, "title")) {
            title += results_data["title"] + " ";
        }
        if (hasKey(results_data, "pixiv_id")) {
            title += `(${results_data["pixiv_id"]})`;
        }
        title = title.trimRight();
        if (!title) {
            title = headers_data["index_name"];
        }
        let source = "";
        if (hasKey(results_data, "ext_urls")) {
            if (results_data["ext_urls"]) {
                source = results_data["ext_urls"][0];
            }
        }
        return [title, {}, source, "pixiv"];
    }

    /**
     * Formatter for pixiv except historical
     * Using `.formatPixiv` since it's the same type
     * @param results_data a dictionary of `data` from the SauceNAO API
     * @param headers_data a dictionary of `header` from the SauceNAO API
     */
    private formatPixivHistorical(results_data: any, headers_data: any): [string, object, string, string] {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const [t, ei, s, _] = this.formatPixiv(results_data, headers_data);
        return [t, ei, s, "pixiv.historical"];
    }

    /**
     * Formatter for Shows and Movie (Western and non-weebs)
     * @param results_data a dictionary of `data` from the SauceNAO API
     * @param headers_data a dictionary of `header` from the SauceNAO API
     */
    private formatIMDB(
        results_data: { [x: string]: any },
        headers_data: { [x: string]: any }
    ): [string, object, string, string] {
        let title = "";
        const extra_info: any = {};
        if (hasKey(results_data, "source")) {
            title += results_data["source"];
            if (hasKey(results_data, "part")) {
                title += `- Episode ${padZeros(results_data["part"], 2)}`;
            }
            if (hasKey(results_data, "imdb_id")) {
                title += ` (imdb-${results_data["imdb_id"]})`;
            }
        }
        if (hasKey(results_data, "est_time")) {
            extra_info["timestamp"] = results_data["est_time"];
        }
        title = title.trimRight();
        if (!title) {
            title = headers_data["index_name"];
        }
        let source = "";
        if (hasKey(results_data, "ext_urls")) {
            if (results_data["ext_urls"]) {
                source = results_data["ext_urls"][0];
            }
        }
        return [title, extra_info, source, "imdb"];
    }

    /**
     * Formatter for NicoNico Seiga (Comic/Fanart Website)
     * @param results_data a dictionary of `data` from the SauceNAO API
     * @param headers_data a dictionary of `header` from the SauceNAO API
     */
    private formatSeiga(
        results_data: { [x: string]: any },
        headers_data: { [x: string]: any }
    ): [string, object, string, string] {
        let title = "";
        if (hasKey(results_data, "member_name")) {
            title += `[${results_data["member_name"]}] `;
        }
        if (hasKey(results_data, "title")) {
            title += results_data["title"];
            if (hasKey(results_data, "pixiv_id")) {
                title += ` (im${results_data["pixiv_id"]})`;
            }
        } else {
            title = headers_data["index_name"];
        }
        title = title.trimRight();
        let source = "";
        if (hasKey(results_data, "ext_urls")) {
            if (results_data["ext_urls"]) {
                source = results_data["ext_urls"][0];
            }
        }
        return [title, {}, source, "niconico.seiga"];
    }

    /**
     * Formatter for Madokami (Mainly manga)
     * @param results_data a dictionary of `data` from the SauceNAO API
     * @param headers_data a dictionary of `header` from the SauceNAO API
     */
    private formatMadokami(
        results_data: { [x: string]: any },
        headers_data: { [x: string]: any }
    ): [string, object, string, string] {
        let title = "";
        if (hasKey(results_data, "source")) {
            title += results_data["source"];
            if (hasKey(results_data, "part")) {
                title += `- ${results_data["part"]}`;
            }
            if (hasKey(results_data, "mu_id")) {
                title += ` (mu-${results_data["mu_id"]})`;
            }
        } else {
            title = headers_data["index_name"];
        }
        title = title.trimRight();
        let source = "";
        if (hasKey(results_data, "ext_urls")) {
            if (results_data["ext_urls"]) {
                source = results_data["ext_urls"][0];
            }
        }
        return [title, {}, source, "imdb"];
    }

    /**
     * Formatter for drawr website
     * @param results_data a dictionary of `data` from the SauceNAO API
     * @param headers_data a dictionary of `header` from the SauceNAO API
     */
    private formatDrawr(
        results_data: { [x: string]: any },
        headers_data: { [x: string]: any }
    ): [string, object, string, string] {
        let title = "";
        if (hasKey(results_data, "member_name")) {
            title += `[${results_data["member_name"]}] `;
        }
        if (hasKey(results_data, "title")) {
            title += results_data["title"];
            if (hasKey(results_data, "drawr_id")) {
                title += ` (drawr-${results_data["drawr_id"]})`;
            }
        }
        if (!title) {
            title = headers_data["index_name"];
        }
        title = title.trimRight();
        let source = "";
        if (hasKey(results_data, "ext_urls")) {
            if (results_data["ext_urls"]) {
                source = results_data["ext_urls"][0];
            }
        }
        return [title, {}, source, "drawr"];
    }

    /**
     * Formatter for nijie website
     * @param results_data a dictionary of `data` from the SauceNAO API
     * @param headers_data a dictionary of `header` from the SauceNAO API
     */
    private formatNijie(
        results_data: { [x: string]: any },
        headers_data: { [x: string]: any }
    ): [string, object, string, string] {
        let title = "";
        if (hasKey(results_data, "member_name")) {
            title += `[${results_data["member_name"]}] `;
        }
        if (hasKey(results_data, "title")) {
            title += results_data["title"];
            if (hasKey(results_data, "nijie_id")) {
                title += ` (nijie-${results_data["nijie_id"]})`;
            }
        }
        if (!title) {
            title = headers_data["index_name"];
        }
        title = title.trimRight();
        let source = "";
        if (hasKey(results_data, "ext_urls")) {
            if (results_data["ext_urls"]) {
                source = results_data["ext_urls"][0];
            }
        }
        return [title, {}, source, "nijie"];
    }

    /**
     * Formatter for MangaDex.org website
     * @param results_data a dictionary of `data` from the SauceNAO API
     * @param headers_data a dictionary of `header` from the SauceNAO API
     */
    private formatMangaDex(
        results_data: { [x: string]: any },
        headers_data: { [x: string]: any }
    ): [string, object, string, string] {
        let title = "";
        if (hasKey(results_data, "artist")) {
            title += `[${results_data["artist"]}] `;
        } else if (hasKey(results_data, "author")) {
            title += `[${results_data["artist"]}] `;
        }
        if (hasKey(results_data, "source")) {
            title += results_data["source"];
            if (hasKey(results_data, "part")) {
                title += results_data["part"];
            }
            if (hasKey(results_data, "md_id")) {
                title += ` (md-${results_data["md_id"]})`;
            }
        }
        if (!title) {
            title = headers_data["index_name"];
        }
        title = title.trimRight();
        let source = "";
        if (hasKey(results_data, "ext_urls")) {
            if (results_data["ext_urls"]) {
                source = results_data["ext_urls"][0];
            }
        }
        return [title, {}, source, "mangadex"];
    }

    /**
     * Formatter for bcy.net website
     * Used for the cosplayer part and illustration part
     * @param results_data a dictionary of `data` from the SauceNAO API
     * @param headers_data a dictionary of `header` from the SauceNAO API
     */
    private formatBcynet(
        results_data: { [x: string]: any },
        headers_data: { [x: string]: any }
    ): [string, object, string, string] {
        let title = "";
        if (hasKey(results_data, "member_name")) {
            title += `[${results_data["member_name"]}] `;
        }
        if (hasKey(results_data, "title")) {
            title += results_data["title"];
            if (hasKey(results_data, "bcy_id")) {
                title += ` (bcy-${results_data["bcy_id"]})`;
            }
        }
        if (!title) {
            title = headers_data["index_name"];
        }
        title = title.trimRight();
        let source = "";
        if (hasKey(results_data, "ext_urls")) {
            if (results_data["ext_urls"]) {
                source = results_data["ext_urls"][0];
            }
        }
        let extra = "unknown";
        if (hasKey(results_data, "bcy_type")) {
            extra = results_data["bcy_type"];
        }
        return [title, {}, source, `bcy.${extra}`];
    }

    /**
     * Formatter for deviantArt website
     * @param results_data a dictionary of `data` from the SauceNAO API
     * @param headers_data a dictionary of `header` from the SauceNAO API
     */
    private formatDeviantArt(
        results_data: { [x: string]: any },
        headers_data: { [x: string]: any }
    ): [string, object, string, string] {
        let title = "";
        if (hasKey(results_data, "author_name")) {
            title += `[${results_data["author_name"]}] `;
        }
        if (hasKey(results_data, "title")) {
            title += results_data["title"];
            if (hasKey(results_data, "da_id")) {
                title += ` (${results_data["da_id"]})`;
            }
        }
        if (!title) {
            title = headers_data["index_name"];
        }
        title = title.trimRight();
        let source = "";
        if (hasKey(results_data, "ext_urls")) {
            if (results_data["ext_urls"]) {
                source = results_data["ext_urls"][0];
            }
        }
        return [title, {}, source, "deviantart"];
    }

    /**
     * Formatter for pawoo website
     * Used for the cosplayer part and illustration part
     * @param results_data a dictionary of `data` from the SauceNAO API
     * @param headers_data a dictionary of `header` from the SauceNAO API
     */
    private formatPawoo(
        results_data: { [x: string]: any },
        headers_data: { [x: string]: any }
    ): [string, object, string, string] {
        let title = "";
        if (hasKey(results_data, "pawoo_user_acct")) {
            title += `[${results_data["pawoo_user_acct"]}] `;
        } else if (hasKey(results_data, "pawoo_user_username")) {
            title += `[${results_data["pawoo_user_username"]}] `;
        }
        if (hasKey(results_data, "pawoo_id")) {
            title += `${results_data["pawoo_id"]}`;
        }
        if (!title) {
            title = headers_data["index_name"];
        }
        title = title.trimRight();
        let source = "";
        if (hasKey(results_data, "ext_urls")) {
            if (results_data["ext_urls"]) {
                source = results_data["ext_urls"][0];
            }
        }
        return [title, {}, source, "pawoo"];
    }

    /**
     * Formatter for other website that I don't know how to parse
     * A generic one using index_name from headers
     * @param results_data a dictionary of `data` from the SauceNAO API
     * @param headers_data a dictionary of `header` from the SauceNAO API
     */
    private formatGeneric(
        results_data: { [x: string]: any },
        headers_data: { [x: string]: any }
    ): [string, object, string, string] {
        const title = headers_data["index_name"];
        let source = "";
        if (hasKey(results_data, "ext_urls")) {
            if (results_data["ext_urls"]) {
                source = results_data["ext_urls"][0];
            }
        }
        return [title, {}, source, "generic"];
    }

    private async buildResults(results: any): Promise<SauceFinderResult[]> {
        if (!hasKey(results, "results")) {
            return [];
        }
        const logger = this.logger.child({ fn: "buildResults" });
        const main_results: any[] = results["results"];
        logger.info(`Raw Result: ${main_results.length}`);

        const parsed_data: SauceFinderResult[] = main_results.map((r: any) => {
            // @ts-ignore
            const data: SauceFinderResult = {};
            const header_d = r["header"];
            const confidence = parseFloat(header_d["similarity"]);
            if (confidence <= this.minsim) {
                return data;
            }
            const data_d = r["data"];
            let title, extra_info, source, index_er;
            switch (header_d["index_id"].toString()) {
                case "0":
                    [title, extra_info, source, index_er] = this.formatHMagz(data_d, header_d);
                    break;
                case "2":
                    [title, extra_info, source, index_er] = this.formatHGamesCG(data_d, header_d);
                    break;
                case "5":
                    [title, extra_info, source, index_er] = this.formatPixiv(data_d, header_d);
                    break;
                case "6":
                    [title, extra_info, source, index_er] = this.formatPixivHistorical(data_d, header_d);
                    break;
                case "8":
                    [title, extra_info, source, index_er] = this.formatSeiga(data_d, header_d);
                    break;
                case "9":
                    [title, extra_info, source, index_er] = this.formatDanbooru(data_d, header_d);
                    break;
                case "10":
                    [title, extra_info, source, index_er] = this.formatDrawr(data_d, header_d);
                    break;
                case "11":
                    [title, extra_info, source, index_er] = this.formatNijie(data_d, header_d);
                    break;
                case "12":
                    [title, extra_info, source, index_er] = this.formatYandere(data_d, header_d);
                    break;
                case "14":
                    [title, extra_info, source, index_er] = this.formatIMDB(data_d, header_d);
                    break;
                case "16":
                    // FAKKU
                    // FIXME: update with proper formatter
                    [title, extra_info, source, index_er] = this.formatGeneric(data_d, header_d);
                    break;
                case "18":
                    [title, extra_info, source, index_er] = this.formatHMisc(data_d, header_d);
                    break;
                case "19":
                    // 2d market
                    // FIXME: update with proper formatter
                    [title, extra_info, source, index_er] = this.formatGeneric(data_d, header_d);
                    break;
                case "20":
                    // medibang
                    // FIXME: update with proper formatter
                    [title, extra_info, source, index_er] = this.formatGeneric(data_d, header_d);
                    break;
                case "21":
                    [title, extra_info, source, index_er] = this.formatAniDB(data_d, header_d);
                    break;
                case "22":
                    [title, extra_info, source, index_er] = this.formatHAnime(data_d, header_d);
                    break;
                case "23":
                    [title, extra_info, source, index_er] = this.formatIMDB(data_d, header_d);
                    break;
                case "24":
                    [title, extra_info, source, index_er] = this.formatIMDB(data_d, header_d);
                    break;
                case "25":
                    [title, extra_info, source, index_er] = this.formatGelbooru(data_d, header_d);
                    break;
                case "26":
                    [title, extra_info, source, index_er] = this.formatKonachan(data_d, header_d);
                    break;
                case "27":
                    [title, extra_info, source, index_er] = this.formatSankaku(data_d, header_d);
                    break;
                case "28":
                    // anime-pictures
                    // FIXME: update with proper formatter
                    [title, extra_info, source, index_er] = this.formatGeneric(data_d, header_d);
                    break;
                case "29":
                    [title, extra_info, source, index_er] = this.formatE621(data_d, header_d);
                    break;
                case "30":
                    [title, extra_info, source, index_er] = this.formatIdolcomplex(data_d, header_d);
                    break;
                case "31":
                    [title, extra_info, source, index_er] = this.formatBcynet(data_d, header_d);
                    break;
                case "32":
                    [title, extra_info, source, index_er] = this.formatBcynet(data_d, header_d);
                    break;
                case "34":
                    [title, extra_info, source, index_er] = this.formatDeviantArt(data_d, header_d);
                    break;
                case "35":
                    [title, extra_info, source, index_er] = this.formatPawoo(data_d, header_d);
                    break;
                case "36":
                    [title, extra_info, source, index_er] = this.formatMadokami(data_d, header_d);
                    break;
                case "37":
                    [title, extra_info, source, index_er] = this.formatMangaDex(data_d, header_d);
                    break;
                default:
                    [title, extra_info, source, index_er] = this.formatGeneric(data_d, header_d);
                    break;
            }
            data["title"] = title;
            data["source"] = source;
            data["confidence"] = confidence;
            data["thumbnail"] = header_d["thumbnail"];
            data["extra_info"] = extra_info;
            data["indexer"] = index_er;
            return data;
        });

        let finalized_parsed_data: SauceFinderResult[] = [];
        parsed_data.forEach((data) => {
            // @ts-ignore
            if (Object.keys(data).length > 0) {
                finalized_parsed_data.push(data);
            }
        });
        finalized_parsed_data = sortObjectsByKey(finalized_parsed_data, "confidence");
        finalized_parsed_data = finalized_parsed_data.reverse();
        logger.info(`Finalized Result: ${finalized_parsed_data.length}`);
        return finalized_parsed_data;
    }

    async generateResults(results: object): Promise<SauceFinderResult[]> {
        return await this.buildResults(results);
    }

    async getSauce(data: any): Promise<SauceFinderResult[]> {
        const logger = this.logger.child({ fn: "getSauce" });
        logger.info("Finding sauce...");
        const collected_params = [];
        if (!is_none(this.dbmask)) {
            collected_params.push(`dbmask=${this.dbmask}`);
        } else {
            collected_params.push(`db=${this.db_index}`);
        }
        if (!is_none(this.dbmaski)) {
            collected_params.push(`dbmaski=${this.dbmaski}`);
        }
        if (this.test_mode) {
            collected_params.push("testmode=1");
        }
        collected_params.push("output_type=2");
        collected_params.push(`numres=${this.numres}`);
        collected_params.push(`minsim=${this.minsim}!`);
        collected_params.push(`api_key=${this.api_key}`);
        let build_url = `https://saucenao.com/search.php?${collected_params.join("&")}`;
        if (typeof data === "string") {
            build_url += `&url=${encodeURIComponent(data)}`;
        } else {
            // passthrough files.
        }

        logger.info(`Searching with ${build_url} ...`);
        const session = axios.create({
            headers: {
                "User-Agent": `ihaAPI/${packageJson["version"]}`,
            },
            responseType: "json",
        });
        const response = await session.post(build_url);
        return await this.buildResults(response.data);
    }
}

export class IQDB {
    minsim: number;
    logger: winston.Logger;

    constructor(minsim: number = 47.5) {
        this.minsim = fallbackNaN(parseFloat, minsim, 47.5);
        if (this.minsim <= 0 || this.minsim >= 100) {
            this.minsim = 47.5;
        }
        this.logger = MainLogger.child({ cls: "IQDB" });
    }

    private formatBaseBooru(child_data: { [x: string]: any }, root_path: string): [string, object, string] {
        let title = "";
        if (hasKey(child_data, "author")) {
            title += `[${child_data["author"]}] `;
        }
        if (hasKey(child_data, "tags")) {
            title += child_data["tags"];
            if (hasKey(child_data, "id")) {
                title += ` (${child_data["id"]})`;
            }
        }
        if (!title) {
            title = child_data["md5"];
        }
        title = title.trimRight();
        const source = `${root_path}${child_data["id"]}`;
        return [title, {}, source];
    }

    private formatDanbooru(child_data: any): [string, object, string, string] {
        const root_path = "https://danbooru.donmai.us/posts/";
        const [t, ei, s] = this.formatBaseBooru(child_data, root_path);
        return [t, ei, s, "danbooru"];
    }

    private formatYandere(child_data: any): [string, object, string, string] {
        const root_path = "https://yande.re/post/show/";
        const [t, ei, s] = this.formatBaseBooru(child_data, root_path);
        return [t, ei, s, "yande.re"];
    }

    private formatGelbooru(child_data: any): [string, object, string, string] {
        const root_path = "https://gelbooru.com/index.php?page=post&s=view&id=";
        const [t, ei, s] = this.formatBaseBooru(child_data, root_path);
        return [t, ei, s, "gelbooru"];
    }

    private formatZerochan(child_data: any): [string, object, string, string] {
        const root_path = "https://www.zerochan.net/";
        const [t, ei, s] = this.formatBaseBooru(child_data, root_path);
        return [t, ei, s, "zerochan"];
    }

    private formatKonachan(child_data: any): [string, object, string, string] {
        const root_path = "https://konachan.com/post/show/";
        const [t, ei, s] = this.formatBaseBooru(child_data, root_path);
        return [t, ei, s, "konachan"];
    }

    private formatAnimePictures(child_data: any): [string, object, string, string] {
        const root_path = "https://anime-pictures.net/pictures/view_post/";
        const [t, ei, s] = this.formatBaseBooru(child_data, root_path);
        return [t, ei, s, "anime-pictures.net"];
    }

    private formatSankaku(child_data: any): [string, object, string, string] {
        const root_path = "https://chan.sankakucomplex.com/post/show/";
        const [t, ei, s] = this.formatBaseBooru(child_data, root_path);
        return [t, ei, s, "sankaku"];
    }

    private formatEShuushuu(child_data: { [x: string]: any }): [string, object, string, string] {
        const root_path = "https://e-shuushuu.net/image/";
        let title = "";
        if (hasKey(child_data, "author")) {
            title += `[${child_data["author"]}] `;
        }
        if (hasKey(child_data, "theme_tags")) {
            title += child_data["theme_tags"];
            if (hasKey(child_data, "id")) {
                title += ` (${child_data["id"]})`;
            }
        }
        if (!title) {
            title = child_data["md5"];
        }
        title = title.trimRight();
        const source = `${root_path}${child_data["id"]}`;
        return [title, {}, source, "e-shuushuu.net"];
    }

    private formatGeneric(child_data: { [x: string]: any }): [string, object, string, string] {
        let title = "";
        if (hasKey(child_data, "tags")) {
            title += child_data["tags"];
            if (hasKey(child_data, "id")) {
                title += ` (${child_data["id"]})`;
            }
        } else if (hasKey(child_data, "id")) {
            title = child_data["id"];
        } else {
            title = child_data["md5"];
        }
        title = title.trimRight();
        let source = "";
        if (hasKey(child_data, "source")) {
            source = child_data["source"];
        } else if (hasKey(child_data, "file_url")) {
            source = child_data["file_url"];
        } else if (hasKey(child_data, "jpeg_url")) {
            source = child_data["file_url"];
        } else if (hasKey(child_data, "sample_url")) {
            source = child_data["sample_url"];
        } else if (hasKey(child_data, "preview_url")) {
            source = child_data["preview_url"];
        }
        return [title, {}, source, "generic"];
    }

    private async buildResults(xml_data: string): Promise<SauceFinderResult[]> {
        const logger = this.logger.child({ fn: "buildResults" });
        const root = await xml2js.parseStringPromise(xml_data);
        if (hasKey(root, "error")) {
            logger.error(`Request error: ${root["error"]["$"]["message"]}`);
            return [];
        }

        const matches: any[] = root.matches.match;
        logger.info(`Raw Result: ${matches.length}`);
        const parsed_data = matches.map((match) => {
            const match_data = match["$"];
            // @ts-ignore
            const data: SauceFinderResult = {};
            const confidence = parseFloat(match_data["sim"]);
            if (confidence <= this.minsim) {
                return data;
            }
            let title, extra_info, source, index_er;
            switch (match_data["service"]) {
                case "danbooru.donmai.us":
                    [title, extra_info, source, index_er] = this.formatDanbooru(match["post"][0]["$"]);
                    break;
                case "gelbooru.com":
                    [title, extra_info, source, index_er] = this.formatGelbooru(match["post"][0]["$"]);
                    break;
                case "konachan.com":
                    [title, extra_info, source, index_er] = this.formatKonachan(match["post"][0]["$"]);
                    break;
                case "zerochan.net":
                    [title, extra_info, source, index_er] = this.formatZerochan(match["post"][0]["$"]);
                    break;
                case "yande.re":
                    [title, extra_info, source, index_er] = this.formatYandere(match["post"][0]["$"]);
                    break;
                case "anime-pictures.net":
                    [title, extra_info, source, index_er] = this.formatAnimePictures(match["post"][0]["$"]);
                    break;
                case "e-shuushuu.net":
                    [title, extra_info, source, index_er] = this.formatEShuushuu(match["post"][0]["$"]);
                    break;
                case "chan.sankakucomplex.com":
                    [title, extra_info, source, index_er] = this.formatSankaku(match["post"][0]["$"]);
                    break;
                default:
                    [title, extra_info, source, index_er] = this.formatGeneric(match["post"][0]["$"]);
                    break;
            }
            data["title"] = title;
            data["source"] = source;
            data["confidence"] = confidence;
            data["thumbnail"] = "https:" + match_data["preview"];
            data["extra_info"] = extra_info;
            data["indexer"] = index_er;
            return data;
        });

        let finalized_parsed_data: SauceFinderResult[] = [];
        parsed_data.forEach((data) => {
            // @ts-ignore
            if (Object.keys(data).length > 0) {
                finalized_parsed_data.push(data);
            }
        });
        finalized_parsed_data = sortObjectsByKey(finalized_parsed_data, "confidence");
        finalized_parsed_data = finalized_parsed_data.reverse();
        logger.info(`Finalized Result: ${finalized_parsed_data.length}`);
        return finalized_parsed_data;
    }

    async generateResults(results: string): Promise<SauceFinderResult[]> {
        return await this.buildResults(results);
    }

    async getSauce(url: string): Promise<SauceFinderResult[]> {
        const logger = this.logger.child({ fn: "getSauce" });
        logger.info("Searching sauce...");
        const build_url = `https://iqdb.org/index.xml?url=${encodeURIComponent(url)}`;
        logger.info(`Searching with ${build_url} ...`);
        const session = axios.create({
            headers: {
                "User-Agent": `ihaAPI/${packageJson["version"]}`,
            },
            responseType: "text",
        });
        const response = await session.get(build_url);
        return await this.buildResults(response.data);
    }
}

export class ASCII2D {
    results_limit: number;
    base_url: string;
    _sessions: AxiosInstance;
    logger: winston.Logger;

    constructor(limit: number = 2) {
        this.base_url = "https://ascii2d.net/";
        this.results_limit = fallbackNaN(parseInt, limit, 2);
        if (this.results_limit < 1) {
            this.results_limit = 2;
        }
        this._sessions = axios.create({
            headers: {
                "User-Agent": CHROME_UA,
            },
        });
        this.logger = MainLogger.child({ cls: "ASCII2D" });
    }

    private async requestToken(): Promise<string> {
        const logger = this.logger.child({ fn: "requestToken" });
        logger.info("Requesting token...");
        const response = await this._sessions.get(this.base_url, {
            responseType: "text",
        });
        const $ = cheerio.load(response.data);
        const $csrf_token = $("meta[name=csrf-token]");
        return $csrf_token.attr("content") as string;
    }

    private formatPixiv(
        $html_data: cheerio.Cheerio<any>,
        $: cheerio.CheerioAPI
    ): [string, object, string, string, string] {
        const $image_box = $html_data.children(".image-box");
        const $info_box = $html_data.children(".info-box");
        const $info_links = $info_box.children(".detail-box");

        const img_hash = $info_box.children(".hash").text();
        let title = "";
        let source = "";
        let artwork_name = null;
        $info_links.find("a").each((_: any, elem: any) => {
            const $a_elem = $(elem);
            const href = $a_elem.attr("href") || "";
            if (href.includes("artwork")) {
                source = href;
                artwork_name = $a_elem.text().trim();
            } else if (href.includes("user")) {
                title += `[${$a_elem.text().trim()}] `;
            }
        });
        if (is_none(artwork_name)) {
            title += img_hash;
        } else {
            title += artwork_name;
        }

        let thumbnail = $image_box.find("img").attr("src") || "";
        if (thumbnail.startsWith("/")) {
            thumbnail = this.base_url.slice(0, -1) + thumbnail;
        } else {
            thumbnail = this.base_url + thumbnail;
        }
        return [title, {}, source, thumbnail, "pixiv"];
    }

    private formatTwitter(
        $html_data: cheerio.Cheerio<any>,
        $: cheerio.CheerioAPI
    ): [string, object, string, string, string] {
        const $image_box = $html_data.children(".image-box");
        const $info_box = $html_data.children(".info-box");
        const $info_links = $info_box.children(".detail-box");

        const img_hash = $info_box.children(".hash").text();
        let title = "";
        let source = "";
        let artwork_name = null;
        $info_links.find("a").each((_: any, elem: any) => {
            const $a_elem = $(elem);
            const href = $a_elem.attr("href") || "";
            if (href.includes("status")) {
                source = href;
                artwork_name = $a_elem.text().trim();
            } else if (href.includes("user")) {
                title += `[${$a_elem.text().trim()}] `;
            }
        });
        if (is_none(artwork_name)) {
            title += img_hash;
        } else {
            title += artwork_name;
        }

        let thumbnail = $image_box.find("img").attr("src") || "";
        if (thumbnail.startsWith("/")) {
            thumbnail = this.base_url.slice(0, -1) + thumbnail;
        } else {
            thumbnail = this.base_url + thumbnail;
        }
        return [title, {}, source, thumbnail, "twitter"];
    }

    private formatGeneric($html_data: cheerio.Cheerio<any>): [string, object, string, string, string] {
        const $image_box = $html_data.children(".image-box");
        const $info_box = $html_data.children(".info-box");

        const title = $info_box.children(".hash").text();

        let thumbnail = $image_box.find("img").attr("src") || "";
        if (thumbnail.startsWith("/")) {
            thumbnail = this.base_url.slice(0, -1) + thumbnail;
        } else {
            thumbnail = this.base_url + thumbnail;
        }
        return [title, {}, "", thumbnail, "generic"];
    }

    private async buildResults(html_res: string): Promise<SauceFinderResult[]> {
        const logger = this.logger.child({ fn: "buildResults" });
        const $ = cheerio.load(html_res);
        const $rows_data = $("div.container > div.row");
        const $all_results = $rows_data.children("div").children(".item-box");
        logger.info(`Raw Result: ${$all_results.length}`);

        const parsed_data: SauceFinderResult[] = $all_results
            .slice(1)
            .map((index, elem) => {
                if (index >= this.results_limit) {
                    return null;
                }
                // @ts-ignore
                const data_map: SauceFinderResult = {};
                const $html_data = $(elem);
                const $detail_box = $html_data.find(".detail-box.gray-link");
                const indexer = $detail_box.find("small").text().trim();
                let title, extra_info, source, index_er, thumbnail;
                switch (indexer) {
                    case "twitter":
                        [title, extra_info, source, thumbnail, index_er] = this.formatTwitter($html_data, $);
                        break;
                    case "pixiv":
                        [title, extra_info, source, thumbnail, index_er] = this.formatPixiv($html_data, $);
                        break;
                    default:
                        [title, extra_info, source, thumbnail, index_er] = this.formatGeneric($html_data);
                        break;
                }
                data_map["title"] = title;
                data_map["source"] = source;
                data_map["thumbnail"] = thumbnail;
                data_map["confidence"] = index;
                data_map["indexer"] = index_er;
                data_map["extra_info"] = extra_info;
                return data_map;
            })
            .get();

        let finalized_parsed_data: SauceFinderResult[] = [];
        parsed_data.forEach((data) => {
            if (!is_none(data)) {
                finalized_parsed_data.push(data);
            }
        });
        finalized_parsed_data = sortObjectsByKey(finalized_parsed_data, "confidence");
        logger.info(`Finalized Result: ${finalized_parsed_data.length}`);
        return finalized_parsed_data;
    }

    async generateResults(results: string): Promise<SauceFinderResult[]> {
        return await this.buildResults(results);
    }

    async getSauce(url: string): Promise<SauceFinderResult[]> {
        const logger = this.logger.child({ fn: "getSauce" });
        const token = await this.requestToken();
        logger.info("Searching sauce...");
        const forms_data = new FormData();
        forms_data.append("utf-8", "✓");
        forms_data.append("uri", url);
        forms_data.append("authenticity_token", token);
        logger.info("Requesting sauce...");
        const response = await this._sessions.post(this.base_url + "search/uri", forms_data, {
            headers: {
                "User-Agent": CHROME_UA,
                "Content-Type": `multipart/form-data; boundary=${forms_data.getBoundary()}`,
            },
            responseType: "text",
        });
        return await this.buildResults(response.data);
    }
}

function fallbackBool(boolean_data: any, fallback?: boolean): boolean {
    if (typeof boolean_data === "boolean") {
        return boolean_data;
    } else {
        return is_none(fallback) ? map_bool(boolean_data) : fallback;
    }
}

export interface MultiFinderSettings {
    enableSauceNAO?: boolean;
    enableIQDB?: boolean;
    enableAscii2D?: boolean;
    sauceNAOSetting?: SauceNAOSettings;
    iqdbMinsim?: number;
    ascii2DLimit?: number;
}

export async function multiSauceFinder(
    url: string,
    settings: MultiFinderSettings
): Promise<[SauceFinderResult[], string][]> {
    const logger = MainLogger.child({ fn: "multiSauceFinder" });
    let enableSauceNAO = fallbackBool(getValueFromKey(settings, "enableSauceNAO", true), true);
    const enableIQDB = fallbackBool(getValueFromKey(settings, "enableIQDB", true), true);
    const enableAscii2D = fallbackBool(getValueFromKey(settings, "enableAscii2D", true), true);
    const iqdbMinsim = fallbackNaN(parseFloat, getValueFromKey(settings, "iqdbMinsim", 47.5), 47.5) as number;
    const ascii2DLimit = fallbackNaN(parseInt, getValueFromKey(settings, "ascii2DLimit", 2), 2) as number;
    const sauceNAOSetting = getValueFromKey(settings, "sauceNAOSetting", {});

    const sauceNAO_API_Key = getValueFromKey(sauceNAOSetting, "api_key");
    const sauceNAO_minsim = fallbackNaN(
        parseFloat,
        getValueFromKey(sauceNAOSetting, "minsim", 57.5),
        57.5
    ) as number;

    if (!enableSauceNAO && !enableIQDB && !enableAscii2D) {
        logger.warn("No sauce finder picked, ignoring...");
        return [];
    }
    if (enableSauceNAO && is_none(sauceNAO_API_Key)) {
        logger.warn("Ignoring SauceNAO, since no key is provided.");
        enableSauceNAO = false;
    }

    async function safeSaucerFetcher(
        cb: Function,
        identifier: string
    ): Promise<[SauceFinderResult[], string]> {
        try {
            const res = await cb();
            return [res, identifier];
        } catch (e) {
            logger.error(e);
            return [[], identifier];
        }
    }

    const saucerPromises = [];
    logger.info(`Searching sauce: ${url} ...`);
    if (enableSauceNAO) {
        const saucerSN = new SauceNAO({ api_key: sauceNAO_API_Key, minsim: sauceNAO_minsim });
        const promiseSaucer = safeSaucerFetcher(saucerSN.getSauce.bind(saucerSN, url), "saucenao");
        saucerPromises.push(promiseSaucer);
    }
    if (enableIQDB) {
        const saucerIQDB = new IQDB(iqdbMinsim);
        const promiseSaucer = safeSaucerFetcher(saucerIQDB.getSauce.bind(saucerIQDB, url), "iqdb");
        saucerPromises.push(promiseSaucer);
    }
    if (enableAscii2D) {
        const saucerA2D = new ASCII2D(ascii2DLimit);
        const promiseSaucer = safeSaucerFetcher(saucerA2D.getSauce.bind(saucerA2D, url), "ascii2d");
        saucerPromises.push(promiseSaucer);
    }

    const multi_results = await Promise.all(saucerPromises);
    return multi_results;
}
