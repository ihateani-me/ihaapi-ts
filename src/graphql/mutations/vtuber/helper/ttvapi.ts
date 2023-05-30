import axios, { AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from "axios";
import { DateTime } from "luxon";
import _ from "lodash";
import { Logger } from "winston";

import { logger as MainLogger } from "../../../../utils/logger";
import { is_none, resolveDelayCrawlerPromises } from "../../../../utils/swissknife";

import packageJson from "../../../../../package.json";

interface AnyDict {
    [key: string]: any;
}

export class TwitchHelix {
    private cid: string;
    private csc: string;

    private nextReset: number;
    private remainingBucket: number;

    private session: AxiosInstance;
    private authorized: boolean;
    private bearer_token?: string;
    private expires: number;
    private logger: Logger;

    BASE_URL: string;
    OAUTH_URL: string;

    constructor(client_id: string, client_secret: string) {
        this.bearer_token = undefined;
        this.expires = 0;
        this.cid = client_id;
        this.csc = client_secret;
        this.session = axios.create({
            headers: {
                "User-Agent": `ihaapi-ts/${packageJson["version"]} (https://github.com/ihateani-me/ihaapi-ts)`,
            },
        });
        this.authorized = false;

        this.BASE_URL = "https://api.twitch.tv/helix/";
        this.OAUTH_URL = "https://id.twitch.tv/oauth2/";

        this.nextReset = -1;
        this.remainingBucket = -1;

        this.session.interceptors.response.use(this.handleRateLimitResponse.bind(this), (error) => {
            return Promise.reject(error);
        });
        this.session.interceptors.request.use(this.handleRateLimitRequest.bind(this), (error) => {
            return Promise.reject(error);
        });
        this.logger = MainLogger.child({ cls: "TwitchHelix" });
    }

    private delayBy(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    private current() {
        return DateTime.utc().toSeconds();
    }

    private async handleRateLimitRequest(
        config: InternalAxiosRequestConfig<any>
    ): Promise<InternalAxiosRequestConfig<any>> {
        const logger = this.logger.child({ fn: "handleRateLimit" });
        if (this.remainingBucket < 1 && this.remainingBucket !== -1) {
            const currentTime = this.current();
            if (this.nextReset > currentTime) {
                logger.info(`currently rate limited, delaying by ${this.nextReset - currentTime} seconds`);
                await this.delayBy((this.nextReset - currentTime) * 1000);
            }
        }
        return config;
    }

    private handleRateLimitResponse(
        response: AxiosResponse<any>
    ): AxiosResponse<any> | Promise<AxiosResponse<any>> {
        this.nextReset = parseInt(_.get(response.headers, "ratelimit-reset", this.nextReset));
        this.remainingBucket = parseInt(_.get(response.headers, "ratelimit-remaining", this.remainingBucket));
        return response;
    }

    private async getReq(url: string, params: AnyDict, headers?: AnyDict) {
        let param_url = "";
        if (typeof params === "object" && Array.isArray(params)) {
            param_url = params.join("&");
        } else if (typeof params === "object") {
            const s_ = [];
            for (const [key, val] of Object.entries(params)) {
                s_.push(`${key}=${val}`);
            }
            param_url = s_.join("&");
        } else if (typeof params === "string") {
            param_url = params;
        }
        if (is_none(headers)) {
            const resp = await this.session.get(`${url}?${param_url}`);
            return resp.data;
        } else {
            const resp = await this.session.get(`${url}?${param_url}`, {
                headers: headers,
            });
            return resp.data;
        }
    }

    private async postReq(url: string, params: AnyDict, headers?: AnyDict) {
        if (is_none(headers)) {
            const resp = await this.session.post(url, null, {
                params: params,
            });
            return resp.data;
        } else {
            const resp = await this.session.post(url, null, {
                params: params,
                headers: headers,
            });
            return resp.data;
        }
    }

    async expireToken() {
        const logger = this.logger.child({ fn: "expireToken" });
        const params = { client_id: this.cid, token: this.bearer_token };
        if (this.authorized) {
            logger.info("de-authorizing...");
            await this.postReq(this.OAUTH_URL + "revoke", params);
            logger.info("de-authorized.");
            this.expires = 0;
            this.bearer_token = undefined;
            this.authorized = false;
        }
    }

    async authorizeClient() {
        const logger = this.logger.child({ fn: "authorizeClient" });
        const params = { client_id: this.cid, client_secret: this.csc, grant_type: "client_credentials" };
        logger.info("authorizing...");
        const res = await this.postReq(this.OAUTH_URL + "token", params);
        this.expires = this.current() + res["expires_in"];
        this.bearer_token = res["access_token"];
        logger.info("authorized.");
        this.authorized = true;
    }

    async fetchLivesData(usernames: string[]) {
        const logger = this.logger.child({ fn: "fetchLivesData" });
        if (!this.authorized) {
            logger.warn("You're not authorized yet, requesting new bearer token...");
            await this.authorizeClient();
        }
        if (this.current() >= this.expires) {
            logger.warn("Token expired, rerequesting...");
            await this.authorizeClient();
        }

        const chunkedUsernames = _.chunk(usernames, 90);
        const headers = {
            Authorization: `Bearer ${this.bearer_token}`,
            "Client-ID": this.cid,
        };

        const chunkedPromises: Promise<any[]>[] = chunkedUsernames.map((username_sets, idx) =>
            this.getReq(
                this.BASE_URL + "streams",
                _.concat(
                    ["first=100"],
                    _.map(username_sets, (o) => `user_login=${o}`)
                ),
                headers
            )
                .then((results: any) => {
                    return results["data"];
                })
                .catch((error: any) => {
                    logger.error(`Failed to fetch chunk ${idx}, ${error.toString()}`);
                    return [];
                })
        );
        const chunkedPromisesDelayed = resolveDelayCrawlerPromises(chunkedPromises, 500);
        const returnedPromises = await Promise.all(chunkedPromisesDelayed);
        return _.flattenDeep(returnedPromises);
    }

    async fetchChannels(usernames: string[]) {
        const logger = this.logger.child({ fn: "fetchChannels" });
        if (!this.authorized) {
            logger.warn("You're not authorized yet, requesting new bearer token...");
            await this.authorizeClient();
        }
        if (this.current() >= this.expires) {
            logger.warn("Token expired, rerequesting...");
            await this.authorizeClient();
        }

        const headers = {
            Authorization: `Bearer ${this.bearer_token}`,
            "Client-ID": this.cid,
        };
        const chunkedUsernames = _.chunk(usernames, 90);
        const chunkedPromises: Promise<any[]>[] = chunkedUsernames.map((username_sets, idx) =>
            this.getReq(
                this.BASE_URL + "users",
                _.map(username_sets, (o) => `login=${o}`),
                headers
            )
                .then((results: any) => {
                    return results["data"];
                })
                .catch((error: any) => {
                    logger.error(`Failed to fetch chunk ${idx}, ${error.toString()}`);
                    return [];
                })
        );
        const chunkedPromisesDelayed = resolveDelayCrawlerPromises(chunkedPromises, 500);
        const returnedPromises = await Promise.all(chunkedPromisesDelayed);
        return _.flattenDeep(returnedPromises);
    }

    async fetchChannelFollowers(user_id: string) {
        const logger = this.logger.child({ fn: "fetchChannelFollowers" });
        if (!this.authorized) {
            logger.warn("You're not authorized yet, requesting new bearer token...");
            await this.authorizeClient();
        }
        if (this.current() >= this.expires) {
            logger.warn("Token expired, rerequesting...");
            await this.authorizeClient();
        }

        const headers = {
            Authorization: `Bearer ${this.bearer_token}`,
            "Client-ID": this.cid,
        };
        const params: string[] = [`to_id=${user_id}`];
        const res = await this.getReq(this.BASE_URL + "users/follows", params, headers);
        return res;
    }

    async fetchChannelVideos(user_id: string) {
        const logger = this.logger.child({ fn: "fetchChannelVideos" });
        if (!this.authorized) {
            logger.warn("You're not authorized yet, requesting new bearer token...");
            await this.authorizeClient();
        }
        if (this.current() >= this.expires) {
            logger.warn("Token expired, rerequesting...");
            await this.authorizeClient();
        }

        const headers = {
            Authorization: `Bearer ${this.bearer_token}`,
            "Client-Id": this.cid,
        };
        const params_base: string[] = [`user_id=${user_id}`];
        let main_results = [];
        const res = await this.getReq(this.BASE_URL + "videos", [params_base[0], "first=50"], headers);
        main_results.push(res["data"]);
        if (Object.keys(res["pagination"]).length < 1) {
            return main_results;
        }
        if (_.has(res["pagination"], "cursor")) {
            if (is_none(res["pagination"]["cursor"]) || !res["pagination"]["cursor"]) {
                return main_results;
            }
        }
        let next_page = res["pagination"]["cursor"];
        if (is_none(next_page) || !next_page) {
            return main_results;
        }
        let doExit = false;
        while (!doExit) {
            const next_res = await this.getReq(
                this.BASE_URL + "videos",
                [params_base[0], `after=${next_page}`],
                headers
            );
            main_results.push(next_res["data"]);
            if (Object.keys(res["pagination"]).length < 1) {
                break;
            }
            if (_.has(res["pagination"], "cursor")) {
                if (is_none(res["pagination"]["cursor"]) || !res["pagination"]["cursor"]) {
                    doExit = true;
                    break;
                }
            }
            if (doExit) {
                break;
            }
            next_page = next_res["pagination"]["cursor"];
            if (is_none(next_page) || !next_page) {
                break;
            }
        }
        main_results = _.flattenDeep(main_results);
        return main_results;
    }
}
