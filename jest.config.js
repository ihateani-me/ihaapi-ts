module.exports = {
    preset: "ts-jest",
    testEnvironment: "node",
    verbose: true,
    silent: true,
    collectCoverage: true,
    transform: {
        "^.+\\.(t|j)sx?$": ["@swc/jest"],
    },
};
