import _ from "lodash";

import { VTAPISubscription, VTAPISubscriptionSchemas } from "./vtapi";

const SubscriptionSchemas = `#graphql
    type Subscription {
        "Subscribe to a new video update that got added to the database"
        newVideos: LivesSubscription!
        "Subscribe to a status update (live, upcoming, past) of a video"
        videoStatusUpdate: LivesSubscription!
    }
`;

const v2SubscriptionSchemas: string[] = [];

const SubscriptionResolver = {
    Subscription: {},
};
const finalSubsList = {};
if (typeof VTAPISubscription !== "undefined") {
    _.merge(finalSubsList, VTAPISubscription);
    v2SubscriptionSchemas.push(VTAPISubscriptionSchemas);
    v2SubscriptionSchemas.push(SubscriptionSchemas);
}
SubscriptionResolver["Subscription"] = finalSubsList;

export { SubscriptionResolver, v2SubscriptionSchemas };
