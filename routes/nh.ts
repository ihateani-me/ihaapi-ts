import * as express from "express";
import { nhFetchInfo, nhImagePathProxy, nhImageProxy, nhLatestDoujin, nhSearchDoujin } from "../utils/nh";
import { is_none, fallbackNaN } from "../utils/swissknife";
import { logger as TopLogger } from "../utils/logger";
const MainLogger = TopLogger.child({cls: "Routes.nHentai"});
const nhroutes = express.Router();

nhroutes.use((req, res, next) => {
    res.header({
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS, HEAD"
    })
    next()
});

nhroutes.get("/i/:media_id/:img_num", (req, res) => {
    const logger = MainLogger.child({fn: "image"});
    let image_path = `${req.params.media_id}/${req.params.img_num}`;
    nhImagePathProxy(image_path).then(([img_buf, mimes]) => {
        if (!Buffer.isBuffer(img_buf)) {
            res.status(404).json(img_buf)
        } else {
            res.set("Content-Type", mimes[0]);
            res.end(img_buf);
        }
    }).catch((err) => {
        logger.error(err)
        res.status(500).json({"message": "Internal server error", "error": err.toString(), "status_code": 500});
    })
})

nhroutes.get("/t/:media_id/:img_num", (req, res) => {
    const logger = MainLogger.child({fn: "thumbnail"});
    let image_path = `${req.params.media_id}/${req.params.img_num}`;
    nhImagePathProxy(image_path, true).then(([img_buf, mimes]) => {
        if (!Buffer.isBuffer(img_buf)) {
            res.status(404).json(img_buf)
        } else {
            res.set("Content-Type", mimes[0]);
            res.end(img_buf);
        }
    }).catch((err) => {
        logger.error(err)
        res.status(500).json({"message": "Internal server error", "error": err.toString(), "status_code": 500});
    })
})

/**
 * @swagger
 * /nh/image/{doujin_id}/{page_num}:
 *  get:
 *      summary: Get Proxied image of nH Image
 *      description: This use the doujin code and page number to proxy it to user.
 *      tags:
 *      - nh_nsfw
 *      parameters:
 *      - in: path
 *        name: doujin_id
 *        description: Doujin code
 *        required: true
 *        schema:
 *          type: string
 *      - in: path
 *        name: page_num
 *        description: Page number
 *        required: true
 *        schema:
 *          type: integer
 *      x-codeSamples:
 *      - lang: Python
 *        label: Python3
 *        source: |
 *           import requests
 *           res = requests.get("https://api.ihateani.me/nh/image/177013/1")
 *           with open("177013_01.png", "wb") as fp:
 *              fp.write(res.content)
 *      responses:
 *          200:
 *              description: Proxied Image in either png/jpg/gif, please refer to Content-Type
 *              content:
 *                  image/png:
 *                      schema:
 *                          description: Proxied Image in PNG
 *                          type: string
 *                          format: binary
 *                  image/jpeg:
 *                      schema:
 *                          description: Proxied Image in JPG/JPEG
 *                          type: string
 *                          format: binary
 *                  image/gif:
 *                      schema:
 *                          description: Proxied Image in GIF
 *                          type: string
 *                          format: binary
 *          500:
 *              description: A server-side error occured
 *              content:
 *                  application/json:
 *                      schema:
 *                          type: object
 *                          properties:
 *                              message:
 *                                  type: string
 *                                  description: Why it failed to process.
 *                              error:
 *                                  type: string
 *                                  description: A detailed server-error code.
 *                              status_code:
 *                                  type: number
 *                                  description: HTTP Status code
 *          'default':
 *              description: An error occured
 *              content:
 *                  application/json:
 *                      schema:
 *                          type: object
 *                          properties:
 *                              message:
 *                                  type: string
 *                                  description: Why it failed to process.
 *                              status_code:
 *                                  type: number
 *                                  description: HTTP Status code
 */
nhroutes.get("/image/:doujin_id/:page_num", (req, res) => {
    const logger = MainLogger.child({fn: "imagePath"});
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
            logger.error(err)
            res.status(500).json({"message": "Internal server error", "error": err.toString(), "status_code": 500});
        })
    }
})

/**
 * @swagger
 * /nh/info/{doujin_id}:
 *  get:
 *      summary: Get nH Doujin Information
 *      deprecated: true
 *      description: |
 *          This will display some information and URL to a proxied image.
 *
 *          Will be deprecated at 31st January 2021, new API: [`/v2/graphql`](/v2/graphql)
 *      tags:
 *      - nh_nsfw
 *      parameters:
 *      - in: path
 *        name: doujin_id
 *        description: Doujin code
 *        required: true
 *        schema:
 *          type: string
 *      x-codeSamples:
 *      - lang: Python
 *        label: Python3
 *        source: |
 *           import requests
 *           res = requests.get("https://api.ihateani.me/nh/info/177013")
 *           print(res.json())
 *      responses:
 *          200:
 *              description: Doujin Information
 *              content:
 *                  application/json:
 *                      schema:
 *                          type: object
 *                          properties:
 *                              id:
 *                                  type: string
 *                                  description: The doujin code.
 *                              title:
 *                                  type: string
 *                                  description: The doujin title.
 *                              original_title:
 *                                  type: object
 *                                  description: Original japanese or english title if exist
 *                                  properties:
 *                                      japanase:
 *                                          type: string
 *                                          description: The original japanese title.
 *                                      other:
 *                                          type: string
 *                                          description: The original english/other language title.
 *                              cover:
 *                                  type: string
 *                                  description: The cover art url for the doujin, the link is proxied version.
 *                              tags:
 *                                  type: object
 *                                  description: The doujin tagged metadata
 *                                  properties:
 *                                      artists:
 *                                          type: array
 *                                          description: The doujin artists.
 *                                          items:
 *                                              type: array
 *                                              items:
 *                                                  anyOf:
 *                                                      - type: string
 *                                                        example: artist_name
 *                                                      - type: integer
 *                                                        example: 1
 *                                      categories:
 *                                          type: array
 *                                          description: The doujin categories.
 *                                          items:
 *                                              type: array
 *                                              items:
 *                                                  anyOf:
 *                                                      - type: string
 *                                                        example: category_name
 *                                                      - type: integer
 *                                                        example: 1
 *                                      groups:
 *                                          type: array
 *                                          description: The affliated groups for this doujin.
 *                                          items:
 *                                              type: array
 *                                              items:
 *                                                  anyOf:
 *                                                      - type: string
 *                                                        example: group_name
 *                                                      - type: integer
 *                                                        example: 1
 *                                      languages:
 *                                          type: array
 *                                          description: The doujin language.
 *                                          items:
 *                                              type: array
 *                                              items:
 *                                                  anyOf:
 *                                                      - type: string
 *                                                        example: language
 *                                                      - type: integer
 *                                                        example: 1
 *                                      tags:
 *                                          type: array
 *                                          description: The doujin metadata tagss.
 *                                          items:
 *                                              type: array
 *                                              items:
 *                                                  anyOf:
 *                                                      - type: string
 *                                                        example: tag_name
 *                                                      - type: integer
 *                                                        example: 1
 *                                      parodies:
 *                                          type: array
 *                                          description: The parodies for this doujin.
 *                                          items:
 *                                              type: array
 *                                              items:
 *                                                  anyOf:
 *                                                      - type: string
 *                                                        example: parody_name
 *                                                      - type: integer
 *                                                        example: 1
 *                                      characters:
 *                                          type: array
 *                                          description: The characters parodies for this doujin.
 *                                          items:
 *                                              type: array
 *                                              items:
 *                                                  anyOf:
 *                                                      - type: string
 *                                                        example: category_name
 *                                                      - type: integer
 *                                                        example: 1
 *                              images:
 *                                  type: array
 *                                  description: The images sets, all of the URL here are proxied.
 *                                  items:
 *                                      type: string
 *                              images_size:
 *                                  type: array
 *                                  description: The images sets size.
 *                                  items:
 *                                      type: array
 *                                      description: A pair of width and height
 *                                      items:
 *                                          anyOf:
 *                                              - type: number
 *                                                example: 1080
 *                                              - type: number
 *                                                example: 1920
 *                              url:
 *                                  type: string
 *                                  description: The doujin nH url.
 *                              posted_time:
 *                                  type: integer
 *                                  description: The doujin upload time, in UTC after epoch.
 *                              favorites:
 *                                  type: integer
 *                                  description: The doujin favorite amount.
 *                              total_pages:
 *                                  type: integer
 *                                  description: The doujin total pages.
 *                              status_code:
 *                                  type: integer
 *                                  description: HTTP Status code
 *                                  example: 200
 *          500:
 *              description: A server-side error occured
 *              content:
 *                  application/json:
 *                      schema:
 *                          type: object
 *                          properties:
 *                              message:
 *                                  type: string
 *                                  description: Why it failed to process.
 *                              error:
 *                                  type: string
 *                                  description: A detailed server-error code.
 *                              status_code:
 *                                  type: number
 *                                  description: HTTP Status code
 *          'default':
 *              description: An error occured
 *              content:
 *                  application/json:
 *                      schema:
 *                          type: object
 *                          properties:
 *                              message:
 *                                  type: string
 *                                  description: Why it failed to process.
 *                              status_code:
 *                                  type: number
 *                                  description: HTTP Status code
 */
nhroutes.get("/info/:doujin_id", (req, res) => {
    res.status(410).json({
        "message": "Deprecated, please use v2 API (/v2/graphql), documentation here: /v2/gql-docs",
        "error": "DEPRECATED",
        "code": 410,
        "info": {
            "deprecatedSince": "2021-01-14T23:59:59+09:00"
        }
    })
})

/**
 * @swagger
 * /nh/latest:
 *  get:
 *      summary: Get 25 Latest Doujin
 *      deprecated: true
 *      description: |
 *          This will display information of latest 25 doujin.
  * 
 *          Will be deprecated at 31st January 2021, new API: [`/v2/graphql`](/v2/graphql)
 *      tags:
 *      - nh_nsfw
 *      parameters:
 *      - in: query
 *        name: page
 *        description: Page to check
 *        required: false
 *        schema:
 *          type: integer
 *      x-codeSamples:
 *      - lang: Python
 *        label: Python3
 *        source: |
 *           import requests
 *           res = requests.get("https://api.ihateani.me/nh/latest")
 *           print(res.json())
 *      responses:
 *          200:
 *              description: Latest 25 doujin information
 *              content:
 *                  application/json:
 *                      schema:
 *                          type: object
 *                          description: Latest 25 doujin information
 *                          properties:
 *                              total_page:
 *                                  description: Total page available.
 *                                  type: integer
 *                                  example: 1
 *                              current_page:
 *                                  description: Currenly returned page.
 *                                  type: integer
 *                                  example: 1
 *                              results:
 *                                  type: array
 *                                  description: Array of latest doujin information
 *                                  items:
 *                                     type: object
 *                                     properties:
 *                                         id:
 *                                             type: string
 *                                             description: The doujin code.
 *                                         title:
 *                                             type: string
 *                                             description: The doujin title.
 *                                         original_title:
 *                                             type: object
 *                                             description: Original japanese or english title if exist
 *                                             properties:
 *                                                 japanase:
 *                                                     type: string
 *                                                     description: The original japanese title.
 *                                                 other:
 *                                                     type: string
 *                                                     description: The original english/other language title.
 *                                         cover:
 *                                             type: string
 *                                             description: The cover art url for the doujin, the link is proxied version.
 *                                         tags:
 *                                             type: object
 *                                             description: The doujin tagged metadata
 *                                             properties:
 *                                                 artists:
 *                                                     type: array
 *                                                     description: The doujin artists.
 *                                                     items:
 *                                                         type: array
 *                                                         items:
 *                                                             anyOf:
 *                                                                 - type: string
 *                                                                   example: artist_name
 *                                                                 - type: integer
 *                                                                   example: 1
 *                                                 categories:
 *                                                     type: array
 *                                                     description: The doujin categories.
 *                                                     items:
 *                                                         type: array
 *                                                         items:
 *                                                             anyOf:
 *                                                                 - type: string
 *                                                                   example: category_name
 *                                                                 - type: integer
 *                                                                   example: 1
 *                                                 groups:
 *                                                     type: array
 *                                                     description: The affliated groups for this doujin.
 *                                                     items:
 *                                                         type: array
 *                                                         items:
 *                                                             anyOf:
 *                                                                 - type: string
 *                                                                   example: group_name
 *                                                                 - type: integer
 *                                                                   example: 1
 *                                                 languages:
 *                                                     type: array
 *                                                     description: The doujin language.
 *                                                     items:
 *                                                         type: array
 *                                                         items:
 *                                                             anyOf:
 *                                                                 - type: string
 *                                                                   example: language
 *                                                                 - type: integer
 *                                                                   example: 1
 *                                                 tags:
 *                                                     type: array
 *                                                     description: The doujin metadata tagss.
 *                                                     items:
 *                                                         type: array
 *                                                         items:
 *                                                             anyOf:
 *                                                                 - type: string
 *                                                                   example: tag_name
 *                                                                 - type: integer
 *                                                                   example: 1
 *                                                 parodies:
 *                                                     type: array
 *                                                     description: The parodies for this doujin.
 *                                                     items:
 *                                                         type: array
 *                                                         items:
 *                                                             anyOf:
 *                                                                 - type: string
 *                                                                   example: parody_name
 *                                                                 - type: integer
 *                                                                   example: 1
 *                                                 characters:
 *                                                     type: array
 *                                                     description: The characters parodies for this doujin.
 *                                                     items:
 *                                                         type: array
 *                                                         items:
 *                                                             anyOf:
 *                                                                 - type: string
 *                                                                   example: character_name
 *                                                                 - type: integer
 *                                                                   example: 1
 *                                         images:
 *                                             type: array
 *                                             description: The images sets, all of the URL here are proxied.
 *                                             items:
 *                                                 type: string
 *                                         images_size:
 *                                             type: array
 *                                             description: The images sets size.
 *                                             items:
 *                                                 type: array
 *                                                 description: A pair of width and height
 *                                                 items:
 *                                                     anyOf:
 *                                                         - type: number
 *                                                           example: 1080
 *                                                         - type: number
 *                                                           example: 1920
 *                                         url:
 *                                             type: string
 *                                             description: The doujin nH url.
 *                                         posted_time:
 *                                             type: integer
 *                                             description: The doujin upload time, in UTC after epoch.
 *                                         favorites:
 *                                             type: integer
 *                                             description: The doujin favorite amount.
 *                                         total_pages:
 *                                             type: integer
 *                                             description: The doujin total pages.
 *                              total_data:
 *                                  description: Total doujin that are returned.
 *                                  type: integer
 *                                  example: 1
 *          500:
 *              description: A server-side error occured
 *              content:
 *                  application/json:
 *                      schema:
 *                          type: object
 *                          properties:
 *                              message:
 *                                  type: string
 *                                  description: Why it failed to process.
 *                              error:
 *                                  type: string
 *                                  description: A detailed server-error code.
 *                              status_code:
 *                                  type: number
 *                                  description: HTTP Status code
 *          'default':
 *              description: An error occured
 *              content:
 *                  application/json:
 *                      schema:
 *                          type: object
 *                          properties:
 *                              message:
 *                                  type: string
 *                                  description: Why it failed to process.
 *                              status_code:
 *                                  type: number
 *                                  description: HTTP Status code
 */
nhroutes.get("/latest", (req, res) => {
    res.status(410).json({
        "message": "Deprecated, please use v2 API (/v2/graphql), documentation here: /v2/gql-docs",
        "error": "DEPRECATED",
        "code": 410,
        "info": {
            "deprecatedSince": "2021-01-14T23:59:59+09:00"
        }
    })
})

/**
 * @swagger
 * /nh/search:
 *  get:
 *      summary: Search Doujin on nH
 *      deprecated: true
 *      description: |
 *          This will try to fetch doujin information with provided query search.<br>
 *          This search support nH tag searching like for example if you want to specify to certain things you can do:<br>
 *          `?q=parody:touhou`, use double quotes if it have spaces.
 * 
 *          The supported "tags" are:<br>
 *          - artist
 *          - category
 *          - group
 *          - parody
 *          - character
 *          - tag
 * 
 *          You could also use it multiple times to filter it more.
 * 
 *          Will be deprecated at 31st January 2021, new API: [`/v2/graphql`](/v2/graphql)
 *      tags:
 *      - nh_nsfw
 *      parameters:
 *      - in: query
 *        name: q
 *        description: Query string to be searched.
 *        required: true
 *        schema:
 *          type: string
 *      - in: query
 *        name: page
 *        description: Page to scroll through
 *        required: false
 *        schema:
 *          type: integer
 *      x-codeSamples:
 *      - lang: Python
 *        label: Python3
 *        source: |
 *           import requests
 *           res = requests.get("https://api.ihateani.me/nh/search?q=hibike")
 *           print(res.json())
 *      responses:
 *          200:
 *              description: Search results
 *              content:
 *                  application/json:
 *                      schema:
 *                          type: object
 *                          description: Search results
 *                          properties:
 *                              query:
 *                                  description: The user query search.
 *                                  type: string
 *                              total_page:
 *                                  description: Total page available.
 *                                  type: integer
 *                                  example: 1
 *                              current_page:
 *                                  description: Currenly returned page.
 *                                  type: integer
 *                                  example: 1
 *                              results:
 *                                  type: array
 *                                  description: Array of queried doujin information
 *                                  items:
 *                                     type: object
 *                                     properties:
 *                                         id:
 *                                             type: string
 *                                             description: The doujin code.
 *                                         title:
 *                                             type: string
 *                                             description: The doujin title.
 *                                         original_title:
 *                                             type: object
 *                                             description: Original japanese or english title if exist
 *                                             properties:
 *                                                 japanase:
 *                                                     type: string
 *                                                     description: The original japanese title.
 *                                                 other:
 *                                                     type: string
 *                                                     description: The original english/other language title.
 *                                         cover:
 *                                             type: string
 *                                             description: The cover art url for the doujin, the link is proxied version.
 *                                         tags:
 *                                             type: object
 *                                             description: The doujin tagged metadata
 *                                             properties:
 *                                                 artists:
 *                                                     type: array
 *                                                     description: The doujin artists.
 *                                                     items:
 *                                                         type: array
 *                                                         items:
 *                                                             anyOf:
 *                                                                 - type: string
 *                                                                   example: artist_name
 *                                                                 - type: integer
 *                                                                   example: 1
 *                                                 categories:
 *                                                     type: array
 *                                                     description: The doujin categories.
 *                                                     items:
 *                                                         type: array
 *                                                         items:
 *                                                             anyOf:
 *                                                                 - type: string
 *                                                                   example: category_name
 *                                                                 - type: integer
 *                                                                   example: 1
 *                                                 groups:
 *                                                     type: array
 *                                                     description: The affliated groups for this doujin.
 *                                                     items:
 *                                                         type: array
 *                                                         items:
 *                                                             anyOf:
 *                                                                 - type: string
 *                                                                   example: group_name
 *                                                                 - type: integer
 *                                                                   example: 1
 *                                                 languages:
 *                                                     type: array
 *                                                     description: The doujin language.
 *                                                     items:
 *                                                         type: array
 *                                                         items:
 *                                                             anyOf:
 *                                                                 - type: string
 *                                                                   example: language
 *                                                                 - type: integer
 *                                                                   example: 1
 *                                                 tags:
 *                                                     type: array
 *                                                     description: The doujin metadata tagss.
 *                                                     items:
 *                                                         type: array
 *                                                         items:
 *                                                             anyOf:
 *                                                                 - type: string
 *                                                                   example: tag_name
 *                                                                 - type: integer
 *                                                                   example: 1
 *                                                 parodies:
 *                                                     type: array
 *                                                     description: The parodies for this doujin.
 *                                                     items:
 *                                                         type: array
 *                                                         items:
 *                                                             anyOf:
 *                                                                 - type: string
 *                                                                   example: parody_name
 *                                                                 - type: integer
 *                                                                   example: 1
 *                                                 characters:
 *                                                     type: array
 *                                                     description: The characters parodies for this doujin.
 *                                                     items:
 *                                                         type: array
 *                                                         items:
 *                                                             anyOf:
 *                                                                 - type: string
 *                                                                   example: character_name
 *                                                                 - type: integer
 *                                                                   example: 1
 *                                         images:
 *                                             type: array
 *                                             description: The images sets, all of the URL here are proxied.
 *                                             items:
 *                                                 type: string
 *                                         images_size:
 *                                             type: array
 *                                             description: The images sets size.
 *                                             items:
 *                                                 type: array
 *                                                 description: A pair of width and height
 *                                                 items:
 *                                                     anyOf:
 *                                                         - type: number
 *                                                           example: 1080
 *                                                         - type: number
 *                                                           example: 1920
 *                                         url:
 *                                             type: string
 *                                             description: The doujin nH url.
 *                                         posted_time:
 *                                             type: integer
 *                                             description: The doujin upload time, in UTC after epoch.
 *                                         favorites:
 *                                             type: integer
 *                                             description: The doujin favorite amount.
 *                                         total_pages:
 *                                             type: integer
 *                                             description: The doujin total pages.
 *                              total_data:
 *                                  description: Total doujin that are returned.
 *                                  type: integer
 *                                  example: 1
 *          500:
 *              description: A server-side error occured
 *              content:
 *                  application/json:
 *                      schema:
 *                          type: object
 *                          properties:
 *                              message:
 *                                  type: string
 *                                  description: Why it failed to process.
 *                              error:
 *                                  type: string
 *                                  description: A detailed server-error code.
 *                              status_code:
 *                                  type: number
 *                                  description: HTTP Status code
 *          'default':
 *              description: An error occured
 *              content:
 *                  application/json:
 *                      schema:
 *                          type: object
 *                          properties:
 *                              message:
 *                                  type: string
 *                                  description: Why it failed to process.
 *                              status_code:
 *                                  type: number
 *                                  description: HTTP Status code
 */
nhroutes.get("/search", (req, res) => {
    res.status(410).json({
        "message": "Deprecated, please use v2 API (/v2/graphql), documentation here: /v2/gql-docs",
        "error": "DEPRECATED",
        "code": 410,
        "info": {
            "deprecatedSince": "2021-01-14T23:59:59+09:00"
        }
    })
})

nhroutes.get("/unduh", (_, res) => {
    res.render("nhdown");
})

export { nhroutes };