
/**
 * Check if the variable is a null type or not.
 * @param key - things that want to be checked.
 */
export function is_none(key: any): boolean {
    if (key == undefined || key == null) {
        return true;
    } else if (typeof key == "undefined") {
        return true;
    }
    return false;
}

/**
 * Filter out data that provided and remove all empty string from Array.
 * @param data - Data that need to be filtered.
 */
export function filter_empty(data: string[]) {
    let filtered: string[] = [];
    data.forEach((val => {
        if (val) {
            filtered.push(val);
        };
    }));
    return filtered;
}

export function hasKey(object_data: any, key_name: string): boolean {
    if (is_none(object_data)) {
        return false;
    }
    if (Object.keys(object_data).includes(key_name)) {
        return true;
    }
    return false;
}

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
        case "Y":
            fstat = true;
            break;
        case "D":
            fstat = true;
            break;
        case "true":
            fstat = true;
            break;
        case 1:
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