import { Connection, Document, Model, Schema, PaginateModel, model, FilterQuery, PaginateOptions, PaginateResult, Aggregate, AggregatePaginateResult } from 'mongoose';
import { Extract } from "ts-mongoose";

import mongoosePaginate from "mongoose-paginate-v2";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

interface PaginateModelCustom<T extends Document> extends Model<T> {
    paginate(
        query: FilterQuery<T>,
        options?: PaginateOptions,
        callback?: (err: any, result: PaginateResult<T>) => void,
    ): Promise<PaginateResult<T>>;
    aggregatePaginate(
        query?: Aggregate<T[]>,
        options?: PaginateOptions,
        callback?: (err: any, result: AggregatePaginateResult<T>) => void,
    ): Promise<AggregatePaginateResult<T>>;
}

// Original function from ts-mongoose, modified for my own usage
export function typedPaginatingModel<T extends Schema, S extends {
    [name: string]: Function;
}>(name: string, schema?: T, collection?: string, skipInit?: boolean, statics?: S & ThisType<Model<Document & Extract<T>>>, connection?: Connection): PaginateModelCustom<Document & Extract<T>> & S {
    if (schema && statics) {
        schema.statics = statics;
    }
    if (connection) {
        let connectModel = connection.model(name, schema, collection);
        // @ts-ignore
        if (typeof connectModel.paginate === "undefined") {
            schema.plugin(mongoosePaginate);
            connectModel = connection.model(name, schema, collection)
        }
        // @ts-ignore
        if (typeof normalModel.aggregatePaginate === "undefined") {
            schema.plugin(mongooseAggregatePaginate);
            connectModel = connection.model(name, schema, collection, skipInit);
        }
        // @ts-ignore
        return connectModel;
    }
    let normalModel: Model<Document> = model(name, schema, collection, skipInit);
    // @ts-ignore
    if (typeof normalModel.paginate === "undefined") {
        schema.plugin(mongoosePaginate);
        normalModel = model(name, schema, collection, skipInit);
    }
    // @ts-ignore
    if (typeof normalModel.aggregatePaginate === "undefined") {
        schema.plugin(mongooseAggregatePaginate);
        normalModel = model(name, schema, collection, skipInit);
    }
    // @ts-ignore
    return normalModel;
}

