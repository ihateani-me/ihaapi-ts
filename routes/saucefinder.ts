import * as express from "express";
import { ASCII2D, IQDB, SauceNAO, multiSauceFinder } from "../utils/saucefinder";
import { fallbackNaN, getValueFromKey, is_none, map_bool } from "../utils/swissknife";
import { logger as TopLogger } from "../utils/logger";
const MainLogger = TopLogger.child({cls: "Routes.SauceFinder"});
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
 *      deprecated: true
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
    const logger = MainLogger.child({fn: "SauceNAO.get"});
    logger.info("GET request received.");
    let body_bag = req.query;
    let payload_url = getValueFromKey(body_bag, "url");
    let minsim = fallbackNaN(parseFloat, getValueFromKey(body_bag, "minsim", 60.0), 60.0);
    let numres = fallbackNaN(parseInt, getValueFromKey(body_bag, "numres", 6), 6);
    if (is_none(payload_url)) {
        res.status(400).json({"message": "please provide image with `url` key in query parameters", "status_code": 400});
    } else {
        payload_url = decodeURIComponent(payload_url);
        logger.info("Checking image source...");
        let saucer = new SauceNAO({"api_key": process.env.SAUCENAO_API_KEY, "minsim": minsim, "numres": numres});
        logger.info("Finding that tasty sauce...");
        saucer.getSauce(payload_url).then((sauce_results) => {
            logger.info(`Found ${sauce_results.length} matching sauce...`);
            res.json({notice: "API will be deprecated at 31st January 2021, please use v2 endpoint here: `/v2/graphql`", results: sauce_results, status_code: 200});
        }).catch((err) => {
            res.status(500).json({message: `An internal error occured: ${err.toString()}`, status_code: 500});
        })
    }
})

/**
 * @swagger
 * /sauce/iqdb:
 *  get:
 *      deprecated: true
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
    const logger = MainLogger.child({fn: "IQDB.get"});
    logger.info("GET request received.");
    let body_bag = req.query;
    let payload_url = getValueFromKey(body_bag, "url");
    let minsim = fallbackNaN(parseFloat, getValueFromKey(body_bag, "minsim", 50.0), 50.0);
    if (is_none(payload_url)) {
        res.status(400).json({"message": "please provide image with `url` key in query parameters", "status_code": 400});
    } else {
        payload_url = decodeURIComponent(payload_url);
        logger.info("Checking image source...");
        let saucer = new IQDB(minsim);
        logger.info("Finding that tasty sauce...");
        saucer.getSauce(payload_url).then((sauce_results) => {
            logger.info(`Found ${sauce_results.length} matching sauce...`);
            res.json({notice: "API will be deprecated at 31st January 2021, please use v2 endpoint here: `/v2/graphql`", results: sauce_results, status_code: 200});
        }).catch((err) => {
            res.status(500).json({message: `An internal error occured: ${err.toString()}`, status_code: 500});
        })
    }
})

/**
 * @swagger
 * /sauce/ascii2d:
 *  get:
 *      deprecated: true
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
    const logger = MainLogger.child({fn: "ASCII2D.get"});
    logger.info("GET request received.");
    let body_bag = req.query;
    let payload_url = getValueFromKey(body_bag, "url");
    let maxres = fallbackNaN(parseInt, getValueFromKey(body_bag, "maxres", 2), 2);
    if (is_none(payload_url)) {
        res.status(400).json({"message": "please provide image with `url` key in query parameters", "status_code": 400});
    } else {
        payload_url = decodeURIComponent(payload_url);
        logger.info("Checking image source...");
        let saucer = new ASCII2D(maxres);
        logger.info("Finding that tasty sauce...");
        saucer.getSauce(payload_url).then((sauce_results) => {
            logger.info(`Found ${sauce_results.length} matching sauce...`);
            res.json({notice: "API will be deprecated at 31st January 2021, please use v2 endpoint here: `/v2/graphql`", results: sauce_results, status_code: 200});
        }).catch((err) => {
            res.status(500).json({message: `An internal error occured: ${err.toString()}`, status_code: 500});
        })
    }
});

/**
 * @swagger
 * /sauce/multi:
 *  get:
 *      deprecated: true
 *      summary: Get Image Sauce using Multiple Backend
 *      description: This will return a possible image sauce match using multiple backend, some backend can be disabled by passing proper params.
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
 *        name: enableSauceNAO
 *        description: Disable or enable SauceNAO backend for this multi-search.
 *        required: false
 *        schema:
 *          type: string
 *          enum: ["true", "false"]
 *      - in: query
 *        name: enableIQDB
 *        description: Disable or enable IQDB backend for this multi-search.
 *        required: false
 *        schema:
 *          type: string
 *          enum: ["true", "false"]
 *      - in: query
 *        name: enableASCII2D
 *        description: Disable or enable ASCII2D backend for this multi-search.
 *        required: false
 *        schema:
 *          type: string
 *          enum: ["true", "false"]
 *      x-codeSamples:
 *      - lang: Python
 *        label: Python3
 *        source: |
 *           import requests
 *           res = requests.get("https://api.ihateani.me/sauce/multi", params={"url": "https://url.tld/image.png"})
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
 *                              saucenao:
 *                                  type: array
 *                                  description: The closest-matching sauce that received from SauceNAO, can be disabled.
 *                                  items:
 *                                      $ref: '#/components/schemas/SauceFinderResultModel'
 *                              iqdb:
 *                                  type: array
 *                                  description: The closest-matching sauce that received from IQDB, can be disabled.
 *                                  items:
 *                                      $ref: '#/components/schemas/SauceFinderResultModel'
 *                              ascii2d:
 *                                  type: array
 *                                  description: The closest-matching sauce that received from ASCII2D, can be disabled.
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
sauceroutes.get("/multi", (req, res) => {
    const logger = MainLogger.child({fn: "MultiSource.get"});
    logger.info("GET request received.");
    let body_bag = req.query;
    let payload_url = getValueFromKey(body_bag, "url");
    let minsim = fallbackNaN(parseFloat, getValueFromKey(body_bag, "minsim", 57.5), 57.5);
    let enableSN = map_bool(getValueFromKey(body_bag, "enableSauceNAO", 1));
    let enableIQDB = map_bool(getValueFromKey(body_bag, "enableIQDB", 1));
    let enableA2D = map_bool(getValueFromKey(body_bag, "enableASCII2D", 1));
    let a2dmaxres = fallbackNaN(parseInt, getValueFromKey(body_bag, "ascii2dlimit", 2), 2);
    if (is_none(payload_url)) {
        res.status(400).json({"message": "please provide image with `url` key in query parameters", "status_code": 400});
    } else {
        payload_url = decodeURIComponent(payload_url);
        logger.info("Finding that tasty sauce...");
        multiSauceFinder(
            payload_url,
            {
                "ascii2DLimit": a2dmaxres,
                "enableAscii2D": enableA2D,
                "enableIQDB": enableIQDB,
                "enableSauceNAO": enableSN,
                "iqdbMinsim": minsim,
                "sauceNAOSetting": {
                    "api_key": process.env.SAUCENAO_API_KEY,
                    "minsim": minsim
                }
            }
        ).then((multi_result) => {
            logger.info("Finished finding that tasty sauce, mapping results...");
            let proper_multi_results = {};
            proper_multi_results["notice"] = "API will be deprecated at 31st January 2021, please use v2 endpoint here: `/v2/graphql`"
            multi_result.forEach(([sf_result, ident]) => {
                proper_multi_results[ident] = sf_result;
            })
            proper_multi_results["status_code"] = 200;
            res.json(proper_multi_results);
        }).catch((err) => {
            logger.error("Failed to process overall request");
            logger.error(err);
            res.status(500).json({"message": `Failed to process request: ${err.toString()}`, "status_code": 500});
        })
    }
});

sauceroutes.use(express.json());

/**
 * @swagger
 * /sauce/saucenao:
 *  post:
 *      deprecated: true
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
    const logger = MainLogger.child({fn: "SauceNAO.post"});
    logger.info("POST request received.");
    let body_bag = req.body;
    let payload_url = getValueFromKey(body_bag, "url");
    let minsim = fallbackNaN(parseFloat, getValueFromKey(body_bag, "minsim", 60.0), 60.0);
    let numres = fallbackNaN(parseInt, getValueFromKey(body_bag, "numres", 6), 6);
    if (is_none(payload_url)) {
        res.status(400).json({"message": "please provide data with `url` key", "status_code": 400});
    } else {
        logger.info("Checking image source...");
        let saucer = new SauceNAO({"api_key": process.env.SAUCENAO_API_KEY, "minsim": minsim, "numres": numres});
        logger.info("Finding that tasty sauce...");
        saucer.getSauce(payload_url).then((sauce_results) => {
            logger.info(`Found ${sauce_results.length} matching sauce...`);
            res.json({notice: "API will be deprecated at 31st January 2021, please use v2 endpoint here: `/v2/graphql`", results: sauce_results, status_code: 200});
        }).catch((err) => {
            res.status(500).json({message: `An internal error occured: ${err.toString()}`, status_code: 500});
        })
    }
});

/**
 * @swagger
 * /sauce/iqdb:
 *  post:
 *      deprecated: true
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
    const logger = MainLogger.child({fn: "IQDB.post"});
    logger.info("POST request received.");
    let body_bag = req.body;
    let payload_url = getValueFromKey(body_bag, "url");
    let minsim = fallbackNaN(parseFloat, getValueFromKey(body_bag, "minsim", 60.0), 60.0);
    if (is_none(payload_url)) {
        res.status(400).json({"message": "please provide data with `url` key", "status_code": 400});
    } else {
        logger.info("Checking image source...");
        let saucer = new IQDB(minsim);
        logger.info("Finding that tasty sauce...");
        saucer.getSauce(payload_url).then((sauce_results) => {
            logger.info(`Found ${sauce_results.length} matching sauce...`);
            res.json({notice: "API will be deprecated at 31st January 2021, please use v2 endpoint here: `/v2/graphql`", results: sauce_results, status_code: 200});
        }).catch((err) => {
            res.status(500).json({message: `An internal error occured: ${err.toString()}`, status_code: 500});
        })
    }
});

/**
 * @swagger
 * /sauce/ascii2d:
 *  post:
 *      deprecated: true
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
    const logger = MainLogger.child({fn: "ASCII2D.post"});
    logger.info("POST request received.");
    let body_bag = req.body;
    let payload_url = getValueFromKey(body_bag, "url");
    let maxres = fallbackNaN(parseInt, getValueFromKey(body_bag, "maxres", 2), 2);
    if (is_none(payload_url)) {
        res.status(400).json({"message": "please provide data with `url` key", "status_code": 400});
    } else {
        logger.info("Checking image source...");
        let saucer = new ASCII2D(maxres);
        logger.info("Finding that tasty sauce...");
        saucer.getSauce(payload_url).then((sauce_results) => {
            logger.info(`Found ${sauce_results.length} matching sauce...`);
            res.json({notice: "API will be deprecated at 31st January 2021, please use v2 endpoint here: `/v2/graphql`", results: sauce_results, status_code: 200});
        }).catch((err) => {
            res.status(500).json({message: `An internal error occured: ${err.toString()}`, status_code: 500});
        })
    }
});

/**
 * @swagger
 * /sauce/multi:
 *  post:
 *      deprecated: true
 *      summary: Get Image Sauce using Multiple Backend
 *      description: This will return a possible image sauce match using multiple backend, some backend can be disabled by passing proper params.
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
 *                              description: The minimum similarity to be returned (Default to 57.5)
 *                          ascii2dlimit:
 *                              type: number
 *                              description: The maximum results to be returned from ASCII2D (Default to 2)
 *                          enableSauceNAO:
 *                              type: string
 *                              description: Disable or enable SauceNAO backend for this multi-search.
 *                              enum: ["true", "false"]
 *                          enableIQDB:
 *                              type: string
 *                              description: Disable or enable IQDB backend for this multi-search.
 *                              enum: ["true", "false"]
 *                          enableASCII2D:
 *                              type: string
 *                              description: Disable or enable ASCII2D backend for this multi-search.
 *                              enum: ["true", "false"]
 *      x-codeSamples:
 *      - lang: Python
 *        label: Python3
 *        source: |
 *           import requests
 *           res = requests.post("https://api.ihateani.me/sauce/multi", json={"url": "https://url.tld/image.png"})
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
 *                              saucenao:
 *                                  type: array
 *                                  description: The closest-matching sauce that received from SauceNAO, can be disabled.
 *                                  items:
 *                                      $ref: '#/components/schemas/SauceFinderResultModel'
 *                              iqdb:
 *                                  type: array
 *                                  description: The closest-matching sauce that received from IQDB, can be disabled.
 *                                  items:
 *                                      $ref: '#/components/schemas/SauceFinderResultModel'
 *                              ascii2d:
 *                                  type: array
 *                                  description: The closest-matching sauce that received from ASCII2D, can be disabled.
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
sauceroutes.post("/multi", (req, res) => {
    const logger = MainLogger.child({fn: "SauceNAO.post"});
    logger.info("POST request received.");
    let body_bag = req.body;
    let payload_url = getValueFromKey(body_bag, "url");
    let minsim = fallbackNaN(parseFloat, getValueFromKey(body_bag, "minsim", 57.5), 57.5);
    let enableSN = map_bool(getValueFromKey(body_bag, "enableSauceNAO", 1));
    let enableIQDB = map_bool(getValueFromKey(body_bag, "enableIQDB", 1));
    let enableA2D = map_bool(getValueFromKey(body_bag, "enableASCII2D", 1));
    let a2dmaxres = fallbackNaN(parseInt, getValueFromKey(body_bag, "ascii2dlimit", 2), 2);
    if (is_none(payload_url)) {
        res.status(400).json({"message": "please provide image with `url` key in query parameters", "status_code": 400});
    } else {
        payload_url = decodeURIComponent(payload_url);
        logger.info("Finding that tasty sauce...");
        multiSauceFinder(
            payload_url,
            {
                "ascii2DLimit": a2dmaxres,
                "enableAscii2D": enableA2D,
                "enableIQDB": enableIQDB,
                "enableSauceNAO": enableSN,
                "iqdbMinsim": minsim,
                "sauceNAOSetting": {
                    "api_key": process.env.SAUCENAO_API_KEY,
                    "minsim": minsim
                }
            }
        ).then((multi_result) => {
            logger.info("Finished finding that tasty sauce, mapping results...");
            let proper_multi_results = {};
            proper_multi_results["notice"] = "API will be deprecated at 31st January 2021, please use v2 endpoint here: `/v2/graphql`"
            multi_result.forEach(([sf_result, ident]) => {
                proper_multi_results[ident] = sf_result;
            })
            proper_multi_results["status_code"] = 200;
            res.json(proper_multi_results);
        }).catch((err) => {
            logger.error("Failed to process overall request");
            logger.error(err);
            res.status(500).json({"message": `Failed to process request: ${err.toString()}`, "status_code": 500});
        })
    }
});

export { sauceroutes };