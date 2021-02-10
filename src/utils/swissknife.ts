// A collection of utility dubbed swiss knife (as in swiss knife army.)

/**
 * Check if the variable is a null type or not.
 * @param { any } key - things that want to be checked.
 * @returns { boolean } `true` or `false`
 */
export function is_none<T>(key: T): boolean {
    if (typeof key === "undefined" || key === null) {
        return true;
    }
    return false;
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
export function hasKey<T>(object_data: T, key_name: string): boolean {
    if (is_none(object_data)) {
        return false;
    }
    if (Object.keys(object_data).includes(key_name)) {
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
export function getValueFromKey<T>(object_data: T, key_name: string, defaults: any = null): any {
    if (is_none(object_data)) {
        return defaults;
    }
    if (!hasKey(object_data, key_name)) {
        return defaults;
    }
    const all_keys = Object.keys(object_data);
    const index = all_keys.findIndex((key) => key === key_name);
    // @ts-ignore
    return object_data[all_keys[index]] || undefined;
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
    try {
        // @ts-ignore
        input_data = input_data.toLowerCase();
    } catch (error) {
        // @ts-ignore
        input_data = input_data.toString().toLowerCase();
    }
    switch (input_data) {
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
export function removeKeyFromObjects<T>(array_of_object: T, key_base: string): any {
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
        delete obj[key_base];
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
export function fallbackNaN<T, S>(cb: Function, to_convert: T, fallback?: S): T | S | undefined {
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
