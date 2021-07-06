import { gql, PubSub } from "apollo-server-express";
import { ChangeEventCR, ChangeEventUpdate } from "mongodb";

import { VTQuery } from "../resolvers";
import { VideoProps, VideosData } from "../../controller";
import { is_none } from "../../utils/swissknife";
import { logger as MainLogger } from "../../utils/logger";

import config from "../../config";

const logger = MainLogger.child({ cls: "VTAPISubscription" });
const vtpubsub = new PubSub();

export const VTAPISubscriptionSchemas = gql`
    """
    The subscription change type for LiveObject
    """
    enum VideoChangeType {
        new
        update
    }

    """
    Subscription type for VTuber API.
    Returns the item changed and the change type.
    """
    type LivesSubscription {
        "Video that got changed"
        item: LiveObject!
        "The change type"
        type: VideoChangeType
    }
`;

export const VIDEO_DB_CHANGED = "VIDEO_DB_CHANGE";
export const VIDEO_DB_NEW = "VIDEO_DB_NEW";
let VTAPISubscription: any;

if (!is_none(config.mongodb.replica_set) && config.mongodb.replica_set.length > 0) {
    logger.info("Started watching status update...");
    VideosData.watch([{ $match: { operationType: "update" } }], { fullDocument: "updateLookup" }).on(
        "change",
        // @ts-ignore
        (doc: ChangeEventUpdate<VideoProps>) => {
            const updFields = Object.keys(doc["updateDescription"]["updatedFields"]);
            if (updFields.includes("status")) {
                logger.info("Status change detected, emitting changes!");
                // @ts-ignore
                const result = VTQuery.mapLiveResultToSchema(doc["fullDocument"]);
                vtpubsub.publish(VIDEO_DB_CHANGED, {
                    videoStatusUpdate: {
                        item: result,
                        type: "update",
                    },
                });
            }
        }
    );

    logger.info("Started watching new video...");
    VideosData.watch([{ $match: { operationType: "insert" } }], { fullDocument: "updateLookup" }).on(
        "change",
        // @ts-ignore
        (doc: ChangeEventCR<VideoProps>) => {
            // @ts-ignore
            const result = VTQuery.mapLiveResultToSchema(doc["fullDocument"]);
            vtpubsub.publish(VIDEO_DB_NEW, {
                newVideos: {
                    item: result,
                    type: "new",
                },
            });
        }
    );

    VTAPISubscription = {
        newVideos: {
            subscribe: () => vtpubsub.asyncIterator(VIDEO_DB_NEW),
        },
        videoStatusUpdate: {
            subscribe: () => vtpubsub.asyncIterator(VIDEO_DB_CHANGED),
        },
    };
}

export { VTAPISubscription };
