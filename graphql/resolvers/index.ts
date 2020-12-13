import _ from "lodash";

import { IResolvers } from "apollo-server-express";
import { SauceGQLResoler } from "./saucefinder";
import { VTAPIv2Resolvers } from "./vtapi";
import { nhGQLResolvers } from "./nh";

export * from "./vtapi";
export * from "./nh";
export * from "./saucefinder";

let multiResolvers: IResolvers = {
    Query: {
        vtuber: () => ({}),
        sauce: () => ({}),
        nhentai: () => ({}),
    },
    VTuberQuery: VTAPIv2Resolvers["Query"],
    SauceQuery: SauceGQLResoler["Query"],
    nHentaiQuery: nhGQLResolvers["Query"],
}

let vtresolver = _.omit(VTAPIv2Resolvers, ["Query"]);
let sauceresolver = _.omit(SauceGQLResoler, ["Query"]);
let nhresolver = _.omit(nhGQLResolvers, ["Query"]);
_.merge(multiResolvers, vtresolver, sauceresolver, nhresolver);

export {
    multiResolvers as v2Resolvers
}