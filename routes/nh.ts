import { reverse } from "dns";
import * as express from "express";
import { nhFetchInfo, nhImagePathProxy, nhImageProxy, nhLatestDoujin, nhSearchDoujin } from "../utils/nh";
import { is_none } from "../utils/swissknife";
const nhroutes = express.Router();

nhroutes.use((req, res, next) => {
    res.header({
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS, HEAD"
    })
    next()
});

nhroutes.get("/i/:media_id/:img_num", (req, res) => {
    let image_path = `${req.params.media_id}/${req.params.img_num}`;
    nhImagePathProxy(image_path).then(([img_buf, mimes]) => {
        if (!Buffer.isBuffer(img_buf)) {
            res.status(404).json(img_buf)
        } else {
            res.set("Content-Type", mimes[0]);
            res.end(img_buf);
        }
    }).catch((err) => {
        console.error(err)
        res.status(500).json({"message": "Internal server error", "error": err.toString(), "status_code": 500});
    })
})

nhroutes.get("/t/:media_id/:img_num", (req, res) => {
    let image_path = `${req.params.media_id}/${req.params.img_num}`;
    nhImagePathProxy(image_path, true).then(([img_buf, mimes]) => {
        if (!Buffer.isBuffer(img_buf)) {
            res.status(404).json(img_buf)
        } else {
            res.set("Content-Type", mimes[0]);
            res.end(img_buf);
        }
    }).catch((err) => {
        console.error(err)
        res.status(500).json({"message": "Internal server error", "error": err.toString(), "status_code": 500});
    })
})

nhroutes.get("/image/:doujin_id/:page_num", (req, res) => {
    let doujin_id = req.params.doujin_id;
    let page_num = parseInt(req.params.page_num);
    if (isNaN(page_num)) {
        res.status(400).json({"status_code": 400, "message": "page number are incorrect"});
    } else {
        nhImageProxy(doujin_id, page_num).then(([img_buf, mimes, stat_code]) => {
            if (!Buffer.isBuffer(img_buf)) {
                res.status(stat_code).json(img_buf)
            } else {
                res.set("Content-Type", mimes[0]);
                res.end(img_buf);
            }
        }).catch((err) => {
            console.error(err)
            res.status(500).json({"message": "Internal server error", "error": err.toString(), "status_code": 500});
        })
    }
})

nhroutes.get("/info/:doujin_id", (req, res) => {
    let doujin_id = req.params.doujin_id;
    nhFetchInfo(doujin_id).then(([final_data, stat_code]) => {
        if (typeof final_data === "string") {
            res.status(stat_code).json(final_data);
        } else {
            res.json(final_data);
        }
    }).catch((err) => {
        console.error(err)
        res.status(500).json({"message": "Internal server error", "error": err.toString(), "status_code": 500});
    })
})

nhroutes.get("/latest", (req, res) => {
    var req_page = req.query.page;
    if (is_none(req_page)) {
        req_page = "1";
    }
    // @ts-ignore
    var page_num = parseInt(req_page);
    if (isNaN(page_num)) {
        page_num = 1;
    }
    if (page_num < 1) {
        page_num = 1
    }

    nhLatestDoujin(page_num).then(([doujin_results, stat_code]) => {
        if (stat_code != 200) {
            res.status(stat_code).json(doujin_results);
        } else {
            res.json(doujin_results);
        }
    }).catch((err) => {
        console.error(err)
        res.status(500).json({"message": "Internal server error", "error": err.toString(), "status_code": 500});
    })
})

nhroutes.get("/search", (req, res) => {
    var req_page = req.query.page;
    if (is_none(req_page)) {
        req_page = "1";
    }
    // @ts-ignore
    var page_num = parseInt(req_page);
    if (isNaN(page_num)) {
        page_num = 1;
    }
    if (page_num < 1) {
        page_num = 1
    }

    var search_query = req.query.q;
    if (is_none(search_query)) {
        search_query = req.query.query;
    }
    if (is_none(search_query)) {
        res.status(400).json({"message": "please provide `q` search query args", "status_code": 400});
    } else {
        // @ts-ignore
        search_query = decodeURIComponent(search_query);
        nhSearchDoujin(search_query, page_num).then(([doujin_results, stat_code]) => {
            if (stat_code != 200) {
                res.status(stat_code).json(doujin_results);
            } else {
                res.json(doujin_results);
            }
        }).catch((err) => {
            console.error(err)
            res.status(500).json({"message": "Internal server error", "error": err.toString(), "status_code": 500});
        })
    }
})

export { nhroutes };