import { resolveSoa } from "dns";
import * as express from "express";
import { fetch_steam_user_info } from "../utils/steam";

const gamesroutes = express.Router();

gamesroutes.use((req, res, next) => {
    res.header({
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS, HEAD"
    });
    next();
});

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