import * as express from "express";

import { getValueFromKey, is_none } from "../utils/swissknife";
import { checkNewestOffers, checkNewestRSS, getU2TorrentOffers, getU2TorrentsRSS } from "../utils/u2scrapper";

import config from "../config";

const U2Routes = express.Router();

/**
 * @swagger
 * /u2/latest:
 *  get:
 *      summary: Get Latest U2 Torrents
 *      description: |
 *          This will fetch the latest U2 Torrents from category:<br>
 *          - DVDISO
 *          - BDMV
 *          - HDTV Rip
 *          - Lossless Music
 *          - Others
 *
 *          Maximum of 10 results.
 *      tags:
 *      - u2_api
 *      x-codeSamples:
 *      - lang: Python
 *        label: Python3
 *        source: |
 *           import requests
 *           res = requests.get("https://api.ihateani.me/u2/latest")
 *           print(res.json())
 *      responses:
 *          200:
 *              description: Latest 10 U2 Torrents
 *              content:
 *                  application/json:
 *                      schema:
 *                          type: object
 *                          description: Latest 10 U2 Torrents
 *                          properties:
 *                              results:
 *                                  type: array
 *                                  description: Array of torrents
 *                                  items:
 *                                      type: object
 *                                      properties:
 *                                         title:
 *                                             type: string
 *                                             description: A parsed title of the torrents.
 *                                         original_title:
 *                                             type: string
 *                                             description: The original title returned from the RSS (before parsing).
 *                                         category:
 *                                             type: string
 *                                             description: The torrent category.
 *                                             enum:
 *                                             - U2Rip
 *                                             - U2RBD
 *                                             - WebDL
 *                                             - BDRip
 *                                             - DVDRip
 *                                             - HDTVRip
 *                                             - DVDISO
 *                                             - BDMV
 *                                             - LQRip
 *                                             - U2CSM
 *                                             - U2DIY
 *                                             - Raw Books
 *                                             - Books CH
 *                                             - Books TW
 *                                             - Lossless Music
 *                                             - Others
 *                                         link:
 *                                             type: string
 *                                             description: The URL of the torrent page.
 *                                         download_link:
 *                                             type: string
 *                                             description: The URL of the torrent download (doesn't include pass key).
 *                                         author:
 *                                             type: string
 *                                             description: The torrent uploader.
 *                                         size:
 *                                             type: string
 *                                             description: The torrent size.
 *                                         publishedAt:
 *                                             type: string
 *                                             description: The torrent published time in UTC+7.
 *                                         pubSort:
 *                                             type: integer
 *                                             description: The torrent published time in unix epoch time.
 *          'default':
 *              description: An error occured
 *              content:
 *                  application/json:
 *                      schema:
 *                          type: object
 *                          properties:
 *                              error:
 *                                  type: string
 *                                  description: Why it failed to process.
 *                              code:
 *                                  type: number
 *                                  description: HTTP Status code
 */
U2Routes.get("/latest", (req, res) => {
    if (is_none(config.u2.passkey)) {
        res.status(501).json({ error: "Administrator haven't enabled U2 RSS support!", code: 501 });
    } else {
        getU2TorrentsRSS("cat14=1&cat15=1&cat16=1&cat30=1&cat40=1&rows=10")
            .then(([u2_latest_data, msg]) => {
                if (u2_latest_data.length == 0 && msg.toLowerCase() != "success") {
                    res.status(500).json({ error: msg, code: 500 });
                } else {
                    res.json({ results: u2_latest_data });
                }
            })
            .catch((err) => {
                res.status(500).json({ error: `Exception occured: ${err.toString()}`, code: 500 });
            });
    }
});

/**
 * @swagger
 * /u2/offers:
 *  get:
 *      summary: Get Latest U2 Torrents Offers
 *      description: This will fetch the latest available U2 Torrents Offers
 *      tags:
 *      - u2_api
 *      x-codeSamples:
 *      - lang: Python
 *        label: Python3
 *        source: |
 *           import requests
 *           res = requests.get("https://api.ihateani.me/u2/offers")
 *           print(res.json())
 *      responses:
 *          200:
 *              description: Latest U2 Torrents Offers
 *              content:
 *                  application/json:
 *                      schema:
 *                          type: object
 *                          description: Latest U2 Torrents Offers
 *                          properties:
 *                              results:
 *                                  type: array
 *                                  description: Array of torrents offers
 *                                  items:
 *                                      type: object
 *                                      properties:
 *                                         title:
 *                                             type: string
 *                                             description: A parsed title of the torrents.
 *                                         original_title:
 *                                             type: string
 *                                             description: The original title returned from the RSS (before parsing).
 *                                         category:
 *                                             type: string
 *                                             description: The torrent category.
 *                                             enum:
 *                                             - U2Rip
 *                                             - U2RBD
 *                                             - WebDL
 *                                             - BDRip
 *                                             - DVDRip
 *                                             - HDTVRip
 *                                             - DVDISO
 *                                             - BDMV
 *                                             - LQRip
 *                                             - U2CSM
 *                                             - U2DIY
 *                                             - Raw Books
 *                                             - Books CH
 *                                             - Books TW
 *                                             - Lossless Music
 *                                             - Others
 *                                         link:
 *                                             type: string
 *                                             description: The URL of the torrent page.
 *                                         vote_url:
 *                                             type: string
 *                                             description: The URL of the offer vote page.
 *                                         vote_data:
 *                                             type: object
 *                                             properties:
 *                                                  for:
 *                                                      type: number
 *                                                      description: The amount of vote agreeing on this offer
 *                                                  against:
 *                                                      type: number
 *                                                      description: The amount of vote declining on this offer
 *                                         author:
 *                                             type: string
 *                                             description: The torrent uploader.
 *                                         size:
 *                                             type: string
 *                                             description: The torrent size.
 *                                         posted:
 *                                             type: string
 *                                             description: The offer published time in UTC+7.
 *                                         timeout:
 *                                             type: string
 *                                             description: The offer expiry time in UTC+7.
 *          'default':
 *              description: An error occured
 *              content:
 *                  application/json:
 *                      schema:
 *                          type: object
 *                          properties:
 *                              error:
 *                                  type: string
 *                                  description: Why it failed to process.
 *                              code:
 *                                  type: number
 *                                  description: HTTP Status code
 */
U2Routes.get("/offers", (req, res) => {
    if (is_none(config.u2.cookies)) {
        res.status(501).json({ error: "Administrator haven't enabled U2 offers support!", code: 501 });
    } else {
        getU2TorrentOffers()
            .then(([u2_latest_data, msg]) => {
                if (u2_latest_data.length == 0 && msg.toLowerCase() != "success") {
                    res.status(500).json({ error: msg, code: 500 });
                } else {
                    res.json({ results: u2_latest_data });
                }
            })
            .catch((err) => {
                res.status(500).json({ error: `Exception occured: ${err.toString()}`, code: 500 });
            });
    }
});

U2Routes.use(express.json());

/**
 * @swagger
 * /u2/latest:
 *  post:
 *      summary: Get Latest Non-Fetched U2 Torrents
 *      description: |
 *          This will fetch ONLY the non-fetched one or a new entry to the database.<br>
 *          This also use a default category if not spcified by a json params:<br>
 *          - DVDISO
 *          - BDMV
 *          - HDTV Rip
 *          - Lossless Music
 *          - Others
 *      tags:
 *      - u2_api
 *      requestBody:
 *          content:
 *              application/json:
 *                  schema:
 *                      type: object
 *                      required: ["api_key"]
 *                      properties:
 *                          api_key:
 *                              type: string
 *                              description: The required API Key to authenticate.
 *                          settings:
 *                              type: string
 *                              description: The settings to use, this is formatted like a query parameter without the `?` mark at the start.
 *                              example: cat14=1&cat15=1&cat16=1&cat30=1&cat40=1&rows=20
 *      x-codeSamples:
 *      - lang: Python
 *        label: Python3
 *        source: |
 *           import requests
 *           res = requests.post("https://api.ihateani.me/u2/offers", json={"api_key": "validapikey"})
 *           print(res.json())
 *      responses:
 *          200:
 *              description: Latest Non-Fetched U2 Torrents
 *              content:
 *                  application/json:
 *                      schema:
 *                          type: object
 *                          description: Latest Non-Fetched U2 Torrents
 *                          properties:
 *                              results:
 *                                  type: array
 *                                  description: Array of torrents
 *                                  items:
 *                                      type: object
 *                                      properties:
 *                                         title:
 *                                             type: string
 *                                             description: A parsed title of the torrents.
 *                                         original_title:
 *                                             type: string
 *                                             description: The original title returned from the RSS (before parsing).
 *                                         category:
 *                                             type: string
 *                                             description: The torrent category.
 *                                             enum:
 *                                             - U2Rip
 *                                             - U2RBD
 *                                             - WebDL
 *                                             - BDRip
 *                                             - DVDRip
 *                                             - HDTVRip
 *                                             - DVDISO
 *                                             - BDMV
 *                                             - LQRip
 *                                             - U2CSM
 *                                             - U2DIY
 *                                             - Raw Books
 *                                             - Books CH
 *                                             - Books TW
 *                                             - Lossless Music
 *                                             - Others
 *                                         link:
 *                                             type: string
 *                                             description: The URL of the torrent page.
 *                                         download_link:
 *                                             type: string
 *                                             description: The URL of the torrent download (doesn't include pass key).
 *                                         author:
 *                                             type: string
 *                                             description: The torrent uploader.
 *                                         size:
 *                                             type: string
 *                                             description: The torrent size.
 *                                         publishedAt:
 *                                             type: string
 *                                             description: The torrent published time in UTC+7.
 *                                         pubSort:
 *                                             type: integer
 *                                             description: The torrent published time in unix epoch time.
 *          400:
 *              description: Missing API Key
 *              content:
 *                  application/json:
 *                      schema:
 *                          type: object
 *                          properties:
 *                              error:
 *                                  type: string
 *                                  description: Why it failed to process.
 *                                  example: please provide `api_key`
 *                              code:
 *                                  type: number
 *                                  description: HTTP Status code
 *                                  example: 400
 *          401:
 *              description: Wrong API Key
 *              content:
 *                  application/json:
 *                      schema:
 *                          type: object
 *                          properties:
 *                              error:
 *                                  type: string
 *                                  description: Why it failed to process.
 *                                  example: unknown `api_key`
 *                              code:
 *                                  type: number
 *                                  description: HTTP Status code
 *                                  example: 401
 *          'default':
 *              description: An error occured
 *              content:
 *                  application/json:
 *                      schema:
 *                          type: object
 *                          properties:
 *                              error:
 *                                  type: string
 *                                  description: Why it failed to process.
 *                              code:
 *                                  type: number
 *                                  description: HTTP Status code
 */
U2Routes.post("/latest", (req, res) => {
    if (is_none(config.u2.passkey)) {
        res.status(501).json({ error: "Administrator haven't enabled U2 RSS support!", code: 501 });
    } else {
        const req_check = req.body;
        const MAIN_API_KEY = config.secure_password;
        const user_api_key = getValueFromKey(req_check, "api_key");
        const user_options = getValueFromKey(
            req_check,
            "settings",
            "cat14=1&cat15=1&cat16=1&cat30=1&cat40=1&rows=10"
        );
        if (is_none(user_api_key)) {
            res.status(400).json({ error: "please provide `api_key`", code: 400 });
        } else if (user_api_key != MAIN_API_KEY) {
            res.status(401).json({ error: "unknown `api_key`", code: 401 });
        } else if (user_api_key == MAIN_API_KEY) {
            checkNewestRSS(user_options)
                .then((u2_latest_data) => {
                    res.json({ results: u2_latest_data, code: 200 });
                })
                .catch((err) => {
                    res.status(500).json({ error: `Exception occured: ${err.toString()}`, code: 500 });
                });
        } else {
            res.status(401).json({ error: "unknown `api_key`", code: 401 });
        }
    }
});

/**
 * @swagger
 * /u2/offers:
 *  post:
 *      summary: Get Latest Non-Fetched U2 Torrents Offers
 *      description: This will fetch ONLY the non-fetched one or a new entry to the database.
 *      tags:
 *      - u2_api
 *      requestBody:
 *          content:
 *              application/json:
 *                  schema:
 *                      type: object
 *                      required: ["api_key"]
 *                      properties:
 *                          api_key:
 *                              type: string
 *                              description: The required API Key to authenticate.
 *      x-codeSamples:
 *      - lang: Python
 *        label: Python3
 *        source: |
 *           import requests
 *           res = requests.post("https://api.ihateani.me/u2/offers", json={"api_key": "validapikey"})
 *           print(res.json())
 *      responses:
 *          200:
 *              description: Latest Non-Fetched U2 Torrents Offers
 *              content:
 *                  application/json:
 *                      schema:
 *                          type: object
 *                          description: Latest Non-Fetched U2 Torrents Offers
 *                          properties:
 *                              results:
 *                                  type: array
 *                                  description: Array of torrents offers
 *                                  items:
 *                                      type: object
 *                                      properties:
 *                                         title:
 *                                             type: string
 *                                             description: A parsed title of the torrents.
 *                                         original_title:
 *                                             type: string
 *                                             description: The original title returned from the RSS (before parsing).
 *                                         category:
 *                                             type: string
 *                                             description: The torrent category.
 *                                             enum:
 *                                             - U2Rip
 *                                             - U2RBD
 *                                             - WebDL
 *                                             - BDRip
 *                                             - DVDRip
 *                                             - HDTVRip
 *                                             - DVDISO
 *                                             - BDMV
 *                                             - LQRip
 *                                             - U2CSM
 *                                             - U2DIY
 *                                             - Raw Books
 *                                             - Books CH
 *                                             - Books TW
 *                                             - Lossless Music
 *                                             - Others
 *                                         link:
 *                                             type: string
 *                                             description: The URL of the torrent page.
 *                                         vote_url:
 *                                             type: string
 *                                             description: The URL of the offer vote page.
 *                                         vote_data:
 *                                             type: object
 *                                             properties:
 *                                                  for:
 *                                                      type: number
 *                                                      description: The amount of vote agreeing on this offer
 *                                                  against:
 *                                                      type: number
 *                                                      description: The amount of vote declining on this offer
 *                                         author:
 *                                             type: string
 *                                             description: The torrent uploader.
 *                                         size:
 *                                             type: string
 *                                             description: The torrent size.
 *                                         posted:
 *                                             type: string
 *                                             description: The offer published time in UTC+7.
 *                                         timeout:
 *                                             type: string
 *                                             description: The offer expiry time in UTC+7.
 *          400:
 *              description: Missing API Key
 *              content:
 *                  application/json:
 *                      schema:
 *                          type: object
 *                          properties:
 *                              error:
 *                                  type: string
 *                                  description: Why it failed to process.
 *                                  example: please provide `api_key`
 *                              code:
 *                                  type: number
 *                                  description: HTTP Status code
 *                                  example: 400
 *          401:
 *              description: Wrong API Key
 *              content:
 *                  application/json:
 *                      schema:
 *                          type: object
 *                          properties:
 *                              error:
 *                                  type: string
 *                                  description: Why it failed to process.
 *                                  example: unknown `api_key`
 *                              code:
 *                                  type: number
 *                                  description: HTTP Status code
 *                                  example: 401
 *          'default':
 *              description: An error occured
 *              content:
 *                  application/json:
 *                      schema:
 *                          type: object
 *                          properties:
 *                              error:
 *                                  type: string
 *                                  description: Why it failed to process.
 *                              code:
 *                                  type: number
 *                                  description: HTTP Status code
 */
U2Routes.post("/offers", (req, res) => {
    if (is_none(config.u2.cookies)) {
        res.status(501).json({ error: "Administrator haven't enabled U2 Offers support!", code: 501 });
    } else {
        const req_check = req.body;
        const MAIN_API_KEY = config.secure_password;
        const user_api_key = getValueFromKey(req_check, "api_key");
        if (is_none(user_api_key)) {
            res.status(400).json({ error: "please provide `api_key`", code: 400 });
        } else if (user_api_key != MAIN_API_KEY) {
            res.status(401).json({ error: "unknown `api_key`", code: 401 });
        } else if (user_api_key == MAIN_API_KEY) {
            checkNewestOffers()
                .then((u2_latest_data) => {
                    res.json({ results: u2_latest_data, code: 200 });
                })
                .catch((err) => {
                    res.status(500).json({ error: `Exception occured: ${err.toString()}`, code: 500 });
                });
        } else {
            res.status(401).json({ error: "unknown `api_key`", code: 401 });
        }
    }
});

export { U2Routes };
