import cons = require("consolidate");
import * as express from "express";
import { VTubersDB } from "../dbconn";
import { bilibili_use_uuids, sortLive, channel_filters } from "../utils/filters";
import { LiveMap, BilibiliData, BiliBiliChannel, ChannelMap, ChannelArray } from "../utils/models";
const holoroutes = express.Router()

holoroutes.use((req, res, next) => {
    res.header({
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS, HEAD"
    })
    next()
});

/**
 * @swagger
 * /live:
 *  get:
 *      summary: Live/Upcoming HoloPro BiliBili Streams
 *      description: Fetch a list of live/upcoming streams from BiliBili for HoloPro VTubers, updated every 2 minutes for live data and 4 minutes for upcoming data.
 *      tags:
 *      - Hololive
 *      produces:
 *      - application/json
 *      parameters:
 *      - in: query
 *        name: uids
 *        description: Filter upcoming results with User ID (support multiple id separated by comma)
 *        required: false
 *        type: string
 *      responses:
 *          '200':
 *              description: A list of live/upcoming streams
 *              schema:
 *                  type: object
 *                  properties:
 *                      live:
 *                          type: array
 *                          items:
 *                              $ref: '#/definitions/BiliScheduleModel'
 *                      upcoming:
 *                          type: array
 *                          items:
 *                              $ref: '#/definitions/BiliScheduleModel'
 *                      cached:
 *                          type: boolean
 */
holoroutes.get("/live", (req, res) => {
    let user_query = req.query;
    res.header({
        "Cache-Control": "public, max-age=60, immutable"
    });
    try {
        console.log("[HololiveBili] Fetching Database...");
        VTubersDB.open_collection("hololive_data")
            .then(data_docs => {
                console.log("[HololiveBili] Parsing Database...");
                let vtb_res: LiveMap<BilibiliData[]> = data_docs[0];
                try {
                    delete vtb_res["_id"];
                } catch (error) {
                    console.error(error);
                }
                let final_mappings: LiveMap<BilibiliData[]> = {};
                console.log("[HololiveBili] Filtering Database...");
                // @ts-ignore
                final_mappings["live"] = sortLive(bilibili_use_uuids(user_query.uuid, vtb_res["live"]), "startTime");
                // @ts-ignore
                final_mappings["upcoming"] = bilibili_use_uuids(user_query.uuid, vtb_res["upcoming"]);
                final_mappings["cached"] = true;
                console.log("[HololiveBili] Sending...");
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


/**
 * @swagger
 * /channels:
 *  get:
 *      summary: HoloPro Vtubers BiliBili Channel Stats
 *      description: Fetch a list of HoloPro VTubers BiliBili channels info/statistics, updated every 6 hours.
 *      tags:
 *      - Hololive
 *      produces:
 *      - application/json
 *      parameters:
 *      - in: query
 *        name: fields
 *        description: Filter fields that will be returned, multiples value are separated by comma
 *        required: false
 *        type: string
 *        enum:
 *        - id
 *        - room_id
 *        - name
 *        - description
 *        - thumbnail
 *        - subscriberCount
 *        - viewCount
 *        - videoCount
 *        - live
 *      - in: query
 *        name: sort
 *        description: Sort data by one of the values below.
 *        required: false
 *        type: string
 *        enum:
 *        - id
 *        - room_id
 *        - name
 *        - description
 *        - thumbnail
 *        - subscriberCount
 *        - viewCount
 *        - videoCount
 *      - in: query
 *        name: order
 *        description: Sort order.
 *        required: false
 *        type: string
 *        enum:
 *        - ascending
 *        - descending
 *      responses:
 *          '200':
 *              description: A list of channels.
 *              schema:
 *                  type: object
 *                  properties:
 *                      channels:
 *                          type: array
 *                          items:
 *                              $ref: '#/definitions/BiliBiliChannelModel'
 *                      cached:
 *                          type: boolean
 */
holoroutes.get("/channels", (req, res) => {
    let user_query = req.query;
    try {
        console.log("[HololiveBili_Channels] Fetching Database...");
        VTubersDB.open_collection("hololive_data")
            .then(data_docs => {
                console.log("[HololiveBili_Channels] Parsing Database...");
                let vtb_res: ChannelMap<BiliBiliChannel[]> = data_docs[0];
                try {
                    delete vtb_res["_id"];
                } catch (error) {
                    console.error(error);
                }
                console.log("[HololiveBili_Channels] Filtering Database...");
                let final_mappings = channel_filters(user_query, vtb_res["channels"]);
                console.log("[HololiveBili_Channels] Sending...");
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

export { holoroutes };