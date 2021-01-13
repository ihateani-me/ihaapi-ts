export class MongooseDataSources<TData, TContext = any> {
    protected model: TData
    protected context: TContext

    constructor(model: TData) {
        this.model = model;
    }

    // @ts-ignore
    initialize({context, cache} = {}) {
        this.context = context;
    }
}
