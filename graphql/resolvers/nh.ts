import _ from "lodash";
import 'apollo-cache-control';
import moment from "moment-timezone";
import { ApolloError, IResolvers } from "apollo-server-express";

import {
    DateTimeScalar,
    nhImage,
    nhInfoResult,
    nhPageInfo,
    nhSearchResult,
    nhTitle,
    nhTag,
    nhTags,
    nhInfoParams,
    nhSearchParams,
} from "../schemas"

import {
    nhFetchInfo,
    nhSearchDoujin,
    nhLatestDoujin,
    nhInfoData
} from "../../utils/nh";
import { fallbackNaN, getValueFromKey, is_none } from "../../utils/swissknife";

function maybeStr(input: any): string {
    if (typeof input === "number") {
        return input.toString();
    } else if (typeof input === "string") {
        return input;
    }
}

async function reparseInformationData(result: nhInfoData): Promise<nhInfoResult> {
    // @ts-ignore
    let mapped_data: nhInfoResult = {};
    mapped_data["id"] = result["id"];
    mapped_data["media_id"] = result["media_id"];
    let title_map: nhTitle = {
        simple: result["title"],
        english: result["original_title"]["other"],
        japanese: result["original_title"]["japanase"]
    }
    mapped_data["title"] = title_map;
    let cover_art: nhImage = {
        type: "thumbnail",
        url: result["cover"],
        original_url: result["cover"].replace("https://api.ihateani.me/v1/nh/t/", "https://t.nhentai.net/galleries/"),
    }
    if (cover_art["url"] === cover_art["original_url"]) {
        // handle old dangling cache
        cover_art["original_url"].replace(
            "https://api.ihateani.me/nh/t/", "https://t.nhentai.net/galleries/"
        )
    }
    if (is_none(mapped_data["media_id"])) {
        // handle old dangling cache
        let split_thumb_url = cover_art["url"].split("/");
        mapped_data["media_id"] = _.nth(split_thumb_url, -2);
    }
    mapped_data["cover_art"] = cover_art;
    let new_mapped_tags: nhTags = {};
    for (let [tag_name, tag_data] of Object.entries(result["tags"])) {
        // set to zero array
        new_mapped_tags[tag_name] = [];
        if (tag_data.length > 0) {
            tag_data.forEach((tag_map) => {
                // @ts-ignore
                let [name, amount]: [string, number] = tag_map;
                new_mapped_tags[tag_name].push({
                    name: name,
                    amount: amount
                })
            })
        }
    }
    mapped_data["tags"] = new_mapped_tags;
    mapped_data["images"] = [];
    for (let index = 0; index < result["images"].length; index++) {
        let proxy_url = result["images"][index];
        let real_url = result["images"][index];
        let sizes_map = result["images_size"][index];
        let type = "";
        if (proxy_url.includes("nh/i")) {
            type = "image";
            real_url = proxy_url.replace("https://api.ihateani.me/v1/nh/i/", "https://i.nhentai.net/galleries/");
            if (real_url === proxy_url) {
                // handle old dangling cache
                real_url = proxy_url.replace("https://api.ihateani.me/nh/i/", "https://i.nhentai.net/galleries/");
            }
        } else if (proxy_url.includes("nh/t")) {
            type = "thumbnail";
            real_url = proxy_url.replace("https://api.ihateani.me/v1/nh/t/", "https://t.nhentai.net/galleries/");
            if (real_url === proxy_url) {
                // handle old dangling cache
                real_url = proxy_url.replace("https://api.ihateani.me/nh/t/", "https://t.nhentai.net/galleries/");
            }
        }
        mapped_data["images"].push({
            url: proxy_url,
            original_url: real_url,
            type: type,
            sizes: sizes_map
        })
    }
    mapped_data["url"] = result["url"];
    let published_time = moment.tz(result["posted_time"] * 1000, "UTC");
    mapped_data["publishedAt"] = published_time.format();
    mapped_data["favorites"] = result["favorites"];
    mapped_data["total_pages"] = result["images"].length;
    return mapped_data;
}


export const nhGQLResolvers: IResolvers = {
    DateTime: DateTimeScalar,
    Query: {
        info: async (_s, args: nhInfoParams, _c, _i): Promise<nhInfoResult> => {
            let [results, status_code] = await nhFetchInfo(maybeStr(args.doujin_id));
            if (status_code != 200) {
                if (status_code == 404) {
                    throw new ApolloError(`Cannot find information for code ${args.doujin_id}`, "INVALID_DOUJIN_CODE");
                } else {
                    throw new ApolloError(`Unknown error occured, got response code ${status_code} from API`, "NH_API_ERROR");
                }
            }
            // @ts-ignore
            let finalized_response = await reparseInformationData(results);
            return finalized_response
        },
        search: async (_s, args: nhSearchParams, _c, _i): Promise<nhSearchResult> => {
            let fetch_page = getValueFromKey(args, "page", 1);
            fetch_page = fallbackNaN(parseInt, fetch_page, 1);
            if (fetch_page < 1) {
                fetch_page = 1;
            }
            let [search_results, status_code] = await nhSearchDoujin(
                decodeURIComponent(args.query), fetch_page
            );
            if (status_code != 200) {
                if (status_code == 404) {
                    throw new ApolloError(`Cannot find anything with query: ${args.query}`, "NH_NO_RESULTS");
                } else {
                    throw new ApolloError(`Unknown error occured, got response code ${status_code} from API`, "NH_API_ERROR");
                }
            }
            let page_info: nhPageInfo = {
                current: search_results["current_page"],
                total: search_results["total_page"]
            }
            let finalized_response: nhSearchResult = {
                query: args.query,
                pageInfo: page_info
            };
            let reparsed_data: nhInfoResult[] = [];
            for (let i = 0; i < search_results["results"].length; i++) {
                let reparsed = await reparseInformationData(search_results["results"][i]);
                reparsed_data.push(reparsed);
            }
            finalized_response["results"] = reparsed_data;
            return finalized_response;
        },
        latest: async (_s, args: nhSearchParams, _c, _i): Promise<nhSearchResult> => {
            let fetch_page = getValueFromKey(args, "page", 1);
            fetch_page = fallbackNaN(parseInt, fetch_page, 1);
            if (fetch_page < 1) {
                fetch_page = 1;
            }
            let [latest_results, status_code] = await nhLatestDoujin(fetch_page);
            if (status_code != 200) {
                if (status_code == 404) {
                    throw new ApolloError(`Cannot fetch anything latest from nhentai`, "NH_NO_RESULTS");
                } else {
                    throw new ApolloError(`Unknown error occured, got response code ${status_code} from API`, "NH_API_ERROR");
                }
            }
            let page_info: nhPageInfo = {
                current: latest_results["current_page"],
                total: latest_results["total_page"]
            }
            let finalized_response: nhSearchResult = {
                query: args.query,
                pageInfo: page_info
            };
            let reparsed_data: nhInfoResult[] = [];
            for (let i = 0; i < latest_results["results"].length; i++) {
                let reparsed = await reparseInformationData(latest_results["results"][i]);
                reparsed_data.push(reparsed);
            }
            finalized_response["results"] = reparsed_data;
            return finalized_response;
        }
    }
}