import express from "express";

const VTAPIDashboardRoutes = express.Router();

// Public page
VTAPIDashboardRoutes.get("/", (_, res) => {
    res.redirect("https://vtuber.ihateani.me/");
});
VTAPIDashboardRoutes.get("/live", (_, res) => {
    res.redirect("https://vtuber.ihateani.me/lives");
});
VTAPIDashboardRoutes.get("/lives", (_, res) => {
    res.redirect("https://vtuber.ihateani.me/lives");
});
VTAPIDashboardRoutes.get("/schedule", (_, res) => {
    res.redirect("https://vtuber.ihateani.me/schedules");
});
VTAPIDashboardRoutes.get("/schedules", (_, res) => {
    res.redirect("https://vtuber.ihateani.me/schedules");
});
VTAPIDashboardRoutes.get("/setting", (_, res) => {
    res.redirect("https://vtuber.ihateani.me/settings");
});
VTAPIDashboardRoutes.get("/settings", (_, res) => {
    res.redirect("https://vtuber.ihateani.me/settings");
});
VTAPIDashboardRoutes.all("/access", (_, res) => {
    res.redirect("https://vtuber.ihateani.me/admin/access");
});
VTAPIDashboardRoutes.get("/admin", (_, res) => {
    res.redirect("https://vtuber.ihateani.me/admin");
});

export { VTAPIDashboardRoutes };
