import { gql } from "apollo-server-express";

export const nHGQLSchemas = gql`
    type nhTitle {
        simple: String!
        english: String!
        japanese: String
    }

    type nhImage {
        type: String!
        url: String!
        original_url: String!
        sizes: [Int]
    }

    type nhTag {
        name: String!
        amount: Int
    }

    type nhTags {
        artists: [nhTag]
        categories: [nhTag]
        groups: [nhTag]
        languages: [nhTag]
        tags: [nhTag]
        parodies: [nhTag]
        characters: [nhTag]
    }

    type nhInfoResult {
        id: ID!
        media_id: String
        title: nhTitle!
        cover_art: nhImage!
        tags: nhTags!
        images: [nhImage!]!
        url: String!
        publishedAt: DateTime!
        favorites: Int
        total_pages: Int!
    }

    type nhPageInfo {
        current: Int!
        total: Int!
    }

    type nhSearchResult {
        query: String
        results: [nhInfoResult!]
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
    publishedAt: string;
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

export interface nhInfoParams {
    doujin_id: number;
}

export interface nhSearchParams {
    query?: string;
    page?: number;
}
