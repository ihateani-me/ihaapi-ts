// A collection of utility dubbed swiss knife (as in swiss knife army.)

import { type } from "os";

/**
 * Check if the variable is a null type or not.
 * @param { any } key - things that want to be checked.
 * @returns { boolean } `true` or `false`
 */
export function is_none(key: any): boolean {
    if (typeof key == "undefined") {
        return true;
    } else if (key == null) {
        return true;
    }
    return false;
}

/**
 * Filter out data that provided and remove all empty string from Array.
 * @param { string[] } data - Data that need to be filtered.
 * @returns { string[] } Data that has been filtered.
 */
export function filter_empty(data: string[]): string[] {
    let filtered: string[] = [];
    if (is_none(data)) {
        return [];
    }
    data.forEach((val => {
        if (val) {
            filtered.push(val);
        };
    }));
    return filtered;
}

/**
 * Check if an Object have a key.
 * @param { Object } object_data - an Object that need checking.
 * @param { string } key_name - key that will be checked.
 * @returns { boolean } `true` or `false`
 */
export function hasKey(object_data: any, key_name: string): boolean {
    if (is_none(object_data)) {
        return false;
    }
    if (Object.keys(object_data).includes(key_name)) {
        return true;
    }
    return false;
}

/**
 * Map a string to a boolean, used for Express query.
 * @param { any } input_data - data to map
 * @returns { boolean } mapped boolean
 */
export function map_bool(input_data: any): boolean {
    if (input_data == null || input_data == undefined) {
        return false;
    }
    let fstat = false;
    try {
        input_data = input_data.toLowerCase();
    } catch (error) { input_data = input_data.toString().toLowerCase(); };
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