import { ImageBoardBase, ImageBoardResultsBase } from "./base";

import { logger as MainLogger } from "../logger";
import { numMoreThan } from "../swissknife";

interface KonachanResult {
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
    };
}

interface KonachanMapping {
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
    };
}

export class KonachanBoard extends ImageBoardBase<KonachanResult, KonachanMapping> {
    constructor() {
        super("https://konachan.net");
        this.logger = MainLogger.child({ cls: "KonachanBoard" });
        this.mappings = {
            id: "id",
            title: "tags",
            tags: "++ ++tags",
            meta: "++ ++tags",
            artist: "++ ++author",
            source: "source",
            thumbnail: "preview_url",
            image_url: "file_url",
            image_info: { w: "width", h: "height", e: "file_ext" },
        };
    }

    async search(query: string[] = [], page = 1): Promise<ImageBoardResultsBase<KonachanResult>> {
        page = numMoreThan(page, 1);
        const params: { [key: string]: any } = {
            limit: 15,
            page: page,
        };
        query = query.filter((tag) => typeof tag === "string" && tag.length > 0 && tag);
        query = query.map((tag) => tag.replace(" ", "_").toLowerCase());
        if (query.length > 0) {
            params["tags"] = query.join("+");
        }
        const [results, status_code] = await this.request("get", "/post.json", {
            params: params,
        });
        let resultsFinal;
        if (status_code === 200) {
            const parsedResults = await this.parseJson(results);
            resultsFinal = {
                results: parsedResults,
                total_data: parsedResults.length,
                engine: "konachan",
                isError: false,
            };
        } else {
            resultsFinal = {
                results: [],
                total_data: 0,
                engine: "konachan",
                isError: true,
            };
        }
        return resultsFinal;
    }

    async random(query: string[] = []): Promise<ImageBoardResultsBase<KonachanResult>> {
        query = query.filter((tag) => typeof tag === "string" && tag.length > 0 && tag);
        if (!query.includes("order:random")) {
            query.push("order:random");
        }
        return await this.search(query);
    }
}
