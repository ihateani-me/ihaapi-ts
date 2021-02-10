const shelljs = require("shelljs");
const path = require("path");
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerDefs = require("../src/utils/swaggerDef");
const fs = require("fs");

shelljs.mkdir("-p", path.join(__dirname, "..", "build"));

const options = {
    swaggerDefinition: swaggerDefs,
    apis: ["src/routes/*.ts"],
    format: ".yml",
}

const swaggerSpec = swaggerJsdoc(options);
fs.writeFileSync(path.join(__dirname, "..", "build", "swagger.yml"), swaggerSpec);