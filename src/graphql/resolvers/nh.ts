import _ from "lodash";
import { IExecutableSchemaDefinition } from "@graphql-tools/schema";
import { GraphQLError } from "graphql";

import {
    nhImage,
    nhInfoParams,
    nhInfoResult,
    nhPageInfo,
    nhPageSearchParams,
    nhPageSearchResult,
    nhSearchMode,
    nhSearchParams,
    nhSearchResult,
    nhTags,
    nhTitle,
} from "../schemas";

import {
    nhFetchInfo,
    nhInfoData,
    nhLatestDoujin,
    nhSearchDoujin,
    nhSearchDoujinScrapper,
} from "../../utils/nh";
import { fallbackNaN, getValueFromKey, is_none } from "../../utils/swissknife";
import { GQLContext } from "../types";
import { DateTime } from "luxon";

function maybeStr(input: any): string {
    if (typeof input === "number") {
        return input.toString();
    } else if (typeof input === "string") {
        return input;
    }
    return input.toString();
}

async function reparseInformationData(result: nhInfoData): Promise<nhInfoResult> {
    // @ts-ignore
    const mapped_data: nhInfoResult = {};
    mapped_data["id"] = result["id"];
    mapped_data["media_id"] = result["media_id"] as string;
    const title_map: nhTitle = {
        simple: result["title"],
        // @ts-ignore
        english: result["original_title"]["other"] as string,
        // @ts-ignore
        japanese: result["original_title"]["japanase"] as string,
    };
    mapped_data["title"] = title_map;
    const cover_art: nhImage = {
        type: "thumbnail",
        url: result["cover"].url,
        original_url: result["cover"].original_url,
        sizes: result["cover"].sizes,
    };
    if (cover_art["url"] === cover_art["original_url"]) {
        // handle old dangling cache
        cover_art["original_url"].replace(
            "https://api.ihateani.me/nh/t/",
            "https://t.nhentai.net/galleries/"
        );
    }
    if (is_none(mapped_data["media_id"])) {
        // handle old dangling cache
        const split_thumb_url = cover_art["url"].split("/");
        mapped_data["media_id"] = _.nth(split_thumb_url, -2) as string;
    }
    mapped_data["cover_art"] = cover_art;
    const new_mapped_tags: nhTags = {};
    for (const [tag_name, tag_data] of Object.entries(result["tags"])) {
        // set to zero array
        new_mapped_tags[tag_name as keyof nhTags] = [];
        if (tag_data.length > 0) {
            tag_data.forEach((tag_map: any[]) => {
                // @ts-ignore
                const [name, amount]: [string, number] = tag_map;
                new_mapped_tags[tag_name as keyof nhTags]?.push({
                    name: name,
                    amount: amount,
                });
            });
        }
    }
    mapped_data["tags"] = new_mapped_tags;
    mapped_data["images"] = [];
    for (let index = 0; index < result["images"].length; index++) {
        const proxy_url = result["images"][index];
        let real_url = result["images"][index];
        // @ts-ignore
        const sizes_map = result["images_size"][index];
        let type = "";
        if (proxy_url.includes("nh/i")) {
            type = "image";
            real_url = proxy_url.replace(
                "https://api.ihateani.me/v1/nh/i/",
                "https://i.nhentai.net/galleries/"
            );
            if (real_url === proxy_url) {
                // handle old dangling cache
                real_url = proxy_url.replace(
                    "https://api.ihateani.me/nh/i/",
                    "https://i.nhentai.net/galleries/"
                );
            }
        } else if (proxy_url.includes("nh/t")) {
            type = "thumbnail";
            real_url = proxy_url.replace(
                "https://api.ihateani.me/v1/nh/t/",
                "https://t.nhentai.net/galleries/"
            );
            if (real_url === proxy_url) {
                // handle old dangling cache
                real_url = proxy_url.replace(
                    "https://api.ihateani.me/nh/t/",
                    "https://t.nhentai.net/galleries/"
                );
            }
        }
        mapped_data["images"].push({
            url: proxy_url,
            original_url: real_url,
            type: type,
            sizes: sizes_map,
        });
    }
    mapped_data["url"] = result["url"];
    const unixTime = DateTime.fromMillis(result.posted_time * 1000, { zone: "UTC" });
    mapped_data["publishedAt"] = unixTime;
    mapped_data["favorites"] = result["favorites"];
    mapped_data["total_pages"] = result["images"].length;
    return mapped_data;
}

type IResolver = Required<IExecutableSchemaDefinition<GQLContext>>["resolvers"];

export const nhGQLResolvers: IResolver = {
    Query: {
        async info(_s, args: nhInfoParams, ctx, _i): Promise<nhInfoResult> {
            const [results, status_code] = await nhFetchInfo(maybeStr(args.doujin_id));
            if (status_code != 200) {
                if (status_code == 404) {
                    ctx.res.status(404);
                    throw new GraphQLError(`Cannot find information for code ${args.doujin_id}`, {
                        extensions: {
                            code: "INVALID_DOUJIN_CODE",
                        },
                    });
                } else {
                    ctx.res.status(status_code);
                    throw new GraphQLError(
                        `Unknown error occured, got response code ${status_code} from API`,
                        {
                            extensions: {
                                code: "NH_API_ERROR",
                            },
                        }
                    );
                }
            }
            // @ts-ignore
            const finalized_response = await reparseInformationData(results);
            return finalized_response;
        },
        async search(_s, args: nhSearchParams, ctx, _i): Promise<nhSearchResult> {
            let fetch_page = getValueFromKey(args, "page", 1) as number;
            fetch_page = fallbackNaN(parseInt, fetch_page, 1) as number;
            if (fetch_page < 1) {
                fetch_page = 1;
            }
            const [search_results, status_code] = await nhSearchDoujin(
                decodeURIComponent(args.query as string),
                fetch_page
            );
            if (status_code != 200) {
                if (status_code == 404) {
                    ctx.res.status(404);
                    throw new GraphQLError(`Cannot find anything with query: ${args.query}`, {
                        extensions: { code: "NH_NO_RESULTS" },
                    });
                } else {
                    ctx.res.status(status_code);
                    throw new GraphQLError(
                        `Unknown error occured, got response code ${status_code} from API`,
                        {
                            extensions: {
                                code: "NH_API_ERROR",
                            },
                        }
                    );
                }
            }
            const page_info: nhPageInfo = {
                current: search_results["current_page"] || (0 as number),
                total: search_results["total_page"] || (0 as number),
            };
            const finalized_response: nhSearchResult = {
                query: args.query,
                pageInfo: page_info,
            };
            const reparsed_data: nhInfoResult[] = [];
            if (!is_none(search_results["results"])) {
                for (let i = 0; i < search_results["results"].length; i++) {
                    const reparsed = await reparseInformationData(search_results["results"][i]);
                    reparsed_data.push(reparsed);
                }
            }
            finalized_response["results"] = reparsed_data;
            return finalized_response;
        },
        async latest(_s, args: nhSearchParams, ctx, _i): Promise<nhSearchResult> {
            let fetch_page = getValueFromKey(args, "page", 1) as number;
            fetch_page = fallbackNaN(parseInt, fetch_page, 1) as number;
            if (fetch_page < 1) {
                fetch_page = 1;
            }
            const [latest_results, status_code] = await nhLatestDoujin(fetch_page);
            if (status_code != 200) {
                if (status_code == 404) {
                    ctx.res.status(404);
                    throw new GraphQLError(`Cannot fetch anything latest from nhentai`, {
                        extensions: { code: "NH_NO_RESULTS" },
                    });
                } else {
                    ctx.res.status(status_code);
                    throw new GraphQLError(
                        `Unknown error occured, got response code ${status_code} from API`,
                        {
                            extensions: {
                                code: "NH_API_ERROR",
                            },
                        }
                    );
                }
            }
            const page_info: nhPageInfo = {
                current: latest_results["current_page"] as number,
                total: latest_results["total_page"] as number,
            };
            const finalized_response: nhSearchResult = {
                query: args.query,
                pageInfo: page_info,
            };
            const reparsed_data: nhInfoResult[] = [];
            if (!is_none(latest_results["results"])) {
                for (let i = 0; i < latest_results["results"].length; i++) {
                    const reparsed = await reparseInformationData(latest_results["results"][i]);
                    reparsed_data.push(reparsed);
                }
            }
            finalized_response["results"] = reparsed_data;
            return finalized_response;
        },
        async searchweb(_s, args: nhPageSearchParams, ctx, _i): Promise<nhPageSearchResult> {
            let fetch_page = getValueFromKey(args, "page", 1) as number;
            fetch_page = fallbackNaN(parseInt, fetch_page, 1) as number;
            if (fetch_page < 1) {
                fetch_page = 1;
            }
            const query = decodeURIComponent(args.query as string);
            let queryMode = getValueFromKey(args, "mode", "RECENT") as nhSearchMode;
            if (!["RECENT", "POPULAR_TODAY", "POPULAR_WEEK", "POPULAR_ALL"].includes(queryMode)) {
                queryMode = "RECENT";
            }
            const searchResults = await nhSearchDoujinScrapper(query, fetch_page, queryMode);
            if (is_none(searchResults)) {
                ctx.res.status(404);
                throw new GraphQLError(`Cannot find anything with query: ${args.query}`, {
                    extensions: { code: "NH_NO_RESULTS" },
                });
            }
            return searchResults;
        },
    },
};
