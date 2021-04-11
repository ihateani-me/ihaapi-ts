import * as cons from "consolidate";

import express from "express";
import express_compression from "compression";
import express_cors from "cors";
import moment from "moment-timezone";
import mongoose from "mongoose";
import path from "path";
import { altairExpress } from "altair-express-middleware";
import { readFileSync } from "fs";

import * as Logger from "./utils/logger";
import * as Routes from "./routes";
import { GQLAPIv2Server } from "./graphql";

import htmlMinifier from "./utils/minifier";
import { capitalizeIt, is_none } from "./utils/swissknife";

import config from "./config";
import packageJson from "../package.json";

const logger = Logger.logger;

let mongouri = config.mongodb.uri;
if (typeof mongouri === "string" && mongouri.endsWith("/")) {
    mongouri = mongouri.slice(0, -1);
}

// eslint-disable-next-line prefer-const
let MONGO_VERSIONING = {
    type: "Unknown",
    version: "X.XX.XX",
};

logger.info("Connecting to database...");
const mongooseConfig: mongoose.ConnectOptions = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useFindAndModify: false,
};
let replicaEnabled = false;
if (!is_none(config.mongodb.replica_set) && config.mongodb.replica_set.length > 0) {
    mongooseConfig["replicaSet"] = config.mongodb.replica_set;
    replicaEnabled = true;
}
mongoose.connect(`${mongouri}/${config.mongodb.dbname}`, mongooseConfig);

mongoose.connection.on("open", () => {
    logger.info("Connected to VTubers Database!");
    const admin = mongoose.connection.db.admin();
    admin.serverInfo((_e, info) => {
        MONGO_VERSIONING["version"] = info.version;
        const modules = info.modules;
        if (modules.length > 0) {
            MONGO_VERSIONING["type"] = modules[0];
            MONGO_VERSIONING["type"] = capitalizeIt(MONGO_VERSIONING["type"]);
        } else {
            MONGO_VERSIONING["type"] = "Community";
        }
    });
});

const app = express();

// Opt-out of FLoC thing, even though I don't use ads
app.use((_q, res, next) => {
    res.setHeader("Permissions-Policy", "interest-cohort=()");
    next();
});

app.use(
    htmlMinifier({
        override: true,
        htmlMinifier: {
            removeComments: false,
            removeAttributeQuotes: false,
            minifyJS: true,
            minifyCSS: true,
            minifyURLs: true,
        },
    })
);
app.use(express_cors());

app.use("/robots.txt", (_q, res) => {
    res.send(`
        User-agent: *
        Disallow: /
    `);
});

app.use("/assets", Routes.AssetsRoute);

app.use(Logger.expressLogger);
app.use(express_compression());

app.engine("html", cons.ejs);
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

app.get("/", (_, res) => {
    const current_jst = moment().tz("Asia/Tokyo");
    const current_jst_fmt = current_jst.format("ddd MMM DD YYYY HH:mm:ss JST");
    let express_js_version = "Unknown";
    try {
        express_js_version = packageJson["dependencies"]["express"]
            .replace("^", "")
            .replace("~", "")
            .replace("*", "");
    } catch (e) {
        express_js_version = "Unknown";
    }
    res.render("index", {
        API_VERSION: packageJson["version"],
        MONGO_DBTYPE: MONGO_VERSIONING["type"],
        MONGO_DBVERSION: MONGO_VERSIONING["version"],
        MOMENT_TEMPLATE_TIME: current_jst_fmt,
        EXPRESS_JS_VERSION: express_js_version,
    });
});

app.get("/changelog", (_, res) => {
    const CHANGELOGS_FILE = readFileSync(path.join(__dirname, "..", "src", "changelog.json")).toString();
    res.render("changelog", {
        CHANGELOGS: JSON.parse(CHANGELOGS_FILE),
    });
});

// Echoback
app.head("/echo", (_, res) => {
    res.header({
        "Content-Length": 2,
        "Content-Type": "text/plain; charset=utf-8",
    });
    res.end();
});

app.get("/echo", (_, res) => {
    res.send("OK");
});

// Version 1 API

app.get("/api-docs", (_, res) => {
    res.render("rapidoc", {
        SPEC_URL: "/swagger.yml",
    });
});

app.all("/swagger", (_, res) => {
    res.redirect(302, "/api-docs");
});

app.all("/swagger.yml", (_, res) => {
    res.sendFile(path.join(__dirname, "..", "build", "swagger.yml"));
});

// Redirect all old links with v1 prefix.
app.use((req, res, next) => {
    const v1_redirect = [
        "nijisanji",
        "other",
        "twitch",
        "twitcasting",
        "games",
        "nh",
        "sauce",
        // Hololive url
        "live",
        "channels",
    ];
    const split_req_path = req.path.split("/").slice(1);
    if (!req.path.startsWith("/v1") && v1_redirect.includes(split_req_path[0])) {
        const parsequery = req.query;
        const parsed_params = [];
        if (parsequery) {
            for (const [qk, qv] of Object.entries(parsequery)) {
                parsed_params.push(`${qk}=${qv}`);
            }
        }
        let build_final_url = `/v1${req.path}`;
        if (parsed_params.length > 0) {
            build_final_url += `?${parsed_params.join("&")}`;
        }
        res.redirect(302, build_final_url);
    } else {
        next();
    }
});

const v1API = express.Router();

v1API.use("/", Routes.HoloRoutes);
v1API.use("/nijisanji", Routes.NijiRoutes);
v1API.use("/other", Routes.OthersRoutes);
v1API.use("/twitch", Routes.TwitchRoutes);
v1API.use("/twitcasting", Routes.TwitcastingRoutes);
v1API.use("/games", Routes.GamesRoutes);
v1API.use("/u2", Routes.U2Routes);
if (config.features.nhentai) {
    v1API.use("/nh", Routes.NHRoutes);
}
v1API.use("/jisho", Routes.JishoRoutes);
v1API.use("/sauce", Routes.SauceRoutes);
// Use new v1 prefix.
app.use("/v1", v1API);

// V2 API
app.get("/v2", (_, res) => {
    res.render("v2api");
});
// app.use("/v2/vtuber", Routes.VTAPIDashboardRoutes);
app.use("/v2/gql-docs", Routes.gqldocsRoutes);

// Bind Altair GraphQL IDE
const initialQuery = `query VTuberLives {
    vtuber {
        live {
            _total
            items {
                id
                title
                thumbnail
                platform
                group
            }
            pageInfo {
                nextCursor
                hasNextPage
            }
        }
    }
}
`;

app.use(
    "/v2/graphql",
    altairExpress({
        endpointURL: "/v2/graphql",
        initialQuery: initialQuery,
        initialHeaders: {
            "Accept-Encoding": "gzip",
        },
    })
);
GQLAPIv2Server.applyMiddleware({ app, path: "/v2/graphql" });

export { app, replicaEnabled, GQLAPIv2Server };
