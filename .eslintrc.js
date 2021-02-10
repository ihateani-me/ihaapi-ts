module.exports = {
    root: true,
    parser: "@typescript-eslint/parser",
    plugins: [
        "@typescript-eslint",
    ],
    extends: [
        "eslint:recommended",
        "plugin:@typescript-eslint/recommended",
        "prettier",
        "prettier/@typescript-eslint"
    ],
    "env": {
        "node": true
    },
    "rules": {
        "quotes": [
            "error",
            "double",
            {
                "allowTemplateLiterals": true
            }
        ],
        "semi": [
            "error",
            "always",
            {
                "omitLastInOneLineBlock": true
            }
        ],
        "no-trailing-spaces": "error",
        "max-len": [
            "error",
            {
                "code": 110,
                "tabWidth": 4,
                "ignoreComments": true,
                "ignoreUrls": true
            }
        ],
        "comma-dangle": [
            "error",
            {
                "arrays": "only-multiline",
                "objects": "only-multiline",
                "functions": "never",
                "imports": "only-multiline",
                "exports": "never",
            }
        ],
        "eol-last": [
            "warning",
            "always"
        ]
    },
    "overrides": [
        {
            "files": ["**/*.js", "**/*.jsx"],
            "rules": {
                "@typescript-eslint/no-var-requires": "off",
            }
        }
    ],
};