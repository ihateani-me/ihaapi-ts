import nanomemoize from "nano-memoize";

function mapFunction(name: string, fn: () => any) {
    return function(this: any, ...args: any[]) {
        const bound = fn.bind(this);
        const value = (nanomemoize as (...args: any[]) => ((...args: any[]) => any))(bound);
        Object.defineProperty(this, name, {value});
        return value(...args);
    }
}

function memoGet(name: string, fn: () => any) {
    return function(this: any) {
        const value = fn.apply(this);
        Object.defineProperty(this, name, {value});
        return value;
    };
}

export function Memoize() {
    return (target: {}, propKey: string, descriptor: PropertyDescriptor) => {
        const val = descriptor.value;
        if (typeof val === "function") {
            descriptor.value = mapFunction(propKey, val as () => any);
            return;
        }
        const get = descriptor.get;
        if (get != null) {
            descriptor.get = memoGet(propKey, get);
        }
    }
}
