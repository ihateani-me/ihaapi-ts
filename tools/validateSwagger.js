const path = require("path");
const SwaggerParser = require("@apidevtools/swagger-parser");

// eslint-disable-next-line @typescript-eslint/no-unused-vars
SwaggerParser.validate(path.join(__dirname, "..", "build", "swagger.yml"), (err, _a) => {
    if (err) {
        console.error("Failed to validate swagger schema");
        console.error(err);
        throw new Error(`Validation failed, ${err.toString()}`);
    } else {
        console.info("Swagger Schema is valid!");
    }
});
