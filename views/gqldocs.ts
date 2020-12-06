import express from "express";
const gqldocsRoutes = express.Router({strict: true});

gqldocsRoutes.use((_, res, next) => {
    res.header({
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS, HEAD"
    })
    next()
});

gqldocsRoutes.get("/", (req, res) => {
    res.render("gqldocs_home");
})

gqldocsRoutes.get("/vtuber", (_, res) => {
    res.render("gqldocs_template", {
        API_NAME: "VTuber API",
        API_DESCRIPTION: "An endpoint focused on VTubers streaming status and channel statistics.",
        GRAPHQL_ENDPOINT: "/v2/vtuber"
    })
})

gqldocsRoutes.get("/sauce", (_, res) => {
    res.render("gqldocs_template", {
        API_NAME: "Sauce API",
        API_DESCRIPTION: "Find your image sauce using SauceNAO, IQDB, or ASCII2D with one single API.",
        GRAPHQL_ENDPOINT: "/v2/sauce"
    })
})

export { gqldocsRoutes };