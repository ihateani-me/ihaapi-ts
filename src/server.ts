import * as cons from "consolidate";

import express from "express";
import express_compression from "compression";
import express_cors from "cors";
import mongoose from "mongoose";
import moment from "moment-timezone";
import path from "path";
import { altairExpress } from "altair-express-middleware";

import * as Routes from "./routes";
import * as Logger from "./utils/logger";
import htmlMinifier from "./utils/minifier";

import config from "./config";
import packageJson from "../package.json";
import changelog from "./changelog.json";

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
mongoose.connect(`${mongouri}/${process.env.MONGODB_DBNAME}`, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useFindAndModify: false,
});

mongoose.connection.on("open", () => {
    logger.info("Connected to VTubers Database!");
    const admin = mongoose.connection.db.admin();
    admin.serverInfo((_e, info) => {
        MONGO_VERSIONING["version"] = info.version;
        const modules = info.modules;
        if (modules.length > 0) {
            MONGO_VERSIONING["type"] = modules[0];
            // MONGO_VERSIONING["type"] = capitalizeIt(MONGO_VERSIONING["type"]);
        } else {
            MONGO_VERSIONING["type"] = "Community";
        }
    });
});

const app = express();
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
    res.render("changelog", {
        CHANGELOGS: changelog,
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
    res.render("redoc", {
        SPEC_URL: "/swagger.yml",
    });
});

app.all("/swagger", (_, res) => {
    res.redirect(302, "/api-docs");
});

// Redirect all old links with v1 prefix.
app.use((req, res, next) => {
    const v1_redirect = [
        "nijisanji",
        "other",
        "twitch",
        "twitcasting",
        "museid",
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

// v1API.use("/", Routes.HoloRoutes);
// v1API.use("/nijisanji", Routes.NijiRoutes);
// v1API.use("/other", Routes.OthersRoutes);
// v1API.use("/twitch", Routes.TwitchRoutes);
// v1API.use("/twitcasting", Routes.TwitcastingRoutes);
// v1API.use("/museid", Routes.MuseIDRoutes);
// v1API.use("/games", Routes.GamesRoutes);
// v1API.use("/u2", Routes.U2Routes);
// v1API.use("/nh", Routes.NHRoutes);
// v1API.use("/sauce", Routes.SauceRoutes);
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
// GQLAPIv2Server.applyMiddleware({ app, path: "/v2/graphql" });
// if (process.env.REPLICA_ENABLED === "y") {
//     logger.info("Binding GraphQL Subscription WS Handler")
//     GQLAPIv2Server.installSubscriptionHandlers(httpServer);
// }

app.use(Logger.expressErrorLogger);
app.use(function (req, res, next) {
    const current_utc = moment().tz("UTC").unix();
    res.status(404).json({ time: current_utc, status: 404, message: `path '${req.path}' not found.` });
    next();
});

export { app };
