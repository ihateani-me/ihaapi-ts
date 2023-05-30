import _ from "lodash";
import axios, { AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse, Method } from "axios";
import xml2js from "xml2js";

import { filter_empty, is_none } from "../swissknife";

import packageJson from "../../../package.json";
import { Logger } from "winston";

export interface AnyDict {
    [key: string]: any;
}

export interface ImageBoardResultsBase<TRes> {
    results: TRes[];
    total_data: number;
    engine: string;
    isError: boolean;
}

const CHROME_UA =
    // eslint-disable-next-line max-len
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.190 Safari/537.36";
const IHAAPI_UA = `ihaapi-ts/${packageJson["version"]} (https://github.com/ihateani-me/ihaapi-ts)`;

class ImageBoard<TResult extends AnyDict, TMapping extends AnyDict> {
    protected sesi: AxiosInstance;
    protected mappings!: TMapping;
    protected logger!: Logger;

    constructor(BASE_URL: string, useChromeUA: boolean = false) {
        this.sesi = axios.create({
            headers: {
                "User-Agent": useChromeUA ? CHROME_UA : IHAAPI_UA,
            },
            baseURL: BASE_URL,
        });
    }

    private metaTagChecks(tagName: string): boolean {
        if (tagName.startsWith("rating:")) {
            return true;
        } else if (tagName.startsWith("order:")) {
            return true;
        } else if (tagName.startsWith("parent:")) {
            return true;
        } else if (tagName.startsWith("set:")) {
            return true;
        } else if (tagName.startsWith("pool:")) {
            return true;
        } else if (tagName.startsWith("date:")) {
            return true;
        } else if (tagName.startsWith("score:")) {
            return true;
        } else if (tagName.startsWith("id:")) {
            return true;
        }
        return false;
    }

    protected normalizeTags(tagsSet: string[], limit: number = 2, forceLower: boolean = true): string[] {
        if (is_none(tagsSet)) {
            tagsSet = [];
        }
        tagsSet = tagsSet.filter((tag) => typeof tag === "string" && tag.length > 0 && tag);
        if (forceLower) {
            tagsSet = tagsSet.map((tag) => tag.replace(" ", "_").toLowerCase());
        }
        const nonMetaTags = tagsSet.filter((tag) => !this.metaTagChecks(tag));
        const subNonMetaTags = nonMetaTags.slice(0, limit);
        const diffs = _.difference(nonMetaTags, subNonMetaTags);
        if (diffs.length > 0) {
            tagsSet = _.without(tagsSet, ...diffs);
        }
        return tagsSet;
    }

    protected async request<R>(
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
            if (err instanceof AxiosError) {
                if (err.response) {
                    return [err.response.data, err.response.status];
                }
            }
            // @ts-ignore
            return [{}, 503];
        }
        return [resp.data, resp.status];
    }

    protected async parseJson<R extends { [key: string]: any }>(dataset: R | R[]): Promise<TResult[]> {
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
                        let convType;
                        if (typeof value === "string" && value.includes("##")) {
                            [value, convType] = value.split("##");
                            convType = convType.toLowerCase();
                        }
                        let selectFallback;
                        if (typeof value === "string" && value.includes("||")) {
                            selectFallback = value.split("||");
                        }
                        let data: string | number | string[] | R[any] | null | undefined;
                        if (typeof selectFallback !== "undefined") {
                            selectFallback.forEach((sel) => {
                                if (typeof data === "string") {
                                    // @ts-ignore
                                    if (data !== "" && data !== " " && data.length > 0) {
                                        return;
                                    }
                                } else if (typeof data === "number") {
                                    return;
                                } else if (typeof data === "object" && data !== null) {
                                    return;
                                }
                                data = _.get(main_data, sel);
                            });
                        } else {
                            data = _.get(main_data, value);
                        }
                        if (is_none(data)) {
                            collectVal.push("");
                            return;
                        }
                        if (typeof convType === "string") {
                            if (convType === "float" || convType === "int") {
                                // @ts-ignore
                                data = parseFloat(data);
                            } else if (convType === "str") {
                                // @ts-ignore
                                data = data.toString();
                            }
                        }
                        if (typeof sep === "string" && typeof data === "string") {
                            // @ts-ignore
                            data = filter_empty(data.split(sep));
                        }
                        collectVal.push(data);
                    });
                    return filter_empty(collectVal);
                } else {
                    let sep;
                    if (typeof value === "string" && value.startsWith("++")) {
                        sep = value[2];
                        value = value.substring(5);
                    }
                    let convType;
                    if (typeof value === "string" && value.includes("##")) {
                        [value, convType] = value.split("##");
                        convType = convType.toLowerCase();
                    }
                    let selectFallback;
                    if (typeof value === "string" && value.includes("||")) {
                        selectFallback = value.split("||");
                    }
                    let data: string | number | string[] | R[any] | null | undefined;
                    if (typeof selectFallback !== "undefined") {
                        selectFallback.forEach((sel) => {
                            if (typeof data === "string") {
                                // @ts-ignore
                                if (data !== "" && data !== " " && data.length > 0) {
                                    return;
                                }
                            } else if (typeof data === "number") {
                                return;
                            } else if (typeof data === "object" && data !== null) {
                                return;
                            }
                            data = _.get(main_data, sel);
                        });
                    } else {
                        data = _.get(main_data, value);
                    }
                    if (is_none(data)) {
                        return "";
                    }
                    if (typeof convType === "string") {
                        if (convType === "float" || convType === "int") {
                            // @ts-ignore
                            data = parseFloat(data);
                        } else if (convType === "str" && typeof data !== "string") {
                            // @ts-ignore
                            data = data.toString();
                        }
                    }
                    if (typeof sep === "string" && typeof data === "string") {
                        // @ts-ignore
                        data = filter_empty(data.split(sep));
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
                .catch((err): TResult => {
                    logger.error("Failed to parse some data, ignoring...");
                    console.error(err);
                    // @ts-ignore
                    return {};
                })
        );

        const finalized = await Promise.all(tasksManager);
        return finalized;
    }

    protected async xmlToJSON<R extends AnyDict>(
        xmlData: string,
        path?: string,
        useAttrs: boolean = true
    ): Promise<R[] | R> {
        const parsedXML = await xml2js.parseStringPromise(xmlData);
        if (typeof path === "undefined") {
            return useAttrs ? parsedXML["$"] : parsedXML;
        }
        const selectedList: AnyDict[] = _.get(parsedXML, path);
        const remapped: R[] = selectedList.map((res: AnyDict) => {
            return useAttrs ? res["$"] : res;
        });
        return remapped;
    }
}

export abstract class ImageBoardBase<TRes extends AnyDict, TMap extends AnyDict> extends ImageBoard<
    TRes,
    TMap
> {
    abstract search(query: string[]): Promise<ImageBoardResultsBase<TRes>>;
    abstract random(query: string[]): Promise<ImageBoardResultsBase<TRes>>;
}
