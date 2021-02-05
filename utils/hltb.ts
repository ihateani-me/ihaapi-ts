import cheerio from "cheerio";
import qs from "qs";
import winston from "winston";
import axios, { AxiosInstance } from 'axios';

import { getValueFromKey, is_none } from './swissknife';
import { logger as MainLogger } from "./logger";

interface HLTBData {
    title: string
    image: string
    color: number
    hltb: {[key: string]: any}
    url: string
    stats: {[key: string]: number | string}
}


class HowLongToBeat {
    API_URL: string
    BASE_URL: string
    session: AxiosInstance;
    logger: winston.Logger;

    constructor() {
        this.BASE_URL = "https://howlongtobeat.com/";
        this.API_URL = `${this.BASE_URL}search_results`;
        const session = axios.create({
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.116 Safari/537.36"
            }
        });
        this.session = session;
        this.logger = MainLogger.child({cls: "HowLongToBeat"});
    }

    private format_results($: cheerio.Root, results: cheerio.Cheerio): HLTBData[] {
        let final_data = [];
        const naming_scheme = {
            "Main Story": "main",
            "Main + Extra": "main_extra",
            "Completionist": "complete",
            "Solo": "solo",
            "Co-Op": "coop",
            "Vs.": "versus",
            "Single-Player": "single_player",
            "--": null,
        }
        const time_color = {
            "time_00": 10658466,
            "time_40": 16726586,
            "time_50": 13384529,
            "time_60": 8538501,
            "time_70": 5656737,
            "time_80": 4742315,
            "time_90": 3829173,
            "time_100": 2654146,
        }
        results.each((_, result) => {
            // @ts-ignore
            let hltb_res: HLTBData = { "stats": {}, "hltb": {} };
            let $img_div = $(result).find(".search_list_image");
            let img_url = $img_div.find("img").attr("src");

            let $details_div = $(result).find(".search_list_details");
            let game_title = $img_div.find("a").attr("title");
            let game_url = this.BASE_URL + $img_div.find("a").attr("href");

            hltb_res.title = game_title;
            hltb_res.url = game_url;
            hltb_res.image = img_url;

            let $details_div_block = $details_div.find(".search_list_details_block");

            let $time_data = $details_div_block.children("div");
            let $details_divb_t = $details_div_block.find(".search_list_tidbit.text_white.shadow_text");
            let $details_divb_b = $details_div_block.find(".search_list_tidbit.center.back_primary");

            let $stats_names = $details_divb_t.filter((i, el) => {
                return $(el).parent().attr("class") == "search_list_details_block";
            });

            $stats_names.each((nn, dtb) => {
                var dtb_head = $(dtb).text().toLowerCase();
                var dtb_data = $($details_divb_b[nn]).text();
                if (!isNaN(parseInt(dtb_data))) {
                    // @ts-ignore
                    if (parseInt(dtb_data) == dtb_data) {
                        // @ts-ignore
                        dtb_data = parseInt(dtb_data);
                    }
                };
                hltb_res["stats"][dtb_head] = dtb_data;
            });

            if ($time_data.children("div").length > 0) {
                var $hltbs_title = $time_data.find(".search_list_tidbit.text_white.shadow_text");
                var $hltbs_stats = $time_data.find(".search_list_tidbit.center");
            } else {
                var $hltbs_title = $details_div_block.find(".search_list_tidbit_short");
                var $hltbs_stats = $details_div_block.find(".search_list_tidbit_long");
            }

            $hltbs_title.each((n_index, hltb_title) => {
                let $hltb_stats = $($hltbs_stats[n_index])
                let hltb_stats = $hltb_stats.text()
                    .trimRight()
                    .replace("¼", ".25")
                    .replace("½", ".5")
                    .replace("¾", ".75"); 
                let $header_data = $(hltb_title);
                let header_name = $header_data.text().trimRight();
                let proper_data = getValueFromKey(naming_scheme, hltb_stats, hltb_stats);
                let proper_name = getValueFromKey(naming_scheme, header_name, "other");
                if (proper_name == "main") {
                    var class_name = $hltb_stats.attr("class");
                    if (!is_none(class_name)) {
                        var classes = class_name.split(" ");
                        let colors = getValueFromKey(time_color, classes[classes.length - 1], 1646893);
                        hltb_res.color = colors;
                    }
                }
                hltb_res["hltb"][proper_name] = proper_data;
            });
            final_data.push(hltb_res);
        });
        return final_data;
    }

    async search(q: string, p: number = 1): Promise<[HLTBData[], string]> {
        let formData = {
            "queryString": q,
            "t": "games",
            "sorthead": "popular",
            "sortd": "Normal Order",
            "plat": "",
            "length_type": "main",
            "length_min": "",
            "length_max": "",
            "detail": "user_stats",
        }
        const logger = this.logger.child({fn: "search"});
        logger.info(`Start searching: ${q}`);
        logger.info(`Requesting: ${this.API_URL}?page=${p}`);
        let response = await this.session.post(`${this.API_URL}?page=${p}`, qs.stringify(formData), {
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            }
        });
        if (response.status != 200) {
            if (response.status == 404) {
                return [[], "No results"];
            } else if (response.status == 500) {
                return [[], "Internal server error"];
            } else {
                return [[], "Unknown error occured"];
            };
        };
        logger.info(`Start parsing: ${q}`);
        let $ = cheerio.load(response.data);
        let results = $("li.back_darkish");
        if (results.length == 0) {
            logger.warn("No results.");
            return [[], "No results"]
        }
        return [this.format_results($, results), "Success"];
    }
}

export async function hltb_search(query: string, page: number = 1): Promise<[HLTBData[], string]> {
    const logger = MainLogger.child({fn: "hltb_search"});
    let hltb_cls = new HowLongToBeat();
    try {
        let [hltb_res, hltb_msg] = await hltb_cls.search(query, page);
        return [hltb_res, hltb_msg];
    } catch (error) {
        logger.error(error);
        return [[], "Exception occured: " + error.toString()];
    }
}