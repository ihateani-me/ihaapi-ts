import * as express from "express";

import { MongoConnection } from "../dbconn";

import { LiveMap, YouTubeData, YTLiveArray } from "../utils/models";
import { map_bool } from "../utils/swissknife";
import { logger as TopLogger } from "../utils/logger";

const MainLogger = TopLogger.child({cls: "Routes.MuseID"});
const museroutes = express.Router()
const MuseDB = new MongoConnection("museid");

museroutes.use((req, res, next) => {
    res.header({
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS, HEAD"
    })
    next()
});

interface MuseMap extends LiveMap<YouTubeData[]> {
    feeds?: string[]
}

museroutes.get("/live", (req, res) => {
    const logger = MainLogger.child({fn: "live"});
    let exclude_feeds = map_bool(req.query.exclude_feeds);
    try {
        logger.info("Fetching Database...");
        let current_lives: YouTubeData[] = []
        let upcoming_lives: YouTubeData[] = []
        var final_mappings: MuseMap = {};
        MuseDB.open_collection("live_data")
            .then(data_docs => {
                logger.info("Parsing Database...");
                let vtb_res: YTLiveArray<YouTubeData[]> = data_docs[0];
                try {
                    delete vtb_res["_id"];
                } catch (error) {
                    logger.error(error);
                }

                for (let [channel_id, channel_data] of Object.entries(vtb_res)) {
                    channel_data.forEach((stream) => {
                        stream.channel = channel_id;
                        if (stream.status == "live") {
                            current_lives.push(stream);
                        } else if (stream.status == "upcoming") {
                            upcoming_lives.push(stream);
                        };
                    });
                };
                
            })
            .catch(error => {
                logger.error(error);
                res.status(500).json({ message: "Internal server error occured." });
            });
        final_mappings["live"] = current_lives;
        final_mappings["upcoming"] = upcoming_lives;
        if (!exclude_feeds) {
            logger.info("Fetching Database...");
            MuseDB.open_collection("video_ids")
                .then(data_docs => {
                    logger.info("Parsing Database...");
                    let vtb_res: YTLiveArray<string[]> = data_docs[0];
                    try {
                        delete vtb_res["_id"];
                    } catch (error) {
                        logger.error(error);
                    }
                    final_mappings["feeds"] = vtb_res["UCxxnxya_32jcKj4yN1_kD7A"];
                    final_mappings["cached"] = true;
                    res.json(final_mappings);
                })
                .catch(error => {
                    logger.error(error);
                    res.status(500).json({ message: "Internal server error occured." });
                });
        } else {
            final_mappings["cached"] = true;
            res.json(final_mappings);
        }
    } catch (error) {
        logger.error(error);
        res.status(500).json({ message: "Internal server error occured." });
    }
});

export { museroutes };