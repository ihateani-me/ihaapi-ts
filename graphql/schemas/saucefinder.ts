import { gql } from "apollo-server-express";
import { GraphQLScalarType, Kind } from "graphql";

export const SimilarityScalar = new GraphQLScalarType({
    name: "Similarity",
    description: "Similarity for the match, might be a integer or float.",
    parseValue(value) {
        return value;
    },
    serialize(value) {
        return value;
    },
    parseLiteral(ast) {
        if (ast.kind === Kind.INT) {
            return parseInt(ast.value, 10);
        } else if (ast.kind === Kind.FLOAT) {
            return parseFloat(ast.value);
        }
        return null;
    }
})

export const SauceAPIGQL = gql`
    scalar JSON

    scalar Similarity

    type SauceObject {
        title: String!
        source: String!
        confidence: Similarity!
        thumbnail: String!
        extra_info: JSON
        indexer: String
    }

    type SauceResource {
        _total: Int!
        items: [SauceObject!]
    }

    type Query {
        saucenao(
            url: String!
            minsim: Float = 57.5
            limit: Int = 6
            db_index: Int = 999
        ): SauceResource!
        iqdb(
            url: String!
            minsim: Float = 50.0
            limit: Int = 6
        ): SauceResource!
        ascii2d(
            url: String!
            limit: Int = 2
        ): SauceResource!
    }
`;

export interface SauceObject {
    title: string
    source: string
    confidence: number
    thumbnail: string
    extra_info?: object
    indexer?: string
}

export interface SauceResource {
    _total: number
    items: SauceObject[]
}

interface Input {
    url: string
}

export interface SauceNAOParams extends Input {
    minsim: number
    limit?: number
    db_index?: number
}

export interface IQDBParams extends Input {
    minsim: number
    limit: number
}

export interface ASCII2DParams extends Input {
    limit?: number
}