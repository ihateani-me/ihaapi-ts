require('dotenv').config();
import express from "express";
import * as cons from "consolidate";
import mongoose from 'mongoose';
import * as Routes from "./routes";
import moment = require('moment-timezone');
import { AssetsRoute } from "./assets";
import { gqldocsRoutes } from "./views/gqldocs";
import express_compression from "compression";

import { GQLAPIv2Server } from "./graphql";
import { capitalizeIt } from "./utils/swissknife";

const API_CHANGELOG = require("./views/changelog.json");
const packageJson = require("./package.json");

let mongouri = process.env.MONGODB_URI;
if (mongouri.endsWith("/")) {
    mongouri = mongouri.slice(0, -1);
}

let MONGO_VERSIONING = {
    "type": "Unknown",
    "version": "X.XX.XX",
};

console.info("Connecting to database...");
mongoose.connect(`${mongouri}/${process.env.MONGODB_DBNAME}`, {useNewUrlParser: true, useUnifiedTopology: true, useFindAndModify: false});
console.info("Connected.");

mongoose.connection.on("open", () => {
    let admin = mongoose.connection.db.admin();
    admin.serverInfo((err, info) => {
        MONGO_VERSIONING["version"] = info.version;
        let modules = info.modules;
        if (modules.length > 0) {
            MONGO_VERSIONING["type"] = modules[0];
            MONGO_VERSIONING["type"] = capitalizeIt(MONGO_VERSIONING["type"]);
        } else {
            MONGO_VERSIONING["type"] = "Community";
        }
    })
})

const app = express();
const app_version = packageJson["version"];

app.engine("html", cons.atpl);
app.set("view engine", "html");
app.set("views", __dirname + "/views");

app.use(express_compression());

app.get("/", (_, res) => {
    let current_jst = moment().tz("Asia/Tokyo");
    let current_jst_fmt = current_jst.format("ddd MMM DD YYYY HH:mm:ss JST");
    let express_js_version = "Unknown"; 
    try {
        express_js_version = packageJson["dependencies"]["express"].replace("^", "").replace("~", "").replace("*", "");
    } catch (e) {}
    res.render("home", {
        API_VERSION: app_version,
        MONGO_DBTYPE: MONGO_VERSIONING["type"],
        MONGO_DBVERSION: MONGO_VERSIONING["version"],
        MOMENT_TEMPLATE_TIME: current_jst_fmt,
        EXPRESS_JS_VERSION: express_js_version
    })
});

app.use("/assets", AssetsRoute);

app.get("/swagger.yml", (_, res) => {
    res.sendFile(__dirname + "/swagger.yml");
});

app.get("/api-docs", (_, res) => {
    res.render("redoc", {
        SPEC_URL: "/swagger.yml"
    })
});

app.all("/swagger", (_, res) => {
    res.redirect("/api-docs", 302);
});

app.get("/changelog", (_, res) => {
    res.render("changelog", {
        CHANGELOGS: API_CHANGELOG
    })
})

// echoback
app.head("/echo", (_, res) => {
    res.header({
        "Content-Length": 2,
        "Content-Type": "text/plain; charset=utf-8"
    })
    res.end();
})

app.get("/echo", (_, res) => {
    res.send("OK");
})

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
        "channels"
    ];
    let split_req_path = req.path.split("/").slice(1);
    if (!req.path.startsWith("/v1") && v1_redirect.includes(split_req_path[0])) {
        let parsequery = req.query;
        let parsed_params = [];
        if (parsequery) {
            for (let [qk, qv] of Object.entries(parsequery)) {
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
})

const v1API = express.Router();

v1API.use("/", Routes.HoloRoutes);
v1API.use("/nijisanji", Routes.NijiRoutes);
v1API.use("/other", Routes.OthersRoutes);
v1API.use("/twitch", Routes.TwitchRoutes);
v1API.use("/twitcasting", Routes.TwitcastingRoutes);
v1API.use("/museid", Routes.MuseIDRoutes);
v1API.use("/games", Routes.GamesRoutes);
v1API.use("/u2", Routes.U2Routes);
v1API.use("/nh", Routes.NHRoutes);
v1API.use("/sauce", Routes.SauceRoutes);
// Use new v1 prefix.
app.use("/v1", v1API);
app.get("/v2", (_, res) => {
    res.render("v2api");
})
app.use("/v2/gql-docs", gqldocsRoutes);

GQLAPIv2Server.applyMiddleware({ app, path: "/v2/graphql" });

app.use(function (req, res, next) {
    let current_utc = moment().tz("UTC").unix();
    res.status(404).json({"time": current_utc, "status": 404, "message": `path '${req.path}' not found.`});
})

const listener = app.listen(4200, () => {
    console.log("🚀 VTB API is now up and running!");
    // @ts-ignore
    console.log("http://127.0.0.1:" + listener.address().port + "\n");
    console.log(`Access GraphQL V2 API here: http://127.0.0.1:4200${GQLAPIv2Server.graphqlPath}`);
});