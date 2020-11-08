import { reverse } from "dns";
import * as express from "express";
import { nhImagePathProxy } from "../utils/nh";
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
        res.status(500).json({"message": "Internal server error"});
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
        res.status(500).json({"message": "Internal server error"});
    })
})

export { nhroutes };