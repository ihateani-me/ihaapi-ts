import _ from "lodash";

import { IResolvers } from "apollo-server-express";
import { SauceGQLResoler } from "./saucefinder";
import { VTAPIv2Resolvers } from "./vtapi";

export * from "./vtapi";
export * from "./saucefinder";

let multiResolvers: IResolvers = {
    Query: {
        vtuber: () => ({}),
        sauce: () => ({})
    },
    VTuberQuery: VTAPIv2Resolvers["Query"],
    SauceQuery: SauceGQLResoler["Query"],
}

let vtresolver = _.omit(VTAPIv2Resolvers, ["Query"]);
let sauceresolver = _.omit(SauceGQLResoler, ["Query"]);
_.merge(multiResolvers, vtresolver, sauceresolver);

export {
    multiResolvers as v2Resolvers
}