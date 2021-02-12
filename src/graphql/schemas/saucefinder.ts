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
    },
});

export const SauceAPIGQL = gql`
    """
    A JSON formatted (key-value dictionary)
    """
    scalar JSON

    """
    Similarity for the match, might be a integer or float.
    """
    scalar Similarity

    """
    Possible matching image sauce
    """
    type SauceObject {
        "The image name, dependes on the source"
        title: String!
        "The source url"
        source: String!
        "How similar the match are"
        confidence: Similarity!
        "The thumbnail for the match"
        thumbnail: String!
        "Extra info that might be omitted, for example: Episode and time of the image"
        extra_info: JSON
        "Indexer used for the image"
        indexer: String
    }

    type SauceResource {
        "Total matches"
        _total: Int!
        "Collection or a list of closest-matching sauce"
        items: [SauceObject!]
    }
`;

export interface SauceObject {
    title: string;
    source: string;
    confidence: number;
    thumbnail: string;
    extra_info?: object;
    indexer?: string;
}

export interface SauceResource {
    _total: number;
    items: SauceObject[];
}

interface Input {
    url: string;
}

export interface SauceNAOParams extends Input {
    minsim: number;
    limit?: number;
    db_index?: number;
}

export interface IQDBParams extends Input {
    minsim: number;
    limit: number;
}

export interface ASCII2DParams extends Input {
    limit?: number;
}
