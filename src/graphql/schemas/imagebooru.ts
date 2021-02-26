import { gql } from "apollo-server-express";
import { Nullable } from "../../utils/swissknife";

export const ImageBooruSchemas = gql`
    """
    The board type or the image board name
    """
    enum BoardEngine {
        "danbooru.donmai.us"
        danbooru
        "danbooru.donmai.us with rating:safe"
        safebooru
        "konachan.net"
        konachan
        "gelbooru.net"
        gelbooru
    }

    type ImageInfo {
        "The image width"
        w: Int
        "The image height"
        h: Int
        "The image extension"
        e: String
        "The image size in bytes (If available)"
        s: Int
    }

    """
    The result of the search params on the selected Image board.
    """
    type ImageBoardResult {
        "The image ID"
        id: ID!
        "The image title"
        title: String!
        "The image tags"
        tags: [String]
        "The image meta tags (If available)"
        meta: [String]
        "The image artist tags (If available)"
        artist: [String]
        "The image source (If available)"
        source: String
        "The image thumbnail"
        thumbnail: String!
        "The image URL"
        image_url: String!
        "Image metadata information"
        image_info: ImageInfo
        "Extras data that might be omitted by the selected engine"
        extras: JSON
        "The board engine or type used for the image"
        engine: BoardEngine!
    }

    type ImageBoardResults {
        results: [ImageBoardResult]!
        total: Int!
    }
`;

export type BoardEngine = "danbooru" | "safebooru" | "konachan" | "gelbooru";

export interface ImageInfo {
    w?: Nullable<number>;
    h?: Nullable<number>;
    e?: Nullable<string>;
    s?: Nullable<number>;
}

export interface ImageBoardResult {
    id: any;
    title: string;
    tags?: Nullable<string[]>;
    meta?: Nullable<string[]>;
    artist?: Nullable<string[]>;
    source?: Nullable<string>;
    thumbnail: string;
    image_url: string;
    image_info: ImageInfo;
    extras: { [key: string]: any };
    engine: BoardEngine;
}

export interface ImageBoardParams {
    tags?: string[];
    page: number;
    engine: BoardEngine[];
}
