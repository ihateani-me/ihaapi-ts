import * as express from "express";

const SauceRoutes = express.Router();

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
SauceRoutes.get("/saucenao", (req, res) => {
    res.status(410).json({
        message: "Deprecated, please use v2 API (/v2/graphql), documentation here: /v2/gql-docs",
        error: "DEPRECATED",
        code: 410,
        info: {
            deprecatedSince: "2021-01-14T23:59:59+09:00",
        },
    });
});

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
SauceRoutes.get("/iqdb", (req, res) => {
    res.status(410).json({
        message: "Deprecated, please use v2 API (/v2/graphql), documentation here: /v2/gql-docs",
        error: "DEPRECATED",
        code: 410,
        info: {
            deprecatedSince: "2021-01-14T23:59:59+09:00",
        },
    });
});

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
SauceRoutes.get("/ascii2d", (req, res) => {
    res.status(410).json({
        message: "Deprecated, please use v2 API (/v2/graphql), documentation here: /v2/gql-docs",
        error: "DEPRECATED",
        code: 410,
        info: {
            deprecatedSince: "2021-01-14T23:59:59+09:00",
        },
    });
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
SauceRoutes.get("/multi", (req, res) => {
    res.status(410).json({
        message: "Deprecated, please use v2 API (/v2/graphql), documentation here: /v2/gql-docs",
        error: "DEPRECATED",
        code: 410,
        info: {
            deprecatedSince: "2021-01-14T23:59:59+09:00",
        },
    });
});

SauceRoutes.use(express.json());

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
SauceRoutes.post("/saucenao", (req, res) => {
    res.status(410).json({
        message: "Deprecated, please use v2 API (/v2/graphql), documentation here: /v2/gql-docs",
        error: "DEPRECATED",
        code: 410,
        info: {
            deprecatedSince: "2021-01-14T23:59:59+09:00",
        },
    });
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
SauceRoutes.post("/iqdb", (req, res) => {
    res.status(410).json({
        message: "Deprecated, please use v2 API (/v2/graphql), documentation here: /v2/gql-docs",
        error: "DEPRECATED",
        code: 410,
        info: {
            deprecatedSince: "2021-01-14T23:59:59+09:00",
        },
    });
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
SauceRoutes.post("/ascii2d", (req, res) => {
    res.status(410).json({
        message: "Deprecated, please use v2 API (/v2/graphql), documentation here: /v2/gql-docs",
        error: "DEPRECATED",
        code: 410,
        info: {
            deprecatedSince: "2021-01-14T23:59:59+09:00",
        },
    });
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
SauceRoutes.post("/multi", (req, res) => {
    res.status(410).json({
        message: "Deprecated, please use v2 API (/v2/graphql), documentation here: /v2/gql-docs",
        error: "DEPRECATED",
        code: 410,
        info: {
            deprecatedSince: "2021-01-14T23:59:59+09:00",
        },
    });
});

export { SauceRoutes };
