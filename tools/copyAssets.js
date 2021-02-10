const shelljs = require("shelljs");

shelljs.cp("-R", "src/views", "build/views");
shelljs.cp("-R", "src/assets", "build/assets");
