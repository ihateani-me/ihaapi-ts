import * as express from "express";
import { VTubersDB } from "../dbconn";
import { sortLive } from "../utils/filters";
import { LiveMap, TwitchData } from "../utils/models";
const twitchroutes = express.Router()

twitchroutes.use((req, res, next) => {
    res.header({
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS, HEAD",
        "Cache-Control": "public, max-age=60, immutable"
    })
    next()
});

twitchroutes.get("/live", (req, res) => {
    try {
        console.log("[Twitch] Fetching Database...");
        VTubersDB.open_collection("twitch_data")
            .then(data_docs => {
                console.log("[Twitch] Parsing Database...");
                let vtb_res: LiveMap<TwitchData[]> = data_docs[0];
                try {
                    delete vtb_res["_id"];
                } catch (error) {
                    console.error(error);
                }
                let final_mappings: LiveMap<TwitchData[]> = {};
                console.log("[Twitch] Filtering Database...");
                // @ts-ignore
                final_mappings["live"] = sortLive(vtb_res["live"], "startTime");
                final_mappings["cached"] = true;
                console.log("[Twitch] Sending...");
                res.json(final_mappings)
            })
            .catch(error => {
                console.log(error);
                res.status(500).json({message: "Internal server error occured."});
            });
    } catch (error) {
        console.error(error);
        res.status(500).json({message: "Internal server error occured."});
    }
});

export { twitchroutes };