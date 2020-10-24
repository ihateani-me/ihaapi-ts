import * as express from "express";
import { hltb_search } from "../utils/hltb";
import { fetch_steam_user_info } from "../utils/steam";
import { is_none } from "../utils/swissknife";

const gamesroutes = express.Router();

gamesroutes.use((req, res, next) => {
    res.header({
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS, HEAD"
    });
    next();
});

gamesroutes.get("/hltb", (req, res) => {
    let search_query = req.query.q;
    if (is_none(search_query)) {
        search_query = req.query.query;
        if (is_none(search_query)) {
            res.status(400).json(
                {
                    "error": "please provide `q` args on the url",
                    "example": "/games/hltb?q=ori and the",
                    "code": 400
                }
            );
        };
    } else {
        console.info(`[Games:hltb] Searching ${search_query}`);
        let req_page = req.query.p;
        if (is_none(req_page)) {
            req_page = "1";
        }
        // @ts-ignore
        let page_num = parseInt(req_page);
        if (isNaN(page_num)) {
            page_num = 1;
        }
        // @ts-ignore
        search_query = decodeURIComponent(search_query);
        try {
            hltb_search(search_query, page_num).then(([hltb_results, hltb_message]) => {
                if (hltb_results.length == 0) {
                    var err_code = 500
                    if (hltb_message.toLowerCase().includes("no results")) {
                        err_code = 404
                    }
                    res.status(err_code).json(
                        {
                            "error": hltb_message,
                            "code": err_code
                        }
                    )
                }
                res.json({"results": hltb_results});
            }).catch((error) => {
                console.error(error);
                res.status(500).json({message: "Internal server error occured."});
            });
        } catch (err) {
            console.error(err);
            res.status(500).json({message: "Internal server error occured."});
        }
    }
})

gamesroutes.get("/steamuser/:user_id", (req, res) => {
    let user_id = req.params.user_id;
    console.log("[Games:steamuser] Querying " + user_id);
    fetch_steam_user_info(user_id).then(function (value) {
        let user_data = value[0];
        let message = value[1];
        if (message.toLowerCase() !== "success") {
            var err_code = 500;
            if (message.includes("resolve vanity")) {
                err_code = 404;
            }
            res.status(err_code).json({"error": message, "code": err_code});
        } else {
            res.json(user_data);
        }
    });
})

export { gamesroutes };