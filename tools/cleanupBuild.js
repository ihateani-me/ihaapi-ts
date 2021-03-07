const fs = require("fs");
const path = require("path");
const shelljs = require("shelljs");

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach((f) => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
    });
}

walkDir(path.join(__dirname, "..", "build"), (fp) => {
    if (fp.endsWith(".test.ts") || fp.endsWith(".test.js")) {
        console.info(`Removing test file: ${path.basename(fp)}`);
        shelljs.rm(fp);
    }
});
