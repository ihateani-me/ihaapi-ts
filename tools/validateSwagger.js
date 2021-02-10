const fs = require("fs");
const path = require("path");
const SwaggerParser = require("@apidevtools/swagger-parser");

SwaggerParser.validate(path.join(__dirname, "..", "build", "swagger.yml"), (err, api) => {
    if (err) {
        console.error("Failed to validate swagger schema");
        console.error(err);
        throw new Error(`Validation failed, ${err.toString()}`);
    } else {
        console.info("Swagger Schema is valid!")
    }
})