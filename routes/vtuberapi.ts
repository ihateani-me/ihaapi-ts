import express from "express";

const vtapiRoutes = express.Router();

// Public page
vtapiRoutes.get("/", (_, res) => {
    res.redirect("https://vtuber.ihateani.me/");
})
vtapiRoutes.get("/live", (_, res) => {
    res.redirect("https://vtuber.ihateani.me/lives");
})
vtapiRoutes.get("/lives", (_, res) => {
    res.redirect("https://vtuber.ihateani.me/lives");
})
vtapiRoutes.get("/schedule", (_, res) => {
    res.redirect("https://vtuber.ihateani.me/schedules");
})
vtapiRoutes.get("/schedules", (_, res) => {
    res.redirect("https://vtuber.ihateani.me/schedules");
})
vtapiRoutes.get("/setting", (_, res) => {
    res.redirect("https://vtuber.ihateani.me/settings");
})
vtapiRoutes.get("/settings", (_, res) => {
    res.redirect("https://vtuber.ihateani.me/settings");
})
vtapiRoutes.all("/access", (_, res) => {
    res.redirect("https://vtuber.ihateani.me/admin/access");
})
vtapiRoutes.get("/admin", (_, res) => {
    res.redirect("https://vtuber.ihateani.me/admin");
})
export { vtapiRoutes };
