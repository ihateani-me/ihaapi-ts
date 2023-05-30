import { GraphQLScalarType, Kind } from "graphql";
import { DateTime } from "luxon";

export const DateTimeScalar = new GraphQLScalarType({
    name: "DateTime",
    description: "A datetime string format, using ISO 8601 format.",
    parseValue(value) {
        if (typeof value === "string") {
            const result = DateTime.fromISO(value, { zone: "UTC" });
            if (result.isValid) {
                return result;
            }
        }
        throw Error("GraphQL DateTime must be in ISO 8601 format");
    },
    serialize(value) {
        if (value instanceof DateTime) {
            return value.toISO({ suppressMilliseconds: true });
        }
        throw Error("GraphQL DateTime scalar serializer expects DateTime instance");
    },
    parseLiteral(value) {
        if (value.kind === Kind.INT) {
            return DateTime.fromMillis(parseInt(value.value, 10));
        } else if (value.kind === Kind.FLOAT) {
            return DateTime.fromMillis(parseFloat(value.value));
        } else if (value.kind === Kind.STRING) {
            const result = DateTime.fromISO(value.value, { zone: "UTC" });
            if (result.isValid) {
                return result;
            }
        }
        return null;
    },
});

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

export const GQLScalarSchema = `#graphql
    """
    A datetime string format, using ISO 8601 format.
    """
    scalar DateTime

    """
    A JSON formatted (key-value dictionary)
    """
    scalar JSON

    """
    Similarity for the match, might be a integer or float.
    """
    scalar Similarity
`;
