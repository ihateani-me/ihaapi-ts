import * as express from "express";
import { ASCII2D, IQDB, SauceNAO } from "../utils/saucefinder";
import { fallbackNaN, getValueFromKey, is_none } from "../utils/swissknife";
const sauceroutes = express.Router()

sauceroutes.use((req, res, next) => {
    res.header({
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS, HEAD"
    })
    next()
});

/**
 * @swagger
 * /sauce/saucenao:
 *  get:
 *      summary: Get Image Sauce using SauceNAO
 *      description: This will return a possible image sauce match using SauceNAO as its backend.
 *      tags:
 *      - sauce_api
 *      parameters:
 *      - in: query
 *        name: url
 *        description: The image URL to check.
 *        required: true
 *        schema:
 *          type: string
 *      - in: query
 *        name: minsim
 *        description: The minimum similarity to be returned
 *        required: false
 *        schema:
 *          type: number
 *      - in: query
 *        name: numres
 *        description: Total maximum results to be received from SauceNAO
 *        required: false
 *        schema:
 *          type: number
 *      x-codeSamples:
 *      - lang: Python
 *        label: Python3
 *        source: |
 *           import requests
 *           res = requests.get("https://api.ihateani.me/sauce/saucenao", params={"url": "https://url.tld/image.png"})
 *           print(res.json())
 *      responses:
 *          200:
 *              description: The closest-matching sauce for provided image
 *              content:
 *                  application/json:
 *                      schema:
 *                          type: object
 *                          description: The closest-matching sauce for provided image
 *                          properties:
 *                              results:
 *                                  type: array
 *                                  items:
 *                                      $ref: '#/components/schemas/SauceFinderResultModel'
 *                              status_code:
 *                                  type: number
 *                                  description: HTTP Status Code
 *                                  example: 200
 *          400:
 *              description: Missing URL param
 *              content:
 *                  application/json:
 *                      schema:
 *                          type: object
 *                          properties:
 *                              error:
 *                                  type: string
 *                                  description: Why it failed to process.
 *                                  example: please provide image with `url` key in query parameters
 *                              code:
 *                                  type: number
 *                                  description: HTTP Status code
 *                                  example: 400
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
sauceroutes.get("/saucenao", (req, res) => {
    console.log("[Sauce:sn:get] GET request received.");
    let body_bag = req.query;
    let payload_url = getValueFromKey(body_bag, "url");
    let minsim = fallbackNaN(parseFloat, getValueFromKey(body_bag, "minsim", 60.0), 60.0);
    let numres = fallbackNaN(parseInt, getValueFromKey(body_bag, "numres", 6), 6);
    if (is_none(payload_url)) {
        res.status(400).json({"message": "please provide image with `url` key in query parameters", "status_code": 400});
    } else {
        payload_url = decodeURIComponent(payload_url);
        console.info("[Sauce:sn:get] Checking image source...");
        let saucer = new SauceNAO({"api_key": process.env.SAUCENAO_API_KEY, "minsim": minsim, "numres": numres});
        console.info("[Sauce:sn:get] Finding that tasty sauce...");
        saucer.getSauce(payload_url).then((sauce_results) => {
            console.info(`[Sauce:sn:get] Found ${sauce_results.length} matching sauce...`);
            res.json({results: sauce_results, status_code: 200});
        }).catch((err) => {
            res.status(500).json({message: `An internal error occured: ${err.toString()}`, status_code: 500});
        })
    }
})

/**
 * @swagger
 * /sauce/iqdb:
 *  get:
 *      summary: Get Image Sauce using IQDB
 *      description: This will return a possible image sauce match using IQDB as its backend.
 *      tags:
 *      - sauce_api
 *      parameters:
 *      - in: query
 *        name: url
 *        description: The image URL to check.
 *        required: true
 *        schema:
 *          type: string
 *      - in: query
 *        name: minsim
 *        description: The minimum similarity to be returned
 *        required: false
 *        schema:
 *          type: number
 *      x-codeSamples:
 *      - lang: Python
 *        label: Python3
 *        source: |
 *           import requests
 *           res = requests.get("https://api.ihateani.me/sauce/iqdb", params={"url": "https://url.tld/image.png"})
 *           print(res.json())
 *      responses:
 *          200:
 *              description: The closest-matching sauce for provided image
 *              content:
 *                  application/json:
 *                      schema:
 *                          type: object
 *                          description: The closest-matching sauce for provided image
 *                          properties:
 *                              results:
 *                                  type: array
 *                                  items:
 *                                      $ref: '#/components/schemas/SauceFinderResultModel'
 *                              status_code:
 *                                  type: number
 *                                  description: HTTP Status Code
 *                                  example: 200
 *          400:
 *              description: Missing URL param
 *              content:
 *                  application/json:
 *                      schema:
 *                          type: object
 *                          properties:
 *                              error:
 *                                  type: string
 *                                  description: Why it failed to process.
 *                                  example: please provide image with `url` key in query parameters
 *                              code:
 *                                  type: number
 *                                  description: HTTP Status code
 *                                  example: 400
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
sauceroutes.get("/iqdb", (req, res) => {
    console.log("[Sauce:iqdb:get] GET request received.");
    let body_bag = req.query;
    let payload_url = getValueFromKey(body_bag, "url");
    let minsim = fallbackNaN(parseFloat, getValueFromKey(body_bag, "minsim", 50.0), 50.0);
    if (is_none(payload_url)) {
        res.status(400).json({"message": "please provide image with `url` key in query parameters", "status_code": 400});
    } else {
        payload_url = decodeURIComponent(payload_url);
        console.info("[Sauce:iqdb:get] Checking image source...");
        let saucer = new IQDB(minsim);
        console.info("[Sauce:iqdb:get] Finding that tasty sauce...");
        saucer.getSauce(payload_url).then((sauce_results) => {
            console.info(`[Sauce:iqdb:get] Found ${sauce_results.length} matching sauce...`);
            res.json({results: sauce_results, status_code: 200});
        }).catch((err) => {
            res.status(500).json({message: `An internal error occured: ${err.toString()}`, status_code: 500});
        })
    }
})

/**
 * @swagger
 * /sauce/ascii2d:
 *  get:
 *      summary: Get Image Sauce using ASCII2D
 *      description: This will return a possible image sauce match using ASCII2D as its backend.
 *      tags:
 *      - sauce_api
 *      parameters:
 *      - in: query
 *        name: url
 *        description: The image URL to check.
 *        required: true
 *        schema:
 *          type: string
 *      - in: query
 *        name: maxres
 *        description: The maximum results to be returned.
 *        required: false
 *        schema:
 *          type: number
 *      x-codeSamples:
 *      - lang: Python
 *        label: Python3
 *        source: |
 *           import requests
 *           res = requests.get("https://api.ihateani.me/sauce/ascii2d", params={"url": "https://url.tld/image.png"})
 *           print(res.json())
 *      responses:
 *          200:
 *              description: The closest-matching sauce for provided image
 *              content:
 *                  application/json:
 *                      schema:
 *                          type: object
 *                          description: The closest-matching sauce for provided image
 *                          properties:
 *                              results:
 *                                  type: array
 *                                  items:
 *                                      $ref: '#/components/schemas/SauceFinderResultModel'
 *                              status_code:
 *                                  type: number
 *                                  description: HTTP Status Code
 *                                  example: 200
 *          400:
 *              description: Missing URL param
 *              content:
 *                  application/json:
 *                      schema:
 *                          type: object
 *                          properties:
 *                              error:
 *                                  type: string
 *                                  description: Why it failed to process.
 *                                  example: please provide image with `url` key in query parameters
 *                              code:
 *                                  type: number
 *                                  description: HTTP Status code
 *                                  example: 400
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
sauceroutes.get("/ascii2d", (req, res) => {
    console.log("[Sauce:ascii2d:get] GET request received.");
    let body_bag = req.query;
    let payload_url = getValueFromKey(body_bag, "url");
    let maxres = fallbackNaN(parseInt, getValueFromKey(body_bag, "minsim", 2), 2);
    if (is_none(payload_url)) {
        res.status(400).json({"message": "please provide image with `url` key in query parameters", "status_code": 400});
    } else {
        payload_url = decodeURIComponent(payload_url);
        console.info("[Sauce:ascii2d:get] Checking image source...");
        let saucer = new ASCII2D(maxres);
        console.info("[Sauce:ascii2d:get] Finding that tasty sauce...");
        saucer.getSauce(payload_url).then((sauce_results) => {
            console.info(`[Sauce:ascii2d:get] Found ${sauce_results.length} matching sauce...`);
            res.json({results: sauce_results, status_code: 200});
        }).catch((err) => {
            res.status(500).json({message: `An internal error occured: ${err.toString()}`, status_code: 500});
        })
    }
})

sauceroutes.use(express.json());

/**
 * @swagger
 * /sauce/saucenao:
 *  post:
 *      summary: Get Image Sauce using SauceNAO
 *      description: This will return a possible image sauce match using SauceNAO as its backend.
 *      tags:
 *      - sauce_api
 *      requestBody:
 *          content:
 *              application/json:
 *                  schema:
 *                      type: object
 *                      required: ["url"]
 *                      properties:
 *                          url:
 *                              type: string
 *                              description: The image URL to check.
 *                          minsim:
 *                              type: number
 *                              description: The minimum similarity to be returned
 *                          numres:
 *                              type: number
 *                              description: Total maximum results to be received from SauceNAO
 *      x-codeSamples:
 *      - lang: Python
 *        label: Python3
 *        source: |
 *           import requests
 *           res = requests.post("https://api.ihateani.me/sauce/saucenao", json={"url": "https://url.tld/image.png"})
 *           print(res.json())
 *      responses:
 *          200:
 *              description: The closest-matching sauce for provided image
 *              content:
 *                  application/json:
 *                      schema:
 *                          type: object
 *                          description: The closest-matching sauce for provided image
 *                          properties:
 *                              results:
 *                                  type: array
 *                                  items:
 *                                      $ref: '#/components/schemas/SauceFinderResultModel'
 *                              status_code:
 *                                  type: number
 *                                  description: HTTP Status Code
 *                                  example: 200
 *          400:
 *              description: Missing URL param
 *              content:
 *                  application/json:
 *                      schema:
 *                          type: object
 *                          properties:
 *                              error:
 *                                  type: string
 *                                  description: Why it failed to process.
 *                                  example: please provide data with `url` key
 *                              code:
 *                                  type: number
 *                                  description: HTTP Status code
 *                                  example: 400
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
sauceroutes.post("/saucenao", (req, res) => {
    console.log("[Sauce:sn:post] POST request received.");
    let body_bag = req.body;
    let payload_url = getValueFromKey(body_bag, "url");
    let minsim = fallbackNaN(parseFloat, getValueFromKey(body_bag, "minsim", 60.0), 60.0);
    let numres = fallbackNaN(parseInt, getValueFromKey(body_bag, "numres", 6), 6);
    if (is_none(payload_url)) {
        res.status(400).json({"message": "please provide data with `url` key", "status_code": 400});
    } else {
        console.info("[Sauce:sn:post] Checking image source...");
        let saucer = new SauceNAO({"api_key": process.env.SAUCENAO_API_KEY, "minsim": minsim, "numres": numres});
        console.info("[Sauce:sn:post] Finding that tasty sauce...");
        saucer.getSauce(payload_url).then((sauce_results) => {
            console.info(`[Sauce:sn:post] Found ${sauce_results.length} matching sauce...`);
            res.json({results: sauce_results, status_code: 200});
        }).catch((err) => {
            res.status(500).json({message: `An internal error occured: ${err.toString()}`, status_code: 500});
        })
    }
});

/**
 * @swagger
 * /sauce/iqdb:
 *  post:
 *      summary: Get Image Sauce using IQDB
 *      description: This will return a possible image sauce match using IQDB as its backend.
 *      tags:
 *      - sauce_api
 *      requestBody:
 *          content:
 *              application/json:
 *                  schema:
 *                      type: object
 *                      required: ["url"]
 *                      properties:
 *                          url:
 *                              type: string
 *                              description: The image URL to check.
 *                          minsim:
 *                              type: number
 *                              description: The minimum similarity to be returned
 *      x-codeSamples:
 *      - lang: Python
 *        label: Python3
 *        source: |
 *           import requests
 *           res = requests.post("https://api.ihateani.me/sauce/iqdb", json={"url": "https://url.tld/image.png"})
 *           print(res.json())
 *      responses:
 *          200:
 *              description: The closest-matching sauce for provided image
 *              content:
 *                  application/json:
 *                      schema:
 *                          type: object
 *                          description: The closest-matching sauce for provided image
 *                          properties:
 *                              results:
 *                                  type: array
 *                                  items:
 *                                      $ref: '#/components/schemas/SauceFinderResultModel'
 *                              status_code:
 *                                  type: number
 *                                  description: HTTP Status Code
 *                                  example: 200
 *          400:
 *              description: Missing URL param
 *              content:
 *                  application/json:
 *                      schema:
 *                          type: object
 *                          properties:
 *                              error:
 *                                  type: string
 *                                  description: Why it failed to process.
 *                                  example: please provide data with `url` key
 *                              code:
 *                                  type: number
 *                                  description: HTTP Status code
 *                                  example: 400
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
sauceroutes.post("/iqdb", (req, res) => {
    console.log("[Sauce:iqdb:post] POST request received.");
    let body_bag = req.body;
    let payload_url = getValueFromKey(body_bag, "url");
    let minsim = fallbackNaN(parseFloat, getValueFromKey(body_bag, "minsim", 60.0), 60.0);
    if (is_none(payload_url)) {
        res.status(400).json({"message": "please provide data with `url` key", "status_code": 400});
    } else {
        console.info("[Sauce:iqdb:post] Checking image source...");
        let saucer = new IQDB(minsim);
        console.info("[Sauce:iqdb:post] Finding that tasty sauce...");
        saucer.getSauce(payload_url).then((sauce_results) => {
            console.info(`[Sauce:iqdb:post] Found ${sauce_results.length} matching sauce...`);
            res.json({results: sauce_results, status_code: 200});
        }).catch((err) => {
            res.status(500).json({message: `An internal error occured: ${err.toString()}`, status_code: 500});
        })
    }
});

/**
 * @swagger
 * /sauce/ascii2d:
 *  post:
 *      summary: Get Image Sauce using ASCII2D
 *      description: This will return a possible image sauce match using ASCII2D as its backend.
 *      tags:
 *      - sauce_api
 *      requestBody:
 *          content:
 *              application/json:
 *                  schema:
 *                      type: object
 *                      required: ["url"]
 *                      properties:
 *                          url:
 *                              type: string
 *                              description: The image URL to check.
 *                          maxres:
 *                              type: number
 *                              description: The maximum results to be returned.
 *      x-codeSamples:
 *      - lang: Python
 *        label: Python3
 *        source: |
 *           import requests
 *           res = requests.post("https://api.ihateani.me/sauce/ascii2d", json={"url": "https://url.tld/image.png"})
 *           print(res.json())
 *      responses:
 *          200:
 *              description: The closest-matching sauce for provided image
 *              content:
 *                  application/json:
 *                      schema:
 *                          type: object
 *                          description: The closest-matching sauce for provided image
 *                          properties:
 *                              results:
 *                                  type: array
 *                                  items:
 *                                      $ref: '#/components/schemas/SauceFinderResultModel'
 *                              status_code:
 *                                  type: number
 *                                  description: HTTP Status Code
 *                                  example: 200
 *          400:
 *              description: Missing URL param
 *              content:
 *                  application/json:
 *                      schema:
 *                          type: object
 *                          properties:
 *                              error:
 *                                  type: string
 *                                  description: Why it failed to process.
 *                                  example: please provide data with `url` key
 *                              code:
 *                                  type: number
 *                                  description: HTTP Status code
 *                                  example: 400
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
sauceroutes.post("/ascii2d", (req, res) => {
    console.log("[Sauce:ascii2d:post] POST request received.");
    let body_bag = req.body;
    let payload_url = getValueFromKey(body_bag, "url");
    let maxres = fallbackNaN(parseInt, getValueFromKey(body_bag, "maxres", 2), 2);
    if (is_none(payload_url)) {
        res.status(400).json({"message": "please provide data with `url` key", "status_code": 400});
    } else {
        console.info("[Sauce:iqdb:post] Checking image source...");
        let saucer = new ASCII2D(maxres);
        console.info("[Sauce:ascii2d:post] Finding that tasty sauce...");
        saucer.getSauce(payload_url).then((sauce_results) => {
            console.info(`[Sauce:ascii2d:post] Found ${sauce_results.length} matching sauce...`);
            res.json({results: sauce_results, status_code: 200});
        }).catch((err) => {
            res.status(500).json({message: `An internal error occured: ${err.toString()}`, status_code: 500});
        })
    }
});

export { sauceroutes };