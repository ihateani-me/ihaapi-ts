import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { basename } from 'path';
import xml2js = require("xml2js");
import moment = require('moment-timezone');
import { capitalizeIt, fallbackNaN, getValueFromKey, hasKey, is_none } from './swissknife';
import { logger as MainLogger } from "./logger";
import winston = require('winston');

const SDB_ALGOLIA = "https://94he6yatei-dsn.algolia.net/1/indexes/steamdb/";
const DEFAULT_AVATAR = "https://steamuserimages-a.akamaihd.net/ugc/868480752636433334/1D2881C5C9B3AD28A1D8852903A8F9E1FF45C2C8/";

class SteamVanityResolveError extends Error {
    problem: string;

    constructor(error: string, ...params: undefined[]) {
        super(...params);

        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, SteamVanityResolveError);
        }

        this.name = "SteamVanityResolveError";
        this.problem = error;
    }
}

interface SteamUserBanData {
    community: boolean
    economy: boolean | string
    gameban_total: number
    vac: {
        days_since_last_ban: number,
        total: number,
        vac: boolean
    }
}

interface SteamUserData {
    id: string
    name: string
    url: string
    avatar: string
    created: number
    last_seen: number
    vanity_id?: string
    state: number
    state_detail: string
    visibility: number
    visibility_detail: string
    current_game_data: object
    level: number
    total_friends: number
    total_games: number
    ban_data: SteamUserBanData
}


interface SteamGameCategory {
    id: number
    description: string
}


interface SteamGamePriceData {
    discount: boolean
    price: string
    original_price?: string
    discounted?: string
}

interface SteamGameData {
    id: number
    title: string
    platforms: {
        windows?: boolean
        mac?: boolean
        linux?: boolean
        osx?: boolean
    }
    developer: string[]
    publisher: string[]
    thumbnail: string
    is_free: boolean
    is_released: boolean
    category?: SteamGameCategory[]
    description: string
    type: string
    released: string | null
    genres: SteamGameCategory[]
    total_achivements?: number
    screenshots?: string[]
    price_data?: SteamGamePriceData
}

interface SteamGameSearch {
    id: number
    title: string
    price?: string
    is_free: boolean
    thumbnail: string
    platforms: {
        windows?: boolean
        mac?: boolean
        linux?: boolean
        osx?: boolean
    }
    controller_support: string
}

interface SteamDBSearchData {
    id: number | string
    title: string
    price?: string // In USD
    developer: string
    publisher: string
    released: string
    type: string
    user_score?: number
    platforms: {
        windows?: boolean
        mac?: boolean
        linux?: boolean
    }
    tags: string[]
    categories: string[]
}


class SteamUser {
    user_data: string | number;
    is_vanity: boolean;
    session: AxiosInstance;
    API_KEY: string | undefined;
    BASE_API: string;
    BASE_STEAM: string;
    logger: winston.Logger;

    constructor(user: string) {
        this.user_data = user;
        this.check_if_vanity(user);
        const session = axios.create({
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.116 Safari/537.36"
            }
        });
        this.session = session;
        this.API_KEY = process.env.STEAM_API_KEY;
        this.BASE_API = "https://api.steampowered.com/";
        this.BASE_STEAM = "https://steamcommunity.com/";

        this.logger = MainLogger.child({cls: "SteamUser"});
    }

    check_if_vanity(user: string | number) {
        // @ts-ignore
        var checked = parseInt(user);
        if (isNaN(checked)) {
            this.is_vanity = true;
        } else {
            this.is_vanity = false;
        }
    }

    private async request_api(method: string, endpoint: string, params?: any) {
        const logger = this.logger.child({fn: "request_api"});
        let req_config: AxiosRequestConfig = {
            "url": this.BASE_API + endpoint
        };
        switch (method.toLowerCase()) {
            case "get":
                req_config["method"] = 'get';
                break;
            case "post":
                req_config["method"] = 'post';
                break;
            case "put":
                req_config["method"] = 'put';
        }
        if (params) {
            req_config["params"] = params;
        }
        logger.info(`requesting to: '${endpoint}'`);
        return await this.session.request(req_config);
    }

    private async request_xml(endpoint: string) {
        return await this.session.get(this.BASE_STEAM + endpoint, {
            params: { "xml": 1 }
        });
    }

    async resolve_vanity() {
        const logger = this.logger.child({fn: "resolve_vanity"});
        logger.info("Resolving vanity: " + this.user_data);
        var response = await this.request_api("get", `ISteamUser/ResolveVanityURL/v1?key=${this.API_KEY}&vanityurl=${this.user_data}`);
        try {
            var resp = response.data["response"];
            if (!hasKey(resp, "success")) {
                logger.error("No success data.");
                throw new SteamVanityResolveError("Can't resolve Vanity URL.");
            }
            if (resp["success"] != 1) {
                logger.error("Failed to resolve vanity.");
                throw new SteamVanityResolveError("Can't resolve Vanity URL.");
            }
            this.user_data = resp["steamid"];
            
            this.check_if_vanity(this.user_data);
        } catch (err) {
            logger.error(err);
            throw new SteamVanityResolveError("Can't resolve Vanity URL.");
        };
    }

    async fetch_info() {
        const logger = this.logger.child({fn: "fetch_info"});
        if (this.is_vanity) {
            await this.resolve_vanity();
        };
        logger.info(`Fetching user: ${this.user_data}`);

        function _pick_avatar(steam_data) {
            var avatar = null;
            if (hasKey(steam_data, "avatarfull")) {
                if (!is_none(steam_data["avatarfull"])) {
                    avatar = steam_data["avatarfull"];
                }
            } else if (hasKey(steam_data, "avatarmedium")) {
                if (!is_none(steam_data["avatarmedium"])) {
                    avatar = steam_data["avatarmedium"];
                }
            } else if (hasKey(steam_data, "avatar")) {
                if (!is_none(steam_data["avatar"])) {
                    avatar = steam_data["avatar"];
                }
            }
            return avatar;
        }

        const state_map = {
            "0": "Offline",
            "1": "Online",
            "2": "Busy",
            "3": "Away",
            "4": "Snooze",
            "5": "Looking to trade",
            "6": "Looking to play",
        }
        const visibility_map = {
            "1": "Private",
            "2": "Friends Only",
            "3": "Friends of Friends",
            "4": "Users Only",
            "5": "Public",
        }

        logger.info("Processing jobs...");
        let raw_results_hell = await Promise.all(
            [
                this.request_api("get", `ISteamUser/GetPlayerSummaries/v2?key=${this.API_KEY}&steamids=${this.user_data}`),
                this.request_xml("profiles/" + this.user_data.toString() + "/games"),
                this.request_api("get", `IPlayerService/GetSteamLevel/v1?key=${this.API_KEY}&steamid=${this.user_data}`),
                this.request_api("get", `ISteamUser/GetFriendList/v1?key=${this.API_KEY}&steamid=${this.user_data}`),
                this.request_api("get", `ISteamUser/GetPlayerBans/v1?key=${this.API_KEY}&steamids=${this.user_data}`)
            ]
        )
        logger.info("Finished requesting, parsing results!");
        let raw_results = {};
        // @ts-ignore
        var user_data: SteamUserData = {};
        raw_results["summary"] = raw_results_hell[0].data;
        raw_results["games"] = raw_results_hell[1].data;
        raw_results["levels"] = raw_results_hell[2].data;
        raw_results["friends"] = raw_results_hell[3].data;
        raw_results["vacban"] = raw_results_hell[4].data;
        for (let [ident, result] of Object.entries(raw_results)) {
            logger.info(`Parsing "${ident}" data...`);;
            if (ident === "summary") {
                var summaries = result["response"]["players"][0];
                user_data["id"] = summaries["steamid"];
                user_data["name"] = summaries["personaname"];
                var avatar = _pick_avatar(summaries);
                if (is_none(avatar)) {
                    user_data["avatar"] = DEFAULT_AVATAR;
                } else {
                    user_data["avatar"] = avatar;
                }
                user_data["url"] = summaries["profileurl"];
                user_data["created"] = summaries["timecreated"];
                user_data["last_seen"] = summaries["lastlogoff"];

                var profile_data: string = summaries["profileurl"];
                if (profile_data.endsWith("/")) {
                    profile_data.slice(0, -1);
                }
                var extracted_vanity_id = null;
                if (profile_data.includes("/id/")) {
                    extracted_vanity_id = basename(profile_data);
                }
                if (!is_none(extracted_vanity_id)) {
                    user_data["vanity_id"] = extracted_vanity_id;
                }

                user_data["state"] = summaries["personastate"];
                try {
                    user_data["state_detail"] = getValueFromKey(
                        state_map, summaries["personastate"].toString(), "Unknown"
                    );
                } catch (e) {
                    user_data["state_detail"] = "Unknown";
                }
                user_data["visibility"] = summaries["communityvisibilitystate"];
                try {
                    user_data["visibility_detail"] = getValueFromKey(
                        visibility_map, summaries["communityvisibilitystate"].toString(), "Unknown"
                    );
                } catch (e) {
                    user_data["visibility_detail"] = "Unknown";
                }
                
                var current_game_data = {};
                if (hasKey(summaries, "gameextrainfo")) {
                    current_game_data["id"] = summaries["gameid"];
                    current_game_data["title"] = summaries["gameextrainfo"];
                }
                user_data["current_game_data"] = current_game_data;
            } else if (ident === "games") {
                xml2js.parseString(result, (err, xmlres) => {
                    var total_games = xmlres["gamesList"]["games"][0]["game"].length;
                    user_data["total_games"] = total_games;
                })
            } else if (ident === "levels") {
                user_data["level"] = result["response"]["player_level"];
            } else if (ident === "friends") {
                var friends_data = result["friendslist"]["friends"];
                user_data["total_friends"] = friends_data.length;
            } else if (ident == "vacban") {
                var ban_data = result["players"][0];
                // @ts-ignore
                var user_ban_data: SteamUserBanData = {"vac": {}};
                user_ban_data["vac"]["vac"] = ban_data["VACBanned"];
                user_ban_data["vac"]["total"] = ban_data["NumberOfVACBans"];
                user_ban_data["vac"]["days_since_last_ban"] = ban_data["DaysSinceLastBan"];
                user_ban_data["community"] = ban_data["CommunityBanned"];
                user_ban_data["gameban_total"] = ban_data["NumberOfGameBans"];
                user_ban_data["economy"] = ban_data["EconomyBan"];
                user_data["ban_data"] = user_ban_data;
            }
        }
        return user_data;
    }
}

export async function fetch_steam_game_info(app_id: string): Promise<[SteamGameData | object, string]> {
    const logger = MainLogger.child({fn: "fetch_steam_game_info"});
    const ENDPOINT = "https://store.steampowered.com/api/appdetails";
    let qparam = {"cc": "id", "l": "en", "appids": app_id};
    logger.info(`Querying ID: ${app_id}...`);
    let response = await axios.get(ENDPOINT, {
        params: qparam,
        headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.111 Safari/537.36"
        }
    });
    let json_data = response.data;
    logger.info(`Parsing: ${app_id}...`);
    let raw_steam_data = json_data[app_id];
    if (!raw_steam_data["success"]) {
        return [{}, "Failed fetching that appID from Steam."];
    }
    let steam_data = raw_steam_data["data"];
    // @ts-ignore
    let parsed_data: SteamGameData = {"price_data": {}};
    parsed_data["id"] = steam_data["steam_appid"]
    parsed_data["title"] = steam_data["name"]
    parsed_data["platforms"] = steam_data["platforms"]
    parsed_data["developer"] = steam_data["developers"]
    parsed_data["publisher"] = steam_data["publishers"]
    parsed_data["thumbnail"] = steam_data["header_image"]
    parsed_data["is_free"] = steam_data["is_free"]
    parsed_data["category"] = steam_data["categories"]
    if (hasKey(steam_data, "achievements")) {
        if (hasKey(steam_data["achievements"], "total")) {
            parsed_data["total_achivements"] = steam_data["achievements"]["total"];
        };
    };
    parsed_data["description"] = steam_data["short_description"]
    parsed_data["type"] = steam_data["type"]

    var release_date = null;
    if (hasKey(steam_data["release_date"], "date")) {
        release_date = steam_data["release_date"]["date"];
    }
    parsed_data["is_released"] = steam_data["release_date"]["coming_soon"];
    parsed_data["released"] = release_date

    let collect_screenshot = [];
    if (hasKey(steam_data, "screenshots")) {
        steam_data["screenshots"].forEach((screenies) => {
            collect_screenshot.push(screenies["path_full"]);
        });
    };
    parsed_data["screenshots"] = collect_screenshot

    if (hasKey(steam_data, "price_overview")) {
        let price_data = steam_data["price_overview"];
        // @ts-ignore
        let price_map: SteamGamePriceData = {};
        price_map["price"] = price_data["final_formatted"];
        price_map["discount"] = false;
        if (price_data["discount_percent"] != 0) {
            price_map["original_price"] = price_data["initial_formatted"];
            price_map["discounted"] = `-${price_data.discount_percent}%`;
            price_map["discount"] = true;
        };
        parsed_data["price_data"] = price_map;
    }

    return [parsed_data, "Success"]
}


export async function do_search_on_steam(query_search: string): Promise<SteamGameSearch[]> {
    const logger = MainLogger.child({fn: "do_search_on_steam"});
    const ENDPOINT = "https://store.steampowered.com/api/storesearch";
    let qparam = {"cc": "id", "l": "en", "term": encodeURIComponent(query_search)};
    logger.info(`Searching: ${query_search}...`);
    let response = await axios.get(ENDPOINT, {
        params: qparam,
        headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.111 Safari/537.36"
        }
    });
    let results = response.data;
    logger.info(`Collecting results: ${query_search}...`);
    if (!hasKey(results, "items")) {
        logger.warn("No result.");
        return [];
    };

    let final_results: SteamGameSearch[] = [];
    results["items"].forEach((res) => {
        // @ts-ignore
        let data: SteamGameSearch = {};
        data["id"] = res["id"];
        data["title"] = res["name"];
        if (hasKey(res, "price")) {
            let current_price: string = res["price"]["final"].toString();
            let main_price = parseInt(current_price.slice(0, current_price.length - 2)).toLocaleString("en-US", {
                minimumFractionDigits: 2
            });
            let additional = current_price.slice(current_price.length - 2);
            let parsed_price = main_price.slice(0, main_price.length - 3).replace(",", ".");
            data["price"] = `Rp ${parsed_price},${additional}`;
            data["is_free"] = false;
        } else {
            data["is_free"] = true;
        };
        data["thumbnail"] = res["tiny_image"];
        data["platforms"] = res["platforms"];
        if (hasKey(res, "controller_support")) {
            data["controller_support"] = capitalizeIt(res["controller_support"]);
        } else {
            data["controller_support"] = "None";
        }
        final_results.push(data);
    });
    return final_results;
}


export async function do_steamdb_search(query, add_dlc=false, add_app=false, add_music=false): Promise<[SteamDBSearchData[], string]> {
    const headers = {
        "Origin": "https://steamdb.info",
        "Referer": "https://steamdb.info/",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.116 Safari/537.36"
    }
    const logger = MainLogger.child({fn: "do_steamdb_search"});
    logger.info("Setting parameters...")
    let query_param = {
        "x-algolia-agent": "SteamDB Autocompletion",
        "x-algolia-application-id": "94HE6YATEI",
        "x-algolia-api-key": "4e93170f248c58869d226a339bd6a52c",
        "hitsPerPage": 20,
        "attributesToSnippet": "null",
        "attributesToHighlight": "name",
        "attributesToRetrieve": "name,objectID,tags,multiplayerCategories,vrCategories,oslist,categories,appType,userScore,developer,publisher,price_us,releaseDate,releaseYear",
        "query": query,
    }

    try {
        logger.info(`requesting: ${query}`);
        var response = await axios.get(SDB_ALGOLIA, {
            params: query_param,
            headers: headers
        })
    } catch (error) {
        logger.error(`Error occured: ${error}`);
        return [[], "Exception occured: " + error.toString()];
    }

    logger.info("Parsing info...");
    let results = response.data;
    if (!hasKey(results, "hits")) { return [[], "Failed to fetch results."] };
    if (results["hits"].length == 0) { return [[], "No results."] };

    var game_list = [];
    results["hits"].forEach((res) => {
        if (res["appType"] == "Game") {
            game_list.push(res);
        } else if (res["appType"] == "Games") {
            game_list.push(res);
        } else if (res["appType"] == "DLC" && add_dlc) {
            game_list.push(res);
        } else if (res["appType"] == "Music" && add_music) {
            game_list.push(res);
        } else if (res["appType"] == "Application" && add_app) {
            game_list.push(res);
        }
    });

    const type_map = {
        "Game": "game",
        "Application": "app",
        "Music": "music",
        "DLC": "dlc",
    }

    function setToUnknown(data) {
        if (is_none(data)) { return "Unknown" };
        return data;
    }

    let final_results: SteamDBSearchData[] = [];
    game_list.forEach((game_res) => {
        // @ts-ignore
        let data: SteamDBSearchData = {};
        let gtype = getValueFromKey(type_map, game_res["appType"], "unknown");
        data["id"] = fallbackNaN(parseInt, game_res["objectID"], game_res["objectID"]);
        data["title"] = game_res["name"];
        data["developer"] = setToUnknown(game_res["developer"]);
        data["publisher"] = setToUnknown(game_res["publisher"]);
        if (hasKey(game_res, "userScore")) {
            data["user_score"] = setToUnknown(game_res["userScore"]);
        };
        if (hasKey(game_res, "price_us")) {
            data["price"] = `$${game_res["price_us"]}`;
        };
        let rls_date = "Coming Soon";
        if (hasKey(game_res, "releaseDate")) {
            if (!is_none(game_res["releaseDate"])) {
                let rls_date_parsed = moment.unix(game_res["releaseDate"]).utc();
                rls_date = rls_date_parsed.format("DD MMM YYYY");
            };
        };
        data["released"] = rls_date;
        data["tags"] = game_res["tags"];
        var categories_sdb = [];
        categories_sdb.push(...game_res["categories"]);
        if (hasKey(game_res, "multiplayerCategories")) {
            categories_sdb.push(...game_res["multiplayerCategories"]);
        }
        if (hasKey(game_res, "vrCategories")) {
            categories_sdb.push(...game_res["vrCategories"]);
        }
        data["categories"] = categories_sdb;
        let platform_tick = {"windows": false, "mac": false, "linux": false};
        if (hasKey(game_res, "oslist")) {
            if (game_res["oslist"].includes("Windows")) {
                platform_tick["windows"] = true;
            }
            if (game_res["oslist"].includes("macOS")) {
                platform_tick["mac"] = true;
            }
            if (game_res["oslist"].includes("OSX")) {
                platform_tick["mac"] = true;
            }
            if (game_res["oslist"].includes("OS X")) {
                platform_tick["mac"] = true;
            }
            if (game_res["oslist"].includes("Linux")) {
                platform_tick["linux"] = true;
            }
        };
        data["platforms"] = platform_tick;
        data["type"] = gtype;
        final_results.push(data);
    });
    return [final_results, "Success."];
}


export async function fetch_steam_user_info(user_id_or_vanity: string): Promise<[SteamUserData | object, string]> {
    const logger = MainLogger.child({fn: "fetch_steam_user_info"});
    let steam_u = new SteamUser(user_id_or_vanity);
    try {
        var steam_res = await steam_u.fetch_info();
        return [steam_res, "Success"];
    } catch (err) {
        logger.error(err);
        if (err.name == "SteamVanityResolveError") {
            return [{}, err.problem];
        }
        return [{}, "Exception occured: " + err.toString()];
    }
}

export { SteamUser };