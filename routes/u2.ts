import * as express from "express";
import { getU2TorrentOffers, getU2TorrentsRSS } from "../utils/u2scrapper";
const u2routes = express.Router();

u2routes.use((req, res, next) => {
    res.header({
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS, HEAD"
    })
    next()
});

u2routes.get("/latest", (req, res) => {
    getU2TorrentsRSS("cat14=1&cat15=1&cat16=1&cat30=1&cat40=1&rows=10").then(([u2_latest_data, msg]) => {
        if (u2_latest_data.length == 0 && msg.toLowerCase() != "success") {
            res.status(500).json({error: msg, code: 500});
        } else {
            res.json({results: u2_latest_data})
        }
    }).catch((err) => {
        res.status(500).json({error: `Exception occured: ${err.toString()}`, code: 500});
    })
})

u2routes.get("/offers", (req, res) => {
    getU2TorrentOffers().then(([u2_latest_data, msg]) => {
        if (u2_latest_data.length == 0 && msg.toLowerCase() != "success") {
            res.status(500).json({error: msg, code: 500});
        } else {
            res.json({results: u2_latest_data})
        }
    }).catch((err) => {
        res.status(500).json({error: `Exception occured: ${err.toString()}`, code: 500});
    })
})

export { u2routes }