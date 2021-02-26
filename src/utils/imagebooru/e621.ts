import { AnyDict, ImageBoardBase, ImageBoardResultsBase } from "./base";

import { logger as MainLogger } from "../logger";
import { numMoreThan } from "../swissknife";

interface E621Result {
    id?: string;
    title?: string;
    tags?: string[];
    meta?: string[];
    artist?: string[];
    source?: string;
    thumbnail: string;
    image_url: string;
    image_info: {
        w?: number | string;
        h?: number | string;
        e?: string;
        s?: number | string;
    };
}

interface E621Mapping {
    id: string;
    title: string;
    tags: string;
    meta: string;
    artist: string;
    source: string;
    thumbnail: string;
    image_url: string;
    image_info: {
        w: string;
        h: string;
        e: string;
        s: string;
    };
}

export class E621Board extends ImageBoardBase<E621Result, E621Mapping> {
    private familyFriendly: boolean;

    constructor(safe_version = false) {
        super("https://e621.net");
        this.familyFriendly = safe_version;
        this.logger = MainLogger.child({ cls: "E621Board" });
        this.mappings = {
            id: "id",
            title: "description||tags.general",
            tags: "tags.general",
            meta: "tags.meta",
            artist: "tags.artist",
            source: "sources.0",
            thumbnail: "preview.url",
            image_url: "file.url",
            image_info: { w: "file.width", h: "file.height", e: "file.ext", s: "file.size" },
        };
    }

    async search(query: string[] = [], page = 1): Promise<ImageBoardResultsBase<E621Result>> {
        page = numMoreThan(page, 1);
        const params: { [key: string]: any } = {
            limit: 15,
            page: page,
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
        if (query.length > 0) {
            params["tags"] = query.join("+");
        }
        const [results, status_code] = await this.request<AnyDict>("get", "/posts.json", {
            params: params,
        });
        let resultsFinal;
        if (status_code === 200) {
            let parsedResults = await this.parseJson(results["posts"]);
            parsedResults = parsedResults.map((res) => {
                if (Array.isArray(res.title)) {
                    res.title = res.title.join(" ");
                }
                return res;
            });
            resultsFinal = {
                results: parsedResults,
                total_data: parsedResults.length,
                engine: "e621",
                isError: false,
            };
        } else {
            resultsFinal = {
                results: [],
                total_data: 0,
                engine: "e621",
                isError: true,
            };
        }
        return resultsFinal;
    }

    async random(query: string[] = []): Promise<ImageBoardResultsBase<E621Result>> {
        query = this.normalizeTags(query);
        query = query.filter((tag) => !tag.startsWith("order:")); // remove any order: tag
        if (!query.includes("order:random")) {
            query.push("order:random");
        }
        return await this.search(query);
    }
}
