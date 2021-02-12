import cheerio from "cheerio";
import qs from "qs";
import winston from "winston";
import axios, { AxiosInstance } from "axios";

import { fallbackNaN, getValueFromKey, is_none } from "./swissknife";
import { logger as MainLogger } from "./logger";

interface HLTBData {
    title: string;
    image: string;
    color: number;
    hltb: { [key: string]: any };
    url: string;
    stats: { [key: string]: number | string };
}

class HowLongToBeat {
    API_URL: string;
    BASE_URL: string;
    session: AxiosInstance;
    logger: winston.Logger;

    constructor() {
        this.BASE_URL = "https://howlongtobeat.com/";
        this.API_URL = `${this.BASE_URL}search_results`;
        const session = axios.create({
            headers: {
                "User-Agent":
                    // eslint-disable-next-line max-len
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.116 Safari/537.36",
            },
        });
        this.session = session;
        this.logger = MainLogger.child({ cls: "HowLongToBeat" });
    }

    private format_results($: cheerio.Root, results: cheerio.Cheerio): HLTBData[] {
        const final_data: HLTBData[] = [];
        const naming_scheme = {
            "Main Story": "main",
            "Main + Extra": "main_extra",
            Completionist: "complete",
            Solo: "solo",
            "Co-Op": "coop",
            "Vs.": "versus",
            "Single-Player": "single_player",
            "--": null,
        };
        const time_color = {
            time_00: 10658466,
            time_40: 16726586,
            time_50: 13384529,
            time_60: 8538501,
            time_70: 5656737,
            time_80: 4742315,
            time_90: 3829173,
            time_100: 2654146,
        };
        results.each((_, result) => {
            // @ts-ignore
            const hltb_res: HLTBData = { stats: {}, hltb: {} };
            const $img_div = $(result).find(".search_list_image");
            const img_url =
                $img_div.find("img").attr("src") || "https://howlongtobeat.com/img/hltb_brand.png";

            const $details_div = $(result).find(".search_list_details");
            const game_title = $img_div.find("a").attr("title") || "Unknown Game";
            const game_url = this.BASE_URL + $img_div.find("a").attr("href") || "";

            hltb_res.title = game_title;
            hltb_res.url = game_url;
            hltb_res.image = img_url;

            const $details_div_block = $details_div.find(".search_list_details_block");

            const $time_data = $details_div_block.children("div");
            const $details_divb_t = $details_div_block.find(".search_list_tidbit.text_white.shadow_text");
            const $details_divb_b = $details_div_block.find(".search_list_tidbit.center.back_primary");

            const $stats_names = $details_divb_t.filter((i, el) => {
                return $(el).parent().attr("class") == "search_list_details_block";
            });

            $stats_names.each((nn, dtb) => {
                const dtb_head = $(dtb).text().toLowerCase();
                let dtb_data = $($details_divb_b[nn]).text();
                if (!isNaN(parseInt(dtb_data))) {
                    // @ts-ignore
                    if (parseInt(dtb_data) == dtb_data) {
                        // @ts-ignore
                        dtb_data = parseInt(dtb_data);
                    }
                }
                hltb_res["stats"][dtb_head] = dtb_data;
            });

            let $hltbs_title: cheerio.Cheerio;
            let $hltbs_stats: cheerio.Cheerio;
            if ($time_data.children("div").length > 0) {
                $hltbs_title = $time_data.find(".search_list_tidbit.text_white.shadow_text");
                $hltbs_stats = $time_data.find(".search_list_tidbit.center");
            } else {
                $hltbs_title = $details_div_block.find(".search_list_tidbit_short");
                $hltbs_stats = $details_div_block.find(".search_list_tidbit_long");
            }

            $hltbs_title.each((n_index, hltb_title) => {
                const $hltb_stats = $($hltbs_stats[n_index]);
                const hltb_stats = $hltb_stats
                    .text()
                    .trimRight()
                    .replace("¼", ".25")
                    .replace("½", ".5")
                    .replace("¾", ".75");
                const $header_data = $(hltb_title);
                const header_name = $header_data.text().trimRight();
                const proper_data = getValueFromKey(naming_scheme, hltb_stats, hltb_stats);
                const proper_name = getValueFromKey(naming_scheme, header_name, "other") as string;
                if (proper_name == "main") {
                    const class_name = $hltb_stats.attr("class");
                    if (!is_none(class_name)) {
                        const classes = class_name.split(" ");
                        const colors = fallbackNaN(
                            parseInt,
                            getValueFromKey(time_color, classes[classes.length - 1], 1646893),
                            1646893
                        ) as number;
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
        const formData = {
            queryString: q,
            t: "games",
            sorthead: "popular",
            sortd: "Normal Order",
            plat: "",
            length_type: "main",
            length_min: "",
            length_max: "",
            detail: "user_stats",
        };
        const logger = this.logger.child({ fn: "search" });
        logger.info(`Start searching: ${q}`);
        logger.info(`Requesting: ${this.API_URL}?page=${p}`);
        const response = await this.session.post(`${this.API_URL}?page=${p}`, qs.stringify(formData), {
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
        });
        if (response.status != 200) {
            if (response.status == 404) {
                return [[], "No results"];
            } else if (response.status == 500) {
                return [[], "Internal server error"];
            } else {
                return [[], "Unknown error occured"];
            }
        }
        logger.info(`Start parsing: ${q}`);
        const $ = cheerio.load(response.data);
        const results = $("li.back_darkish");
        if (results.length == 0) {
            logger.warn("No results.");
            return [[], "No results"];
        }
        return [this.format_results($, results), "Success"];
    }
}

export async function hltb_search(query: string, page: number = 1): Promise<[HLTBData[], string]> {
    const logger = MainLogger.child({ fn: "hltb_search" });
    const hltb_cls = new HowLongToBeat();
    try {
        const [hltb_res, hltb_msg] = await hltb_cls.search(query, page);
        return [hltb_res, hltb_msg];
    } catch (error) {
        logger.error(error);
        return [[], "Exception occured: " + error.toString()];
    }
}
