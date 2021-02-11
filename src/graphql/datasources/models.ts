export class MongooseDataSources<TData, TContext = any, TCache = any> {
    protected model: TData;
    protected context: TContext | undefined;
    protected cache: TCache | undefined;

    constructor(model: TData) {
        this.model = model;
    }

    // @ts-ignore
    initialize({ context, cache } = {}) {
        this.context = context;
        this.cache = cache;
    }
}
