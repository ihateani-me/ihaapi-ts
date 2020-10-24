import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { basename } from 'path';
import xml2js = require("xml2js");
import { getValueFromKey, hasKey, is_none } from './swissknife';

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

class SteamUser {
    user_data: string | number;
    is_vanity: boolean;
    session: AxiosInstance;
    API_KEY: string | undefined;
    BASE_API: string;
    BASE_STEAM: string;

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
        console.log(`[steam:request_api]: requesting to: '${endpoint}'`);
        return await this.session.request(req_config);
    }

    private async request_xml(endpoint: string) {
        return await this.session.get(this.BASE_STEAM + endpoint, {
            params: { "xml": 1 }
        });
    }

    async resolve_vanity() {
        console.log("[Steam:user] Resolving vanity: " + this.user_data);
        var response = await this.request_api("get", `ISteamUser/ResolveVanityURL/v1?key=${this.API_KEY}&vanityurl=${this.user_data}`);
        try {
            var resp = response.data["response"];
            if (!hasKey(resp, "success")) {
                console.error("[Steam:user:vanity] No success data.");
                throw new SteamVanityResolveError("Can't resolve Vanity URL.");
            }
            if (resp["success"] != 1) {
                console.error("[Steam:user:vanity] Failed to resolve vanity.");
                throw new SteamVanityResolveError("Can't resolve Vanity URL.");
            }
            this.user_data = resp["steamid"];
            
            this.check_if_vanity(this.user_data);
        } catch (err) {
            console.error(err);
            throw new SteamVanityResolveError("Can't resolve Vanity URL.");
        };
    }

    async fetch_info() {
        if (this.is_vanity) {
            await this.resolve_vanity();
        };
        console.info(`[Steam:user] Fetching user: ${this.user_data}`);

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

        console.info("[Steam:user] Processing jobs...");
        let raw_results_hell = await Promise.all(
            [
                this.request_api("get", `ISteamUser/GetPlayerSummaries/v2?key=${this.API_KEY}&steamids=${this.user_data}`),
                this.request_xml("profiles/" + this.user_data.toString() + "/games"),
                this.request_api("get", `IPlayerService/GetSteamLevel/v1?key=${this.API_KEY}&steamid=${this.user_data}`),
                this.request_api("get", `ISteamUser/GetFriendList/v1?key=${this.API_KEY}&steamid=${this.user_data}`),
                this.request_api("get", `ISteamUser/GetPlayerBans/v1?key=${this.API_KEY}&steamids=${this.user_data}`)
            ]
        )
        console.log("[Steam:user] Finished requesting!");
        let raw_results = {};
        // @ts-ignore
        var user_data: SteamUserData = {};
        raw_results["summary"] = raw_results_hell[0].data;
        raw_results["games"] = raw_results_hell[1].data;
        raw_results["levels"] = raw_results_hell[2].data;
        raw_results["friends"] = raw_results_hell[3].data;
        raw_results["vacban"] = raw_results_hell[4].data;
        for (let [ident, result] of Object.entries(raw_results)) {
            console.info("[Steam:user:" + ident + "] Parsing...");
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


export async function fetch_steam_user_info(user_id_or_vanity: string): Promise<[SteamUserData | object, string]> {
    let steam_u = new SteamUser(user_id_or_vanity);
    try {
        var steam_res = await steam_u.fetch_info();
        return [steam_res, "Success"];
    } catch (err) {
        console.log(err);
        if (err.name == "SteamVanityResolveError") {
            return [{}, err.problem];
        }
        return [{}, "Exception occured: " + err.toString()];
    }
}

export { SteamUser };