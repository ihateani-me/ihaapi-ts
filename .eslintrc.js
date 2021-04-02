module.exports = {
    root: true,
    parser: "@typescript-eslint/parser",
    plugins: ["@typescript-eslint"],
    extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended", "prettier"],
    env: {
        node: true,
    },
    rules: {
        quotes: [
            "error",
            "double",
            {
                allowTemplateLiterals: true,
            },
        ],
        semi: [
            "error",
            "always",
            {
                omitLastInOneLineBlock: true,
            },
        ],
        "no-trailing-spaces": "error",
        "max-len": [
            "error",
            {
                code: 110,
                tabWidth: 4,
                ignoreComments: true,
                ignoreUrls: true,
                ignoreRegExpLiterals: true,
            },
        ],
        "comma-dangle": [
            "error",
            {
                arrays: "only-multiline",
                objects: "only-multiline",
                functions: "never",
                imports: "only-multiline",
                exports: "never",
            },
        ],
        "no-empty": ["error", { allowEmptyCatch: true }],
        "eol-last": ["warn", "always"],
        "no-constant-condition": ["error", { checkLoops: false }],
        "sort-imports": [
            "warn",
            {
                ignoreCase: true,
                ignoreDeclarationSort: true,
                ignoreMemberSort: false,
                memberSyntaxSortOrder: ["none", "all", "single", "multiple"],
                allowSeparatedGroups: true,
            },
        ],
        "@typescript-eslint/ban-types": "off",
        "@typescript-eslint/ban-ts-comment": "off",
        "@typescript-eslint/no-explicit-any": "off",
        "@typescript-eslint/explicit-module-boundary-types": "off",
        "@typescript-eslint/no-inferrable-types": ["warn", { ignoreParameters: true }],
    },
    overrides: [
        {
            files: ["**/*.js", "**/*.jsx"],
            rules: {
                "@typescript-eslint/no-var-requires": "off",
            },
        },
    ],
};
