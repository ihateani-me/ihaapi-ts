import { getModelForClass } from "@typegoose/typegoose";
import { AnyParamConstructor, BeAnObject, ReturnModelType } from "@typegoose/typegoose/lib/types";

export class MongooseDataSources<TData extends AnyParamConstructor<any>, TContext = any, TCache = any> {
    protected model: ReturnModelType<TData, BeAnObject>;
    protected context: TContext | undefined;
    protected cache: TCache | undefined;

    constructor(model: TData) {
        this.model = getModelForClass(model);
    }

    // @ts-ignore
    initialize({ context, cache } = {}) {
        this.context = context;
        this.cache = cache;
    }
}
