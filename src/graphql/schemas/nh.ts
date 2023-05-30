import { DateTime } from "luxon";

export const nHGQLSchemas = `#graphql
    """
    The doujin title data
    """
    type nhTitle {
        "A simplified or shortened version of the original title"
        simple: String!
        "English title if applicable"
        english: String!
        "Japanese title if applicable"
        japanese: String
    }

    """
    Image information of a page or thumbnail
    """
    type nhImage {
        "The image type, must be 'image' or 'thumbnail'"
        type: String!
        "The proxied URL of the image"
        url: String!
        "The original nHentai URL of the image"
        original_url: String!
        "Image sizes, Format: [width, height]"
        sizes: [Int]
    }

    """
    The per-tag information
    """
    type nhTag {
        "The tag name"
        name: String!
        "How many doujin there are tagged the same as this"
        amount: Int
    }

    """
    Doujin tags data
    """
    type nhTags {
        "Artist tag data"
        artists: [nhTag]
        "Categories tag data"
        categories: [nhTag]
        "Groups tag data"
        groups: [nhTag]
        "Languages tag data (If translated and such)"
        languages: [nhTag]
        "The 'tags' tag data"
        tags: [nhTag]
        "Parodies tag data"
        parodies: [nhTag]
        "Characters tag data"
        characters: [nhTag]
    }

    """
    A Doujin Information
    """
    type nhInfoResult {
        "The doujin code"
        id: ID!
        "Media ID for the doujin, used internally for image"
        media_id: String
        "The doujin title"
        title: nhTitle!
        "The cover art or thumbnail or first image"
        cover_art: nhImage!
        "The tags"
        tags: nhTags!
        "Images list of the doujin"
        images: [nhImage!]!
        "The URL of the page"
        url: String!
        "Publishing or uploaded time"
        publishedAt: DateTime!
        "Total favorites by user"
        favorites: Int
        "Total pages"
        total_pages: Int!
    }

    """
    Page information used for paginating between page
    """
    type nhPageInfo {
        "Current page"
        current: Int!
        "Total available page"
        total: Int!
    }

    """
    Search results of the provided query
    """
    type nhSearchResult {
        "Provided query"
        query: String
        "The results of it"
        results: [nhInfoResult!]
        "Page information for paginating"
        pageInfo: nhPageInfo!
    }

    """
    Search result information from website query.
    """
    type nhPageSearchInfoResult {
        "The doujin code"
        id: ID!
        "The doujin title"
        title: String!
        "The cover art or thumbnail or first image"
        cover_art: nhImage!
        "The language of the doujin"
        language: String!
    }

    """
    Search result information from website query.
    """
    type nhPageSearchResult {
        "Provided query"
        query: String
        "The results of it"
        results: [nhPageSearchInfoResult!]
        "Page information for paginating"
        pageInfo: nhPageInfo!
    }
`;

export interface nhTitle {
    simple: string;
    english: string;
    japanese?: string;
}

export interface nhTag {
    name: string;
    amount?: number;
}

export interface nhImage {
    type: string;
    url: string;
    original_url: string;
    sizes?: number[];
}

export interface nhTags {
    artists?: nhTag[];
    categories?: nhTag[];
    groups?: nhTag[];
    languages?: nhTag[];
    tags?: nhTag[];
    parodies?: nhTag[];
    characters?: nhTag[];
}

export interface nhInfoResult {
    id: string;
    media_id: string;
    title: nhTitle;
    cover_art: nhImage;
    tags: nhTags;
    images: nhImage[];
    url: string;
    publishedAt: DateTime;
    favorites?: number;
    total_pages: number;
}

export interface nhPageInfo {
    current: number;
    total: number;
}

export interface nhSearchResult {
    query?: string;
    results?: nhInfoResult[];
    pageInfo: nhPageInfo;
}

export interface nhPageSearchInfoResult {
    id: string;
    title: string;
    cover_art: nhImage;
    language: string;
}

export interface nhPageSearchResult {
    query?: string;
    results?: nhPageSearchInfoResult[];
    pageInfo: nhPageInfo;
}

export interface nhInfoParams {
    doujin_id: number;
}

export interface nhSearchParams {
    query?: string;
    page?: number;
}

export type nhSearchMode = "RECENT" | "POPULAR_TODAY" | "POPULAR_WEEK" | "POPULAR_ALL";

export interface nhPageSearchParams extends nhSearchParams {
    mode?: nhSearchMode;
}
