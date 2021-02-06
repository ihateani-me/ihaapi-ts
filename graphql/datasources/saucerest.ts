import _ from "lodash";
import winston from "winston";
import { RESTDataSource, RequestOptions } from "apollo-datasource-rest";

import { SauceNAO, IQDB } from "../../utils/saucefinder";
import { fallbackNaN, getValueFromKey } from "../../utils/swissknife";
import { IQDBParams, SauceNAOParams } from "../schemas/saucefinder";
import { logger as MainLogger } from "../../utils/logger";

import packageJson from "../../package.json";

export class SauceNAOAPI extends RESTDataSource {
    api_key: string
    minsim: number
    numres: number
    db_index: number

    saucenao: SauceNAO
    logger: winston.Logger;

    constructor() {
        super();
        this.baseURL = "https://saucenao.com/search.php";
        this.api_key = process.env.SAUCENAO_API_KEY || "";

        this.logger = MainLogger.child({cls: "SauceNAORESTDS"});
    }

    private precheckSettings() {
        this.minsim = fallbackNaN(parseFloat, this.minsim, 57.5);
        if (this.minsim <= 0 || this.minsim >= 100) {
            this.minsim = 57.5;
        }
        this.numres = fallbackNaN(parseInt, this.numres, 6);
        if (this.numres < 1) {
            this.numres = 6;
        }
        this.db_index = fallbackNaN(parseInt, this.db_index, 999);
        if (this.db_index < 0 || (this.db_index > 37 && this.db_index !== 999)) {
            this.db_index = 999;
        }
    }

    async getSauce(url_input: string, settings: SauceNAOParams) {
        if (!this.api_key) {
            return {"error": "no api_key provided by webmaster"};
        }
        const logger = this.logger.child({fn: "getSauce"});
        this.minsim = getValueFromKey(settings, "minsim", 57.5);
        this.numres = getValueFromKey(settings, "limit", 6);
        this.db_index = getValueFromKey(settings, "db_index", 999);
        this.precheckSettings();
        this.saucenao = new SauceNAO({minsim: this.minsim, numres: this.numres, db_index: this.db_index, api_key: this.api_key});
        let build_url = [];
        build_url.push(`db=${this.db_index}`);
        build_url.push("output_type=2");
        build_url.push(`numres=${this.numres}`);
        build_url.push(`minsim=${this.minsim}!`);
        build_url.push(`api_key=${this.api_key}`);
        build_url.push(`url=${encodeURIComponent(url_input)}`);
        logger.info("Fetching sauce...");
        let response = await this.post(this.baseURL + `?${build_url.join("&")}`);
        logger.info("Sauce requested, parsing results...");
        return (await this.saucenao.generateResults(response));
    }
}

export class IQDBAPI extends RESTDataSource {
    minsim: number
    numres: number

    iqdb: IQDB
    logger: winston.Logger;

    constructor() {
        super();
        this.baseURL = "https://iqdb.org/index.xml";
        this.logger = MainLogger.child({cls: "IQDBRESTDS"});
    }

    private precheckSettings() {
        this.minsim = fallbackNaN(parseFloat, this.minsim, 47.5);
        if (this.minsim <= 0 || this.minsim >= 100) {
            this.minsim = 57.5;
        }
        this.numres = fallbackNaN(parseInt, this.numres, 6);
        if (this.numres < 1) {
            this.numres = 6;
        }
    }

    willSendRequest(request: RequestOptions) {
        request.headers.set("User-Agent", `ihaAPI/${packageJson["version"]} (https://github.com/ihateani-me/ihaapi-ts)`);
    }

    async getSauce(url_input: string, settings: IQDBParams) {
        const logger = this.logger.child({fn: "getSauce"});
        this.minsim = getValueFromKey(settings, "minsim", 57.5);
        this.numres = getValueFromKey(settings, "limit", 6);
        this.precheckSettings();
        this.iqdb = new IQDB(this.minsim);
        logger.info("Fetching sauce...");
        let response = await this.get(this.baseURL + `?url=${encodeURIComponent(url_input)}`);
        logger.info("Sauce requested, parsing results...");
        let parsed_data = await this.iqdb.generateResults(response);
        parsed_data = _.slice(parsed_data, 0, this.numres);
        return parsed_data;
    }
}
