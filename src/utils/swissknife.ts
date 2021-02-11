// A collection of utility dubbed swiss knife (as in swiss knife army.)

export type Nulled = null | undefined;
export type Unknown = unknown | never;

/**
 * Check if the variable is a null type or not.
 * @param { any } key - things that want to be checked.
 * @returns { boolean } `true` or `false`
 */
export function is_none(value: any): value is Nulled {
    return typeof value === "undefined" || value === null;
}

/**
 * Filter out data that provided and remove all empty string from Array.
 * @param { any[] } data - Data that need to be filtered.
 * @returns { any[] } Data that has been filtered.
 */
export function filter_empty(data: null | any[]): any[] {
    const filtered: any[] = [];
    if (typeof data === "undefined" || data === null) {
        return [];
    }
    data.forEach((val) => {
        if (val) {
            filtered.push(val);
        }
    });
    return filtered;
}

/**
 * Check if an Object have a key.
 * @param { Object } object_data - an Object that need checking.
 * @param { string } key_name - key that will be checked.
 * @returns { boolean } `true` or `false`
 */
export function hasKey<T extends object, K extends keyof T>(
    object_data: T | undefined | null,
    key_name: K | string | undefined | null
): boolean {
    if (is_none(object_data) || is_none(key_name)) {
        return false;
    }
    if (Object.keys(object_data).includes(key_name as string)) {
        return true;
    }
    return false;
}

/**
 * Get a key of an Object.
 * @param { Object } object_data - an Object that need checking.
 * @param { string } key_name - key that will be checked.
 * @param { string } defaults - fallback
 * @returns { string } value of the inputted key.
 */
export function getValueFromKey<T extends object, K extends keyof T, S = any>(
    object_data: T | undefined | null,
    key_name: K | string | undefined | null,
    defaults: S | undefined | null = null
): T[K] | S | Nulled {
    if (is_none(object_data)) {
        if (is_none(defaults)) {
            // @ts-ignore
            return null;
        }
        return defaults;
    }
    if (!hasKey(object_data, key_name as K)) {
        if (is_none(defaults)) {
            // @ts-ignore
            return null;
        }
        return defaults;
    }
    const all_keys = Object.keys(object_data) as K[];
    const index = all_keys.findIndex((key) => key === key_name);
    return object_data[all_keys[index]];
}

/**
 * Map a string to a boolean, used for Express query.
 * @param { any } input_data - data to map
 * @returns { boolean } mapped boolean
 */
export function map_bool<T extends any>(input_data: T): boolean {
    if (is_none(input_data)) {
        return false;
    }
    let fstat = false;
    let data: any;
    if (typeof input_data === "string") {
        data = input_data.toLowerCase() as string;
    } else if (typeof input_data === "number") {
        data = input_data.toString().toLowerCase() as string;
    } else if (typeof input_data === "object") {
        data = JSON.stringify(input_data);
    } else {
        // @ts-ignore
        data = input_data.toString().toLowerCase();
    }
    switch (data) {
        case "y":
            fstat = true;
            break;
        case "enable":
            fstat = true;
            break;
        case "true":
            fstat = true;
            break;
        case "1":
            fstat = true;
            break;
        case "yes":
            fstat = true;
            break;
        default:
            break;
    }
    return fstat;
}

export function sortObjectsByKey<T>(results: T, key_base: string): T {
    if (is_none(results)) {
        return results;
    }
    if (!Array.isArray(results)) {
        return results;
    }
    if (results.length < 2) {
        return results;
    }
    if (!hasKey(results[0], key_base)) {
        return results;
    }
    const data_sort: any[] = [];
    const cant_be_sorted: any[] = [];
    const results_sorted: any[] = [];
    results.forEach((res, index) => {
        if (!hasKey(res, key_base)) {
            cant_be_sorted.push(res);
        } else {
            data_sort.push([index.toString(), res[key_base]]);
        }
    });
    data_sort.sort((a, b) => {
        return a[1] - b[1];
    });
    data_sort.forEach((value_map) => {
        let index_res = value_map[0];
        index_res = parseInt(index_res);
        results_sorted.push(results[index_res]);
    });
    // @ts-ignore
    const finalized_results: T = results_sorted.concat(cant_be_sorted);
    return finalized_results;
}

/**
 * Capitalize a string.
 * @param { string } text - text that need capitalizing.
 * @returns { string } capitalized string
 */
export function capitalizeIt(text: null | string): string {
    if (typeof text === "undefined" || text === null) {
        // @ts-ignore
        return text;
    }
    return text.slice(0, 1).toUpperCase() + text.slice(1);
}

/**
 * Remove a key from Array of Object
 * @param array_of_object - array of object to remove it's key.
 * @param key_base - key to remove.
 */
export function removeKeyFromObjects<T extends object, K extends keyof T>(
    array_of_object: T[] | T | any | Nulled,
    key_base: K | string
): T[] | Nulled {
    if (is_none(array_of_object)) {
        return array_of_object;
    }
    if (!Array.isArray(array_of_object)) {
        return array_of_object;
    }
    if (!hasKey(array_of_object[0], key_base)) {
        return array_of_object;
    }
    const fixed_array_of_object = array_of_object.map((obj) => {
        delete obj[key_base as K];
        return obj;
    });
    return fixed_array_of_object;
}

/**
 * Convert a string/number to a number using fallback if it's NaN (Not a number).
 * If fallback is not specified, it will return to_convert.
 * @param cb parseFloat or parseInt function that will be run
 * @param to_convert number or string to convert
 * @param fallback fallback number
 */
export function fallbackNaN<F extends Function, T, S>(cb: F, to_convert: T, fallback?: S): T | S {
    if (isNaN(cb(to_convert))) {
        return is_none(fallback) ? to_convert : fallback;
    } else {
        return cb(to_convert);
    }
}

export function rng(max: number): number {
    return Math.floor(Math.random() * max);
}

const ASCII_LOWERCASE = "abcdefghijklmnopqrstuvwxyz";
const ASCII_UPPERCASE = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const NUMBERS = "0123456789";
export function generateCustomString(length = 8, includeNumbers = false, includeUppercase = false): string {
    let letters_used = ASCII_LOWERCASE;
    if (includeNumbers) {
        letters_used += NUMBERS;
    }
    if (includeUppercase) {
        letters_used += ASCII_UPPERCASE;
    }
    const charlengths = letters_used.length;
    let generated = "";
    for (let i = 0; i < length; i++) {
        generated += letters_used.charAt(rng(charlengths));
    }
    return generated;
}
