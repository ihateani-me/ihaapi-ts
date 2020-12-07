import express from "express";
const gqldocsRoutes = express.Router({strict: true});

gqldocsRoutes.use((_, res, next) => {
    res.header({
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS, HEAD"
    })
    next()
});

gqldocsRoutes.get("/", (_, res) => {
    res.render("gqldocs_template", {
        API_NAME: "GraphQL v2 API",
        API_DESCRIPTION: "A version 2 of ihateani.me API using GraphQL",
        GRAPHQL_ENDPOINT: "/v2/graphql"
    })
})

export { gqldocsRoutes };