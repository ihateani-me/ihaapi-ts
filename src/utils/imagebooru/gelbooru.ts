import { ImageBoardBase, ImageBoardResultsBase } from "./base";

import { logger as MainLogger } from "../logger";
import { numMoreThan } from "../swissknife";

import config from "../../config";

interface GelbooruResult {
    id?: string;
    title?: string;
    tags?: string[];
    source?: string;
    thumbnail: string;
    image_url: string;
    image_info: {
        w?: number | string;
        h?: number | string;
        e?: string | string;
        s?: number | string;
    };
}

interface GelbooruMapping {
    id: string;
    title: string;
    tags: string;
    source: string;
    thumbnail: string;
    image_url: string;
    image_info: {
        w: string;
        h: string;
    };
}

export class GelbooruBoard extends ImageBoardBase<GelbooruResult, GelbooruMapping> {
    private apiKey: string;
    private userId: string;
    private familyFriendly: boolean;

    constructor(safe_version = false) {
        super("https://gelbooru.com");
        this.familyFriendly = safe_version;
        this.logger = MainLogger.child({ cls: "GelbooruBoard" });
        this.mappings = {
            id: "id",
            title: "title||tags",
            tags: "++ ++tags",
            source: "source",
            thumbnail: "preview_url",
            image_url: "file_url",
            image_info: { w: "width##int", h: "height##int" },
        };
        this.apiKey =
            typeof config["imageboard"]["gelbooru"]["api_key"] === "string"
                ? config["imageboard"]["gelbooru"]["api_key"]
                : "anonymous";
        this.userId =
            typeof config["imageboard"]["gelbooru"]["user_id"] === "string"
                ? config["imageboard"]["gelbooru"]["user_id"]
                : "9455";
    }

    async search(query: string[] = [], page = 1): Promise<ImageBoardResultsBase<GelbooruResult>> {
        page = numMoreThan(page, 1);
        const params: { [key: string]: any } = {
            limit: 15,
            pid: page,
            page: "dapi",
            s: "post",
            q: "index",
            api_key: this.apiKey,
            user_id: this.userId,
        };
        query = this.normalizeTags(query);
        if (this.familyFriendly) {
            const redoneTags: string[] = [];
            query.forEach((tag) => {
                if (tag.includes("rating:")) {
                    return;
                }
                redoneTags.push(tag);
            });
            redoneTags.push("rating:safe");
            query = redoneTags;
        }
        // if (query.length > 0) {
        //     params["tags"] = query.join("+");
        // }
        const [results, status_code] = await this.request<string>(
            "get",
            `/index.php?tags=${query.join("+")}`,
            {
                params: params,
            }
        );
        let resultsFinal;
        if (status_code === 200) {
            const convertedXMLs = await this.xmlToJSON(results, "posts.post");
            const parsedResults = await this.parseJson(convertedXMLs);
            resultsFinal = {
                results: parsedResults,
                total_data: parsedResults.length,
                engine: "gelbooru",
                isError: false,
            };
        } else {
            resultsFinal = {
                results: [],
                total_data: 0,
                engine: "gelbooru",
                isError: true,
            };
        }
        return resultsFinal;
    }

    async random(query: string[] = [], page = 1): Promise<ImageBoardResultsBase<GelbooruResult>> {
        query = this.normalizeTags(query);
        query = query.filter((tag) => !tag.startsWith("order:")); // remove any order: tag
        if (!query.includes("order:random")) {
            query.push("order:random");
        }
        return await this.search(query, page);
    }
}
