import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, Method } from "axios";

import { is_none } from "../swissknife";

import packageJson from "../../../package.json";
import { Logger } from "winston";
import _ from "lodash";

interface AnyDict {
    [key: string]: any;
}

export interface ImageBoardResultsBase<TRes> {
    results: TRes[];
    total_data: number;
    engine: string;
    isError: boolean;
}

class ImageBoard<TResult extends AnyDict, TMapping extends AnyDict> {
    protected sesi: AxiosInstance;
    protected mappings!: TMapping;
    protected logger!: Logger;

    constructor(BASE_URL: string) {
        this.sesi = axios.create({
            headers: {
                "User-Agent": `ihaapi-ts/${packageJson["version"]} (https://github.com/ihateani-me/ihaapi-ts)`,
            },
            baseURL: BASE_URL,
        });
    }

    protected async request<R extends { [key: string]: any }>(
        method: Method,
        path: string,
        extraArgs: AxiosRequestConfig
    ): Promise<[R, number]> {
        const defaults: AxiosRequestConfig = {
            method: method,
            url: path,
        };
        const mergedOptions = Object.assign({}, defaults, extraArgs);
        let resp: AxiosResponse<R>;
        try {
            resp = await this.sesi.request<R>(mergedOptions);
        } catch (err) {
            if (err.response) {
                return [err.response.data, err.response.status];
            }
            // @ts-ignore
            return [{}, 503];
        }
        return [resp.data, resp.status];
    }
    async parseJson<R extends { [key: string]: any }>(dataset: R | R[]): Promise<TResult[]> {
        const logger = this.logger.child({ fn: "parseJson" });
        let properDataset: R[];
        if (!Array.isArray(dataset)) {
            properDataset = [dataset];
        } else {
            properDataset = dataset;
        }

        async function internalMapper(main_data: R, mappings: TMapping): Promise<TResult> {
            function mapIt(value: any): any | any[] {
                if (Array.isArray(value)) {
                    const collectVal: any[] = [];
                    value.forEach((elem) => {
                        let sep;
                        if (typeof elem === "string" && elem.startsWith("++")) {
                            sep = elem[2];
                            elem = elem.substring(5);
                        }
                        let data = _.get(main_data, elem);
                        if (is_none(data)) {
                            collectVal.push("");
                            return;
                        }
                        if (typeof sep === "string" && typeof data === "string") {
                            data = data.split(sep);
                        }
                        collectVal.push(data);
                    });
                    return collectVal;
                } else {
                    let sep;
                    if (typeof value === "string" && value.startsWith("++")) {
                        sep = value[2];
                        value = value.substring(5);
                    }
                    let data = _.get(main_data, value);
                    if (is_none(data)) {
                        return "";
                    }
                    if (typeof sep === "string" && typeof data === "string") {
                        data = data.split(sep);
                    }
                    return data;
                }
            }

            // @ts-ignore
            const finalized: TResult = {};
            const isObject = (val: any) => typeof val === "object" && !Array.isArray(val);
            const recurseIt = (obj = {}, prevKey: string[] = []) => {
                // @ts-ignore
                Object.entries(obj).reduce((_prod, [key, value]) => {
                    const path = _.concat(prevKey, key);
                    isObject(value)
                        ? recurseIt(value as any, prevKey.concat(key))
                        : _.set(finalized, path.join("."), mapIt(value));
                    return key;
                }, []);
            };
            recurseIt(mappings);
            return finalized;
        }

        const tasksManager = properDataset.map((data) =>
            internalMapper(data, this.mappings)
                .then((res) => {
                    return res;
                })
                .catch(
                    (err): TResult => {
                        logger.error("Failed to parse some data, ignoring...");
                        console.error(err);
                        // @ts-ignore
                        return {};
                    }
                )
        );

        const finalized = await Promise.all(tasksManager);
        return finalized;
    }
}

export abstract class ImageBoardBase<TRes extends AnyDict, TMap extends AnyDict> extends ImageBoard<
    TRes,
    TMap
> {
    abstract search(query: string[]): Promise<ImageBoardResultsBase<TRes>>;
    abstract random(query: string[]): Promise<ImageBoardResultsBase<TRes>>;
}
