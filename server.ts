require('dotenv').config();
import express from "express";
import * as cons from "consolidate";
import { VTubersDB } from "./dbconn";
import * as Routes from "./routes";
import moment = require('moment-timezone');
import { AssetsRoute } from "./assets";
import { gqldocsRoutes } from "./views/gqldocs";
import express_compression from "compression";

import APIV2GQL from "./graphql";

const API_CHANGELOG = require("./views/changelog.json");
const packageJson = require("./package.json");

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
        MONGO_DBTYPE: VTubersDB.dbtype,
        MONGO_DBVERSION: VTubersDB.version,
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

app.get("/ugh", (_, res) => {
    res.send("I'M AWAKEEEEEEEEEEEEE");
});

app.use("/", Routes.HoloRoutes);
app.use("/nijisanji", Routes.NijiRoutes);
app.use("/other", Routes.OthersRoutes);
app.use("/twitch", Routes.TwitchRoutes);
app.use("/twitcasting", Routes.TwitcastingRoutes);
app.use("/museid", Routes.MuseIDRoutes);
app.use("/games", Routes.GamesRoutes);
app.use("/u2", Routes.U2Routes);
app.use("/nh", Routes.NHRoutes);
app.use("/sauce", Routes.SauceRoutes);
app.get("/v2", (_, res) => {
    res.render("v2api");
})
app.use("/v2/gql-docs", gqldocsRoutes);

APIV2GQL.applyMiddleware({ app, path: "/v2/vtuber" });

app.use(function (req, res, next) {
    let current_utc = moment().tz("UTC").unix();
    res.status(404).json({"time": current_utc, "status": 404, "message": `path '${req.path}' not found.`});
})

const listener = app.listen(4200, () => {
    console.log("🚀 VTB API is now up and running!");
    // @ts-ignore
    console.log("http://127.0.0.1:" + listener.address().port + "\n");
    console.log(`Access GraphQL V2 API here: http://127.0.0.1:4200${APIV2GQL.graphqlPath}`);
});