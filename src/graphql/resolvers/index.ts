import _ from "lodash";
import { IResolvers } from "apollo-server-express";

import { SauceGQLResoler } from "./saucefinder";
import { VTAPIv2Resolvers } from "./vtapi";
import { nhGQLResolvers } from "./nh";
import { ImageBooruGQLResolver } from "./imagebooru";

export * from "./vtapi";
export * from "./nh";
export * from "./saucefinder";

const multiResolvers: IResolvers = {
    Query: {
        vtuber: () => ({}),
        sauce: () => ({}),
        nhentai: () => ({}),
        imagebooru: () => ({}),
    },
    VTuberQuery: VTAPIv2Resolvers["Query"],
    SauceQuery: SauceGQLResoler["Query"],
    nHentaiQuery: nhGQLResolvers["Query"],
    ImageBoardQuery: ImageBooruGQLResolver["Query"],
};

const vtresolver = _.omit(VTAPIv2Resolvers, ["Query"]);
const sauceresolver = _.omit(SauceGQLResoler, ["Query"]);
const nhresolver = _.omit(nhGQLResolvers, ["Query"]);
_.merge(multiResolvers, vtresolver, sauceresolver, nhresolver);

export { multiResolvers as v2Resolvers };
