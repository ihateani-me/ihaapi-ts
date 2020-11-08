import axios, { AxiosInstance } from 'axios';
import xml2js = require("xml2js");
import cheerio = require("cheerio");
import { getValueFromKey, hasKey, is_none, sortObjectsByKey } from './swissknife';

const CHROME_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.116 Safari/537.36";

function padZeros(num: number, size: number): string {
    var s = num.toString() + "";
    while (s.length < size) s = "0" + s;
    return s;
}

interface SauceFinderResult {
    title: string
    source: string
    confidence: number
    thumbnail: string
    extra_info?: object
    indexer?: string
}

export interface SauceNAOSettings {
    api_key?: string
    dbmask_enable?: string
    dbmask_disable?: string
    db_index?: number
    numres?: number
    minsim?: number
    testmode?: boolean
}

export class SauceNAO {
    api_key: string
    minsim: number
    numres: number
    db_index: number
    dbmask: string
    dbmaski: string
    test_mode: boolean

    constructor(settings?: SauceNAOSettings) {
        this.api_key = getValueFromKey(settings, "api_key");
        if (is_none(this.api_key)) {
            throw new Error("Please add an SAUCENAO_API_KEY to your .env to start using SauceNAO module.");
        } else if (this.api_key == "PLEASECHANGETHIS") {
            throw new Error("Please change the SAUCENAO_API_KEY in your .env to start using SauceNAO module.");
        }
        this.minsim = parseFloat(getValueFromKey(settings, "minsim", 57.5));
        this.numres = parseInt(getValueFromKey(settings, "minsim", 6));
        this.db_index = parseInt(getValueFromKey(settings, "db_index", 999));
        this.dbmask = getValueFromKey(settings, "dbmask_enable");
        this.dbmaski = getValueFromKey(settings, "dbmask_disable");
        this.test_mode = getValueFromKey(settings, "testmode", false);
        this.precheckSettings();
    }

    /**
     * This will precheck settings for number and boolean.
     */
    private precheckSettings() {
        if (isNaN(this.minsim)) {
            this.minsim = 57.5;
        }
        if (isNaN(this.numres)) {
            this.numres = 6;
        }
        if (isNaN(this.db_index)) {
            this.db_index = 999;
        }
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
    private formatBaseBooru(results_data, headers_data, key_id: string): [string, object, string] {
        var source = "";
        if (hasKey(results_data, "ext_urls")) {
            if (results_data["ext_urls"]) {
                source = results_data["ext_urls"][0];
            }
        }

        var title = "";
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
    private formatYandere(results_data, headers_data): [string, object, string, string] {
        let [t, ei, s] = this.formatBaseBooru(results_data, headers_data, "yandere_id");
        return [t, ei, s, "yande.re"]
    }

    /**
     * Formatter for Danbooru website
     * using `.formatBaseBooru` general function
     * @param results_data a dictionary of `data` from the SauceNAO API
     * @param headers_data a dictionary of `header` from the SauceNAO API
     */
    private formatDanbooru(results_data, headers_data): [string, object, string, string] {
        let [t, ei, s] = this.formatBaseBooru(results_data, headers_data, "danbooru_id");
        return [t, ei, s, "danbooru"]
    }

    /**
     * Formatter for Gelbooru website
     * using `.formatBaseBooru` general function
     * @param results_data a dictionary of `data` from the SauceNAO API
     * @param headers_data a dictionary of `header` from the SauceNAO API
     */
    private formatGelbooru(results_data, headers_data): [string, object, string, string] {
        let [t, ei, s] = this.formatBaseBooru(results_data, headers_data, "gelbooru_id");
        return [t, ei, s, "gelbooru"]
    }

    /**
     * Formatter for E621 website
     * using `.formatBaseBooru` general function
     * @param results_data a dictionary of `data` from the SauceNAO API
     * @param headers_data a dictionary of `header` from the SauceNAO API
     */
    private formatE621(results_data, headers_data): [string, object, string, string] {
        let [t, ei, s] = this.formatBaseBooru(results_data, headers_data, "e621_id");
        return [t, ei, s, "e621"]
    }

    /**
     * Formatter for Sankaku Complex website
     * using `.formatBaseBooru` general function
     * @param results_data a dictionary of `data` from the SauceNAO API
     * @param headers_data a dictionary of `header` from the SauceNAO API
     */
    private formatSankaku(results_data, headers_data): [string, object, string, string] {
        let [t, ei, s] = this.formatBaseBooru(results_data, headers_data, "sankaku_id");
        return [t, ei, s, "sankaku"]
    }

    /**
     * Formatter for Idol Complex website
     * using `.formatBaseBooru` general function
     * @param results_data a dictionary of `data` from the SauceNAO API
     * @param headers_data a dictionary of `header` from the SauceNAO API
     */
    private formatIdolcomplex(results_data, headers_data): [string, object, string, string] {
        let [t, ei, s] = this.formatBaseBooru(results_data, headers_data, "idol_id");
        return [t, ei, s, "idolcomplex"]
    }

    /**
     * Formatter for Konachan website
     * using `.formatBaseBooru` general function
     * @param results_data a dictionary of `data` from the SauceNAO API
     * @param headers_data a dictionary of `header` from the SauceNAO API
     */
    private formatKonachan(results_data, headers_data): [string, object, string, string] {
        let [t, ei, s] = this.formatBaseBooru(results_data, headers_data, "konachan_id");
        return [t, ei, s, "konachan"]
    }

    /**
     * Formatter for anime (using anidb)
     * Also a wrapper for hanime one too
     * @param results_data a dictionary of `data` from the SauceNAO API
     * @param headers_data a dictionary of `header` from the SauceNAO API
     */
    private formatAniDB(results_data, headers_data): [string, object, string, string] {
        var title = "";
        var extra_info = {};
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
        var source = "";
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
    private formatHAnime(results_data, headers_data): [string, object, string, string] {
        let [t, ei, s, _] = this.formatAniDB(results_data, headers_data);
        return [t, ei, s, "anidb-hanime"]
    }

    /**
     * Formatter for H-Misc (NHentai and other doujinshi general media :D)
     * @param results_data a dictionary of `data` from the SauceNAO API
     * @param headers_data a dictionary of `header` from the SauceNAO API
     */
    private formatHMisc(results_data, headers_data): [string, object, string, string] {
        var title = "";
        var source = "";
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
    private formatHMagz(results_data, headers_data): [string, object, string, string] {
        var title = "";
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
    private formatHGamesCG(results_data, headers_data): [string, object, string, string] {
        var title = "";
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
    private formatPixiv(results_data, headers_data): [string, object, string, string] {
        var title = "";
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
        var source = "";
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
    private formatPixivHistorical(results_data, headers_data): [string, object, string, string] {
        let [t, ei, s, _] = this.formatPixiv(results_data, headers_data);
        return [t, ei, s, "pixiv.historical"]
    }

    /**
     * Formatter for Shows and Movie (Western and non-weebs)
     * @param results_data a dictionary of `data` from the SauceNAO API
     * @param headers_data a dictionary of `header` from the SauceNAO API
     */
    private formatIMDB(results_data, headers_data): [string, object, string, string] {
        var title = "";
        var extra_info = {};
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
        var source = "";
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
    private formatSeiga(results_data, headers_data): [string, object, string, string] {
        var title = "";
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
        var source = "";
        if (hasKey(results_data, "ext_urls")) {
            if (results_data["ext_urls"]) {
                source = results_data["ext_urls"][0];
            }
        }
        return [title, {}, source, "niconico.seiga"]
    }

    /**
     * Formatter for Madokami (Mainly manga)
     * @param results_data a dictionary of `data` from the SauceNAO API
     * @param headers_data a dictionary of `header` from the SauceNAO API
     */
    private formatMadokami(results_data, headers_data): [string, object, string, string] {
        var title = "";
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
        var source = "";
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
    private formatDrawr(results_data, headers_data): [string, object, string, string] {
        var title = "";
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
        var source = "";
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
    private formatNijie(results_data, headers_data): [string, object, string, string] {
        var title = "";
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
        var source = "";
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
    private formatMangaDex(results_data, headers_data): [string, object, string, string] {
        var title = "";
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
        var source = "";
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
    private formatBcynet(results_data, headers_data): [string, object, string, string] {
        var title = "";
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
        var source = "";
        if (hasKey(results_data, "ext_urls")) {
            if (results_data["ext_urls"]) {
                source = results_data["ext_urls"][0];
            }
        }
        var extra = "unknown";
        if (hasKey(results_data, "bcy_type")) {
            extra = results_data["bcy_type"]
        }
        return [title, {}, source, `bcy.${extra}`];
    }

    /**
     * Formatter for deviantArt website
     * @param results_data a dictionary of `data` from the SauceNAO API
     * @param headers_data a dictionary of `header` from the SauceNAO API
     */
    private formatDeviantArt(results_data, headers_data): [string, object, string, string] {
        var title = "";
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
        var source = "";
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
    private formatPawoo(results_data, headers_data): [string, object, string, string] {
        var title = "";
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
        var source = "";
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
    private formatGeneric(results_data, headers_data): [string, object, string, string] {
        let title = headers_data["index_name"];
        var source = "";
        if (hasKey(results_data, "ext_urls")) {
            if (results_data["ext_urls"]) {
                source = results_data["ext_urls"][0];
            }
        }
        return [title, {}, source, "generic"]
    }

    private async buildResults(results: object): Promise<SauceFinderResult[]> {
        if (!hasKey(results, "results")) {
            return [];
        }
        let main_results: object[] = results["results"];
        console.info(`[SauceNAO] Raw Result: ${main_results.length}`);

        let parsed_data: SauceFinderResult[] = main_results.map((r) => {
            // @ts-ignore
            let data: SauceFinderResult = {};
            let header_d = r["header"];
            let confidence = parseFloat(header_d["similarity"]);
            if (confidence <= this.minsim) {
                return data;
            }
            let data_d = r["data"];
            switch (header_d["index_id"].toString()) {
                case "0":
                    var [title, extra_info, source, index_er] = this.formatHMagz(data_d, header_d);
                    break;
                case "2":
                    var [title, extra_info, source, index_er] = this.formatHGamesCG(data_d, header_d);
                    break;
                case "5":
                    var [title, extra_info, source, index_er] = this.formatPixiv(data_d, header_d);
                    break;
                case "6":
                    var [title, extra_info, source, index_er] = this.formatPixivHistorical(data_d, header_d);
                    break;
                case "8":
                    var [title, extra_info, source, index_er] = this.formatSeiga(data_d, header_d);
                    break;
                case "9":
                    var [title, extra_info, source, index_er] = this.formatDanbooru(data_d, header_d);
                    break;
                case "10":
                    var [title, extra_info, source, index_er] = this.formatDrawr(data_d, header_d);
                    break;
                case "11":
                    var [title, extra_info, source, index_er] = this.formatNijie(data_d, header_d);
                    break;
                case "12":
                    var [title, extra_info, source, index_er] = this.formatYandere(data_d, header_d);
                    break;
                case "14":
                    var [title, extra_info, source, index_er] = this.formatIMDB(data_d, header_d);
                    break;
                case "16":
                    // FAKKU
                    // FIXME: update with proper formatter
                    var [title, extra_info, source, index_er] = this.formatGeneric(data_d, header_d);
                    break;
                case "18":
                    var [title, extra_info, source, index_er] = this.formatHMisc(data_d, header_d);
                    break;
                case "19":
                    // 2d market
                    // FIXME: update with proper formatter
                    var [title, extra_info, source, index_er] = this.formatGeneric(data_d, header_d);
                    break;
                case "20":
                    // medibang
                    // FIXME: update with proper formatter
                    var [title, extra_info, source, index_er] = this.formatGeneric(data_d, header_d);
                    break;
                case "21":
                    var [title, extra_info, source, index_er] = this.formatAniDB(data_d, header_d);
                    break;
                case "22":
                    var [title, extra_info, source, index_er] = this.formatHAnime(data_d, header_d);
                    break;
                case "23":
                    var [title, extra_info, source, index_er] = this.formatIMDB(data_d, header_d);
                    break;
                case "24":
                    var [title, extra_info, source, index_er] = this.formatIMDB(data_d, header_d);
                    break;
                case "25":
                    var [title, extra_info, source, index_er] = this.formatGelbooru(data_d, header_d);
                    break;
                case "26":
                    var [title, extra_info, source, index_er] = this.formatKonachan(data_d, header_d);
                    break;
                case "27":
                    var [title, extra_info, source, index_er] = this.formatSankaku(data_d, header_d);
                    break;
                case "28":
                    // anime-pictures
                    // FIXME: update with proper formatter
                    var [title, extra_info, source, index_er] = this.formatGeneric(data_d, header_d);
                    break;
                case "29":
                    var [title, extra_info, source, index_er] = this.formatE621(data_d, header_d);
                    break;
                case "30":
                    var [title, extra_info, source, index_er] = this.formatIdolcomplex(data_d, header_d);
                    break;
                case "31":
                    var [title, extra_info, source, index_er] = this.formatBcynet(data_d, header_d);
                    break;
                case "32":
                    var [title, extra_info, source, index_er] = this.formatBcynet(data_d, header_d);
                    break;
                case "34":
                    var [title, extra_info, source, index_er] = this.formatDeviantArt(data_d, header_d);
                    break;
                case "35":
                    var [title, extra_info, source, index_er] = this.formatPawoo(data_d, header_d);
                    break;
                case "36":
                    var [title, extra_info, source, index_er] = this.formatMadokami(data_d, header_d);
                    break;
                case "37":
                    var [title, extra_info, source, index_er] = this.formatMangaDex(data_d, header_d);
                    break;
                default:
                    var [title, extra_info, source, index_er] = this.formatGeneric(data_d, header_d);
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
        console.info(`[SauceNAO] Finalized Result: ${finalized_parsed_data.length}`);
        return finalized_parsed_data;
    }

    async getSauce(data: any): Promise<SauceFinderResult[]> {
        console.info("[SauceNAO] Finding sauce...");
        var collected_params = [];
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
        var build_url = `https://saucenao.com/search.php?${collected_params.join("&")}`;
        if (typeof data === "string") {
            build_url += `&url=${encodeURIComponent(data)}`;
        } else {
            // passthrough files.
        }

        console.debug(`[SauceNAO] Searching with ${build_url} ...`);
        let session = axios.create({
            headers: {
                "User-Agent": "ihaAPI/0.9.6"
            },
            responseType: "json"
        });
        let response = await session.post(build_url);
        return (await this.buildResults(response.data));
    }
}
