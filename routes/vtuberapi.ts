import express from "express";
import passport from "passport";
import bodyparser from "body-parser";
import express_session from "express-session";
import csurf from "csurf";
import { ensureLoggedIn } from "connect-ensure-login";
import { Strategy as LocalStrategy } from "passport-local";
import { generateCustomString, getValueFromKey, is_none } from "../utils/swissknife";
import { TwitchHelix } from "../utils/twitchapi";
import { ttvChannelDataset, twcastChannelsDataset, vtapiRemoveVTuber, youtubeChannelDataset } from "../utils/vtadmin";
import { logger as TopLogger } from "../utils/logger";
const MainLogger = TopLogger.child({cls: "Routes.VTuberAPI"});

const vtapiRoutes = express.Router();

passport.use(new LocalStrategy({
    usernameField: "_token"
    },
    (user, password, done) => {
        if (password !== process.env.VTAPI_ADMIN_PASSWORD) {
            return done(null, false, { message: "Incorrect admin password." });
        }
        return done(null, user);
    }
));

var TTVAPI;
if (!is_none(process.env.TWITCH_API_CLIENT) && !is_none(process.env.TWITCH_API_SECRET)) {
    TTVAPI = new TwitchHelix(process.env.TWITCH_API_CLIENT, process.env.TWITCH_API_SECRET);
}

passport.serializeUser(function(user, cb) {
    cb(null, user);
});

passport.deserializeUser(function (id, cb) {
    cb(null, id);
});

const csrfProtected = csurf();
vtapiRoutes.use(bodyparser.urlencoded({extended: true}));

let superSecretKeys = generateCustomString(25, true, true);
vtapiRoutes.use(express_session({secret: `ihaapi_${superSecretKeys}`, name: "ihaapi", resave: true, saveUninitialized: false}));
vtapiRoutes.use(require("flash")());
vtapiRoutes.use(passport.initialize());
vtapiRoutes.use(passport.session());

// Public page
vtapiRoutes.get("/", (_, res) => {
    res.render("vtubersdata");
})
vtapiRoutes.get("/live", (_, res) => {
    res.redirect(302, "/v2/vtuber/lives");
})
vtapiRoutes.get("/lives", (_, res) => {
    res.render("vtubersdata_lives");
})
vtapiRoutes.get("/schedule", (_, res) => {
    res.redirect(302, "/v2/vtuber/schedules");
})
vtapiRoutes.get("/schedules", (_, res) => {
    res.render("vtubersdata_schedules");
})
vtapiRoutes.get("/setting", (_, res) => {
    res.redirect(302, "/v2/vtuber/settings");
})
vtapiRoutes.get("/settings", (_, res) => {
    res.render("vtubersdata_settings");
})

// Admin page
vtapiRoutes.get("/access", csrfProtected, (req, res) => {
    let err_msg = null;
    // @ts-ignore
    if (req.session.flash.length > 0) {
        // @ts-ignore
        err_msg = req.session.flash[0].message;
    }
    res.render("vtuberapi_login", {
        ERROR_MSG: err_msg,
        CSRF_TOKEN: req.csrfToken()
    });
    // @ts-ignore
    if (req.session.flash.length > 0) {
        // @ts-ignore
        req.session.flash = [];
    }
})

vtapiRoutes.post("/access", passport.authenticate("local", {failureRedirect: "/v2/vtuber/access", failureFlash: true}), (req, res) => {
    res.redirect("/v2/vtuber/admin");
})

vtapiRoutes.get("/logout", (req, res) => {
    req.logout();
    res.redirect("/v2/vtuber");
})

vtapiRoutes.get("/admin", ensureLoggedIn("/v2/vtuber/access"), (_q, res) => {
    res.render("vtuberapi_admindashboard");
})

vtapiRoutes.use(express.json());

vtapiRoutes.post("/admin/add", ensureLoggedIn("/v2/vtuber/access"), async (req, res, next) => {
    const logger = MainLogger.child({fn: "AdminAdd"});
    let jsonBody = req.body;
    let channelId = getValueFromKey(jsonBody, "channel", undefined);
    let group = getValueFromKey(jsonBody, "group", undefined);
    let platform = getValueFromKey(jsonBody, "platform", undefined);
    let en_name = getValueFromKey(jsonBody, "en_name", undefined);
    if (is_none(channelId)) {
        return res.status(400).json({"success": 0, "error": "Missing Channel ID"});
    }
    if (is_none(platform)) {
        return res.status(400).json({"success": 0, "error": "Missing Platform"});
    }
    if (is_none(group)) {
        return res.status(400).json({"success": 0, "error": "Missing Group"});
    }
    if (is_none(en_name) || en_name.length < 1 || en_name === "" || en_name === " ") {
        return res.status(400).json({"success": 0, "error": "Missing Romanized Name"});
    }
    if (!["youtube", "twitch", "twitcasting"].includes(platform)) {
        return res.status(400).json({"success": 0, "error": `Unknown "${platform}" platform.`});
    }
    logger.info(`Request received, adding ${channelId} (${group}) to ${platform} data`);
    try {
        // @ts-ignore
        let success, error;
        if (platform === "youtube") {
            [success, error] = await youtubeChannelDataset(channelId, group, en_name);
        } else if (platform === "twitch") {
            if (is_none(TTVAPI)) {
                success = false;
                error = "Web Admin doesn't give a Twitch API Information to use in the environment table."
            } else {
                [success, error] = await ttvChannelDataset(channelId, group, en_name, TTVAPI);
            }
        } else if (platform === "twitcasting") {
            [success, error] = await twcastChannelsDataset(channelId, group, en_name);
        }
        res.json({"success": success ? 1 : 0, "error": error});
    } catch (error) {
        res.status(500).json({"success": 0, "error": error.toString()});
    }
})

vtapiRoutes.post("/admin/delete", ensureLoggedIn("/v2/vtuber/access"), async (req, res, next) => {
    const logger = MainLogger.child({fn: "AdminRemove"});
    let jsonBody = req.body;
    let channelId = getValueFromKey(jsonBody, "channel", undefined);
    let platform = getValueFromKey(jsonBody, "platform", undefined);
    if (is_none(channelId)) {
        return res.status(400).json({"success": 0, "error": "Missing Channel ID"});
    }
    if (is_none(platform)) {
        return res.status(400).json({"success": 0, "error": "Missing Platform"});
    }
    if (!["youtube", "twitch", "twitcasting"].includes(platform)) {
        return res.status(400).json({"success": 0, "error": `Unknown "${platform}" platform.`});
    }
    try {
        // @ts-ignore
        logger.info(`Request received, removing ${channelId} from ${platform} data`);
        let [success, error] = await vtapiRemoveVTuber(channelId, platform);
        logger.info(`Request finished, ${channelId} from ${platform} data have been removed`);
        res.json({"success": success ? 1 : 0, "error": error});
    } catch (error) {
        res.status(500).json({"success": 0, "error": error.toString()});
    }
})

export { vtapiRoutes };
