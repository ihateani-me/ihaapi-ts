import { IExecutableSchemaDefinition } from "@graphql-tools/schema";

import { SauceGQLResoler } from "./saucefinder";
import { VTAPIv2Resolvers } from "./vtapi";
import { nhGQLResolvers } from "./nh";
import { ImageBooruGQLResolver } from "./imagebooru";
import { GQLScalarsResolver } from "./scalars";
import { GQLContext } from "../types";

export * from "./vtapi";
export * from "./nh";
export * from "./saucefinder";
export * from "./imagebooru";
export * from "./scalars";

type IResolver = IExecutableSchemaDefinition<GQLContext>["resolvers"];

const multiResolvers: IResolver = {
    Query: {
        vtuber: () => ({}),
        sauce: () => ({}),
        nhentai: () => ({}),
        imagebooru: () => ({}),
    },
    // @ts-ignore
    VTuberQuery: VTAPIv2Resolvers["Query"],
    // @ts-ignore
    SauceQuery: SauceGQLResoler["Query"],
    // @ts-ignore
    nHentaiQuery: nhGQLResolvers["Query"],
    // @ts-ignore
    ImageBoardQuery: ImageBooruGQLResolver["Query"],
    ...GQLScalarsResolver,
};

export { multiResolvers as v2Resolvers };
