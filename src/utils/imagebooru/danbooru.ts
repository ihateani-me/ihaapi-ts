import { AnyDict, ImageBoardBase, ImageBoardResultsBase } from "./base";

import { logger as MainLogger } from "../logger";
import { numMoreThan } from "../swissknife";

interface DanbooruResult {
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
        e?: string | string;
        s?: number | string;
    };
}

interface DanbooruMapping {
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

export class DanbooruBoard extends ImageBoardBase<DanbooruResult, DanbooruMapping> {
    private familyFriendly: boolean;

    constructor(safe_version = false) {
        super("https://danbooru.donmai.us");
        this.familyFriendly = safe_version;
        this.logger = MainLogger.child({ cls: "DanbooruBoard" });
        this.mappings = {
            id: "id",
            title: "tag_string_character||tag_string_copyright||tag_string_general||tag_string",
            tags: "++ ++tag_string_general||tag_string",
            meta: "++ ++tag_string_meta",
            artist: "++ ++tag_string_artist",
            source: "source",
            thumbnail: "preview_file_url",
            image_url: "file_url",
            image_info: { w: "image_width", h: "image_height", e: "file_ext", s: "file_size" },
        };
    }

    async search(query: string[] = [], page = 1): Promise<ImageBoardResultsBase<DanbooruResult>> {
        page = numMoreThan(page, 1);
        const params: { [key: string]: any } = {
            limit: 15,
            page: page,
        };
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
        query = query.filter((tag) => typeof tag === "string" && tag.length > 0 && tag);
        query = query.map((tag) => tag.replace(" ", "_").toLowerCase());
        if (query.length > 0) {
            params["tags"] = query.join("+");
        }
        const [results, status_code] = await this.request<AnyDict>("get", "/posts.json", {
            params: params,
        });
        let resultsFinal;
        if (status_code === 200) {
            const parsedResults = await this.parseJson(results);
            resultsFinal = {
                results: parsedResults,
                total_data: parsedResults.length,
                engine: this.familyFriendly ? "safebooru" : "danbooru",
                isError: false,
            };
        } else {
            resultsFinal = {
                results: [],
                total_data: 0,
                engine: this.familyFriendly ? "safebooru" : "danbooru",
                isError: true,
            };
        }
        return resultsFinal;
    }

    async random(query: string[] = [], page = 1): Promise<ImageBoardResultsBase<DanbooruResult>> {
        query = query.filter((tag) => typeof tag === "string" && tag.length > 0 && tag);
        if (!query.includes("order:random")) {
            query.push("order:random");
        }
        query = query.map((tag) => tag.replace(" ", "_").toLowerCase());
        return await this.search(query, page);
    }
}
