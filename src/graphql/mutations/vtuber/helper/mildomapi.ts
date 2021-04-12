import _ from "lodash";
import moment from "moment-timezone";
import axios, { AxiosInstance } from "axios";
import { Logger } from "winston";

import { logger as MainLogger } from "../../../../utils/logger";
import { is_none } from "../../../../utils/swissknife";
import { ChannelsProps, VideoProps } from "../../../../controller";

interface AnyDict {
    [key: string]: any;
}

const CHROME_UA =
    // eslint-disable-next-line max-len
    " Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.141 Safari/537.36";

export class MildomAPI {
    private session: AxiosInstance;
    private BASE_URL: string;
    private logger: Logger;

    constructor() {
        this.session = axios.create({
            headers: {
                "User-Agent": CHROME_UA,
            },
        });

        this.BASE_URL = "https://cloudac.mildom.com/nonolive/";
        this.logger = MainLogger.child({ cls: "MildomAPI" });
    }

    async fetchUser(userId: string) {
        const params = {
            user_id: userId,
            __location: "Japan|Tokyo",
            __country: "",
            __cluster: "aws_japan",
            __platform: "web",
            __la: "ja",
            sfr: "pc",
            accessToken: "",
        };
        const logger = this.logger.child({ fn: "fetchUser" });
        let results;
        try {
            const rawResults = await this.session.get(this.BASE_URL + "gappserv/user/profileV2", {
                params: params,
                responseType: "json",
            });
            results = rawResults.data;
        } catch (e) {
            if (e.response) {
                results = e.response.data;
            } else {
                logger.error(`Failed to fetch user ${userId}, ${e.toString()}`);
                console.error(e);
                results = { body: {}, code: -1, message: e.toString() };
            }
        }

        if (results["code"] !== 0) {
            logger.error(`An error occured when fetching user ${userId}`);
            logger.error(`Got error ${results["code"]}, ${results["message"]}`);
            return undefined;
        }

        // @ts-ignore
        const properResults: ChannelsProps = {};
        const bodyRes = _.get(results, "body", {});
        const userInfo = _.get(bodyRes, "user_info", {});
        if (is_none(userInfo)) {
            logger.error(`User ID ${userId} missing required data to process`);
            return undefined;
        }

        properResults["id"] = userInfo["my_id"];
        properResults["name"] = userInfo["loginname"];
        properResults["description"] = userInfo["intro"];
        properResults["followerCount"] = userInfo["fans"];
        properResults["level"] = userInfo["level"];
        properResults["thumbnail"] = userInfo["avatar"];
        properResults["platform"] = "mildom";
        return properResults;
    }

    async fetchVideos(userId: string) {
        let collectedVideos: AnyDict[] = [];
        let currentPage = 1;
        while (true) {
            try {
                const resp = await this.session.get(this.BASE_URL + "videocontent/profile/playbackList", {
                    params: {
                        __location: "Japan|Tokyo",
                        __country: "",
                        __cluster: "aws_japan",
                        __platform: "web",
                        __la: "ja",
                        sfr: "pc",
                        accessToken: "",
                        user_id: userId,
                        limit: "100",
                        page: currentPage.toString(),
                    },
                    responseType: "json",
                });
                const res = resp.data;
                if (res["code"] !== 0) {
                    break;
                }
                const currentVideo = res["body"];
                collectedVideos = _.concat(collectedVideos, currentVideo);
                if (currentVideo.length !== 100) {
                    // Break if reach max page
                    break;
                }
                currentPage++;
            } catch (e) {
                break;
            }
        }
        return collectedVideos;
    }

    async fetchLives(userId: string) {
        const params = {
            user_id: userId,
            __location: "Japan|Tokyo",
            __country: "",
            __cluster: "aws_japan",
            __platform: "web",
            __la: "ja",
            sfr: "pc",
            accessToken: "",
        };
        const logger = this.logger.child({ fn: "fetchLives" });
        let results;
        try {
            const rawResults = await this.session.get(this.BASE_URL + "gappserv/live/enterstudio", {
                params: params,
                responseType: "json",
            });
            results = rawResults.data;
        } catch (e) {
            if (e.response) {
                results = e.response.data;
            } else {
                logger.error(`Failed to fetch user ${userId}, ${e.toString()}`);
                console.error(e);
                results = { body: {}, code: -1, message: e.toString() };
            }
        }

        if (results["code"] !== 0) {
            logger.error(`An error occured when fetching user ${userId}`);
            logger.error(`Got error ${results["code"]}, ${results["message"]}`);
            return undefined;
        }

        // @ts-ignore
        const properResults: VideoProps = {};
        const liveInfo = _.get(results, "body", {});
        if (is_none(liveInfo)) {
            logger.error(`User ID ${userId} missing required data to process`);
            return undefined;
        }
        const is_live: number | undefined = _.get(liveInfo, "live_mode", undefined);
        if (typeof is_live === "undefined") {
            // Not live
            return undefined;
        }

        const liveStart = moment.tz(liveInfo["live_start_ms"], "UTC");

        properResults["id"] = liveInfo["log_id"];
        properResults["title"] = liveInfo["anchor_intro"];
        properResults["status"] = "live";
        properResults["timedata"] = {
            startTime: liveStart.unix(),
            // @ts-ignore
            endTime: null,
            // @ts-ignore
            duration: null,
            publishedAt: liveStart.format(),
        };
        properResults["viewers"] = liveInfo["viewers"];
        properResults["channel_id"] = userId;
        properResults["thumbnail"] = liveInfo["pic"];
        properResults["platform"] = "mildom";
        return properResults;
    }
}
