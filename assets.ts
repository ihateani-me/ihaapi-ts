import * as express from "express";
import fs = require("fs");
import path = require("path");
const RUNNING_ON_GLITCH = process.env.PROJECT_REMIX_CHAIN;

const assets_router = express.Router();

if (RUNNING_ON_GLITCH) {
    const assets_data = fs.readFileSync(".glitch-assets", "utf-8");
    let rows_data = assets_data.split("\n");
    let assets = rows_data.map((row) => {
        try {
            return JSON.parse(row);
        } catch (e) { }
    })
    assets = assets.filter((asset) => asset);
    
    assets_router.use((request, response) => {
        response.header("Access-Control-Allow-Origin", "*");
        response.header("Access-Control-Allow-Methods", "GET");
        response.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    
        var path = request.path.substring(1);
    
        var [matching] = assets.filter((asset) => {
            if (asset.name)
                return asset.name.replace(/ /g, '%20') === path;
        });
    
        if (!matching || !matching.url) {
            return response.status(404).end("File not found.");
        }
    
        return response.redirect(matching.url);
    });
} else {
    assets_router.use(express.static(path.join(__dirname, "assets")));
}

export { assets_router as AssetsRoute };