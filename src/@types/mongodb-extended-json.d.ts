declare module "mongodb-extended-json" {
    export function stringify(
        value: object,
        replacer?: Function | Array,
        space?: number | string
    ): string

    export function parse(
        text: string,
        reviver?: Function,
        mode?: "strict" | "shell" | "log" = "strict"
    ): object

    export function deserialize(
        data: any
    ): any

    export function serialize(
        value: any
    ): any

    export function reviver(
        k: string,
        v: any
    ): any
};