import { IExecutableSchemaDefinition } from "@graphql-tools/schema";
import { GQLContext } from "../types";
import { DateTimeScalar, SimilarityScalar } from "../schemas/scalars";
import GraphQLJSON from "graphql-type-json";

export const GQLScalarsResolver: IExecutableSchemaDefinition<GQLContext>["resolvers"] = {
    DateTime: DateTimeScalar,
    JSON: GraphQLJSON,
    Similarity: SimilarityScalar,
};
