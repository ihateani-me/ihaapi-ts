import * as express from "express";
import { getValueFromKey, is_none } from "../utils/swissknife";
import { checkNewestOffers, checkNewestRSS, getU2TorrentOffers, getU2TorrentsRSS } from "../utils/u2scrapper";
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
});

u2routes.use(express.json());

u2routes.post("/latest", (req, res) => {
    let req_check = req.body;
    let MAIN_API_KEY = process.env.U2_API_KEY;
    let user_api_key = getValueFromKey(req_check, "api_key");
    let user_options = getValueFromKey(req_check, "settings", "cat14=1&cat15=1&cat16=1&cat30=1&cat40=1&rows=10");
    if (is_none(user_api_key)) {
        res.status(400).json(
            {error: "please provide `api_key`", code: 400}
        )
    } else if (user_api_key != MAIN_API_KEY) {
        res.status(401).json(
            {error: "unknown `api_key`", code: 401}
        )
    } else if (user_api_key == MAIN_API_KEY) {
        checkNewestRSS(user_options).then((u2_latest_data) => {
            res.json({results: u2_latest_data, code: 200});
        }).catch((err) => {
            res.status(500).json({error: `Exception occured: ${err.toString()}`, code: 500});
        })
    } else {
        res.status(401).json(
            {error: "unknown `api_key`", code: 401}
        )
    }
});

u2routes.post("/offers", (req, res) => {
    let req_check = req.body;
    let MAIN_API_KEY = process.env.U2_API_KEY;
    let user_api_key = getValueFromKey(req_check, "api_key");
    if (is_none(user_api_key)) {
        res.status(400).json(
            {error: "please provide `api_key`", code: 400}
        )
    } else if (user_api_key != MAIN_API_KEY) {
        res.status(401).json(
            {error: "unknown `api_key`", code: 401}
        )
    } else if (user_api_key == MAIN_API_KEY) {
        checkNewestOffers().then((u2_latest_data) => {
            res.json({results: u2_latest_data, code: 200});
        }).catch((err) => {
            res.status(500).json({error: `Exception occured: ${err.toString()}`, code: 500});
        })
    } else {
        res.status(401).json(
            {error: "unknown `api_key`", code: 401}
        )
    }
});

export { u2routes }