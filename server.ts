require('dotenv').config();
import * as express from "express";
import * as cons from "consolidate";
import { VTubersDB } from "./dbconn";
import * as Routes from "./routes";
import moment = require('moment-timezone');
import { AssetsRoute } from "./assets";
const swaggerDocument = require('./swagger.json');

const app = express();
const app_version = "0.9.0";

app.engine("html", cons.atpl);
app.set("view engine", "html");
app.set("views", __dirname + "/views");

app.get("/", (_, res) => {
    res.render("home", {
        API_VERSION: app_version,
        MONGO_DBTYPE: VTubersDB.dbtype,
        MONGO_DBVERSION: VTubersDB.version
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

app.get("/ugh", (_, res) => {
    res.send("I'M AWAKEEEEEEEEEEEEE");
});

app.use("/", Routes.HoloRoutes);
app.use("/nijisanji", Routes.NijiRoutes);
app.use("/other", Routes.OthersRoutes);
app.use("/twitch", Routes.TwitchRoutes);
app.use("/twitcasting", Routes.TwitcastingRoutes);
app.use("/museid", Routes.MuseIDRoutes);

app.use(function (req, res, next) {
    let current_utc = moment().tz("UTC").unix();
    res.status(404).json({"time": current_utc, "status": 404, "message": `path '${req.path}' not found.`});
})

const listener = app.listen(process.env.PORT, () => {
    console.log("VTB API is now up and running!");
    // @ts-ignore
    console.log("http://127.0.0.1:" + listener.address().port + "\n");
});