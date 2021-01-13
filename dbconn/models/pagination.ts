import _ from "lodash";
import { Model, Document, Schema, FilterQuery, Types } from "mongoose";
import { Extract } from "ts-mongoose";
import { fallbackNaN } from "../../utils/swissknife";

export interface IPaginateOptions {
    limit: number
    project: {}
    cursor: string
}

export interface IPaginateResults<T> {
    // @ts-ignore
    docs: T[]
    pageInfo: {
        totalData?: number
        hasNextPage: boolean
        nextCursor?: string
    }
}

export async function pagination<T extends Schema, S extends Document>(this: Model<Document & Extract<T>>, query: FilterQuery<S>, options?: IPaginateOptions) {
    // @ts-ignore
    let cursor = _.get(options, "cursor", undefined);
    let limit = fallbackNaN(parseInt, _.get(options, "limit", 25), 25) + 1;
    let projection = _.get(options, "project", undefined);
    let aggregateShits = [];
    aggregateShits.push({
        "$sort": {
            "_id": 1
        }
    })
    let cleanQuery = _.cloneDeep(query);
    if (typeof cursor === "string" && cursor.length > 0) {
        // @ts-ignore
        query["_id"] = {"$gte": new Types.ObjectId(cursor)};
    }
    aggregateShits.push({
        "$match": query,
    })
    if (typeof projection === "object" && Object.keys(projection).length > 0) {
        aggregateShits.push({
            "$project": projection,
        })
    }
    aggregateShits.push({
        "$limit": limit
    })
    console.log(aggregateShits, cleanQuery, query);
    let promises = [{fn: this.aggregate.bind(this), name: "docs"}, {fn: this.countDocuments.bind(this), "name": "count"}].map((req) => (
        // @ts-ignore
        req.fn(req.name === "count" ? query : aggregateShits)
            // @ts-ignore
            .then((res: T[] | number) => {
                return res;
            })
            .catch((res) => {
                if (req.name === "count") {
                    return 0;
                }
                return {};
            })
    ))
    // @ts-ignore
    let [docsResults, countResults]: [T[], number] = await Promise.all(promises);
    let hasNext = docsResults.length === limit ? true : false;
    let nextCursor = null;
    if (hasNext) {
        let tNextCursor = _.get(_.last(docsResults), "_id", "").toString();
        if (tNextCursor !== "") {
            nextCursor = tNextCursor;
        }
    }
    docsResults = _.take(docsResults, limit - 1);
    return {
        "docs": docsResults,
        "pageInfo": {
            "totalData": countResults,
            "hasNextPage": hasNext,
            "nextCursor": nextCursor
        }
    }

}