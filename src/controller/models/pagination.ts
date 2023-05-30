// The code is based on mongo-cursor-pagination-alt
// Modified to fit mongoose more

import _ from "lodash";
import base64Url from "base64-url";
import { EJSON, ObjectId } from "bson";
import { FilterQuery, PipelineStage } from "mongoose";

import { SortOrder } from "../../graphql/schemas";
import { fallbackNaN, Nullable } from "../../utils/swissknife";
import { AnyParamConstructor, ReturnModelType } from "@typegoose/typegoose/lib/types";

export type BaseDocument = {
    _id: ObjectId;
};

export type CursorObject = {
    [key: string]: any;
};

export type Query = {
    [key: string]: any;
};

type SortActual = Record<string, 1 | -1>;
type SortAny = Record<string, number>;

export type Projection = {
    [key: string]: any;
};

export interface IPaginateOptions {
    limit?: number;
    project?: {};
    sortBy?: string;
    sortOrder?: SortOrder;
    cursor?: string;
}

export interface IPaginationInfo {
    totalData?: number;
    hasNextPage: boolean;
    nextCursor?: string | null;
}

export interface IPaginateResults<T> {
    docs: T[];
    pageInfo: Nullable<IPaginationInfo>;
}

export const buildCursor = <TDocument extends AnyParamConstructor<any>>(
    document: TDocument,
    sort: SortAny
): CursorObject => {
    return Object.keys(sort).reduce((acc, key) => {
        acc[key] = _.get(document, key);
        return acc;
    }, {} as CursorObject);
};

export const encodeCursor = (cursorObject: CursorObject): string => {
    return base64Url.encode(EJSON.stringify(cursorObject));
};

export const decodeCursor = (cursorString: string): CursorObject => {
    return EJSON.parse(base64Url.decode(cursorString)) as CursorObject;
};

export const buildQueryFromCursor = (sort: SortAny, cursor: CursorObject): Query => {
    // Consider the `cursor`:
    // { createdAt: '2020-03-22', color: 'blue', _id: 4 }
    //
    // And the `sort`:
    // { createdAt: 1, color: -1 }
    //
    // The following table represents our documents (already sorted):
    // ┌────────────┬───────┬─────┐
    // │  createdAt │ color │ _id │
    // ├────────────┼───────┼─────┤
    // │ 2020-03-20 │ green │   1 │ <--- Line 1
    // │ 2020-03-21 │ green │   2 │ <--- Line 2
    // │ 2020-03-22 │ green │   3 │ <--- Line 3
    // │ 2020-03-22 │ blue  │   4 │ <--- Line 4 (our cursor points to here)
    // │ 2020-03-22 │ blue  │   5 │ <--- Line 5
    // │ 2020-03-22 │ amber │   6 │ <--- Line 6
    // │ 2020-03-23 │ green │   7 │ <--- Line 7
    // │ 2020-03-23 │ green │   8 │ <--- Line 8
    // └────────────┴───────┴─────┘
    //
    // In that case, in order to get documents starting after our cursor, we need
    // to make sure any of the following clauses is true:
    // - { createdAt: { $gt: '2020-03-22' } }                                          <--- Lines: 7 and 8
    // - { createdAt: { $eq: '2020-03-22' }, color: { $lt: 'blue' } }                  <--- Lines: 6
    // - { createdAt: { $eq: '2020-03-22' }, color: { $eq: 'blue' }, _id: { $gt: 4 } } <--- Lines: 5
    const cursorEntries = Object.entries(cursor);

    // So here we build an array of the OR clauses as mentioned above
    const clauses = cursorEntries.reduce((clauses, [outerKey], index) => {
        const currentCursorEntries = cursorEntries.slice(0, index + 1);

        const clause = currentCursorEntries.reduce((clause, [key, value]) => {
            // Last item in the clause uses an inequality operator
            if (key === outerKey) {
                const sortOrder = sort[key] ?? 1;
                const operator = sortOrder < 0 ? "$lt" : "$gt";
                clause[key] = { [operator]: value };
                return clause;
            }

            // The rest use the equality operator
            clause[key] = { $eq: value };
            return clause;
        }, {} as Query);

        clauses.push(clause);
        return clauses;
    }, [] as Query[]);

    return { $or: clauses };
};

type NormalizedParams = {
    limit: number;
    cursor: CursorObject | null;
    sort: SortActual;
    paginatingBackwards: boolean;
    first?: number;
};

export const normalizeDirectionParams = ({
    first,
    after,
    last,
    before,
    sort = {},
}: {
    first?: number | null;
    after?: string | null;
    last?: number | null;
    before?: string | null;
    sort?: SortAny;
}): NormalizedParams => {
    // In case our sort object doesn't contain the `_id`, we need to add it
    if (!("_id" in sort)) {
        sort = {
            ...sort,
            // Important that it's the last key of the object to take the least priority
            _id: 1,
        };
    }

    if (last != null) {
        // Paginating backwards
        return {
            limit: Math.max(1, last ?? 20),
            cursor: before ? decodeCursor(before) : null,
            sort: _.mapValues(sort, (value) => (value * -1 > 0 ? 1 : -1)),
            paginatingBackwards: true,
        };
    }

    // Paginating forwards
    return {
        limit: Math.max(1, first ?? 20),
        cursor: after ? decodeCursor(after) : null,
        sort: _.mapValues(sort, (value) => (value > 0 ? 1 : -1)),
        paginatingBackwards: false,
    };
};

const VideoDBMap = {
    id: "id",
    title: "title",
    status: "status",
    scheduledStartTime: "timedata.scheduledStartTime",
    "timedata.scheduledStartTime": "timedata.scheduledStartTime",
    "timeData.scheduledStartTime": "timedata.scheduledStartTime",
    startTime: "timedata.startTime",
    "timedata.startTime": "timedata.startTime",
    "timeData.startTime": "timedata.startTime",
    endTime: "timedata.endTime",
    "timedata.endTime": "timedata.endTime",
    "timeData.endTime": "timedata.endTime",
    lateBy: "timedata.lateTime",
    "timedata.lateBy": "timedata.lateTime",
    "timeData.lateBy": "timedata.lateTime",
    duration: "timedata.duration",
    "timedata.duration": "timedata.duration",
    "timeData.duration": "timedata.duration",
    publishedAt: "timedata.publishedAt",
    "timedata.publishedAt": "timedata.publishedAt",
    "timeData.publishedAt": "timedata.publishedAt",
    viewers: "viewers",
    peakViewers: "peakViewers",
    averageViewers: "averageViewers",
    channel_id: "channel_id",
    platform: "platform",
};

const ChannelDBMap = {
    id: "id",
    name: "name",
    en_name: "en_name",
    description: "description",
    publishedAt: "publishedAt",
    image: "thumbnail",
    group: "group",
    "statistics.subscriberCount": "subscriberCount",
    "statistics.viewCount": "viewCount",
    "statistics.videoCount": "videoCount",
    "statistics.followerCount": "followerCount",
    platform: "platform",
};

export function remapSchemaToDatabase(key: string, type: "v" | "ch", defaults?: string): string {
    if (type === "v") {
        const mapped = _.get(VideoDBMap, key, typeof defaults === "string" ? defaults : "_id");
        return mapped;
    } else if (type == "ch") {
        const mapped = _.get(ChannelDBMap, key, typeof defaults === "string" ? defaults : "_id");
        return mapped;
    }
    return "_id";
}

export interface FindPaginatedResult<T> {
    edges: {
        node: T;
        cursor: string;
    }[];
    pageInfo: {
        startCursor: string | null;
        endCursor: string | null;
        hasPreviousPage: boolean;
        hasNextPage: boolean;
    };
}

export interface FindPaginatedParams {
    first?: number;
    after?: string;
    last?: number;
    before?: string;
    query?: Query;
    sort?: SortAny;
    projection?: Projection;
    originalSort?: SortAny;
}

export const findPaginationMongoose = async <TDocument extends AnyParamConstructor<any>>(
    model: ReturnModelType<TDocument>,
    { first, after, last, before, query = {}, sort: originalSort = {}, projection = {} }: FindPaginatedParams
): Promise<FindPaginatedResult<InstanceType<TDocument>>> => {
    const { limit, cursor, sort, paginatingBackwards } = normalizeDirectionParams({
        first,
        after,
        last,
        before,
        sort: originalSort,
    });

    const aggroParams: PipelineStage[] = [
        {
            $match: !cursor ? query : { $and: [query, buildQueryFromCursor(sort, cursor)] },
        },
        {
            $sort: sort,
        },
        {
            $limit: limit + 1,
        },
    ];
    if (typeof projection === "object" && Object.keys(projection).length > 1) {
        aggroParams.push({ $project: projection });
    }

    const allDocuments = (await model.aggregate(aggroParams).exec()) as InstanceType<TDocument>[];

    const extraDocument = allDocuments[limit];
    const hasMore = Boolean(extraDocument);

    const desiredDocuments = allDocuments.slice(0, limit);
    if (paginatingBackwards) {
        desiredDocuments.reverse();
    }
    const edges = desiredDocuments.map((document) => {
        return {
            cursor: encodeCursor(buildCursor(document, sort)),
            node: document,
        };
    });

    return {
        edges,
        pageInfo: {
            startCursor: edges[0]?.cursor ?? null,
            endCursor: edges[edges.length - 1]?.cursor ?? null,
            hasPreviousPage: paginatingBackwards ? hasMore : Boolean(after),
            hasNextPage: paginatingBackwards ? Boolean(before) : hasMore,
        },
    };
};

export const countDocuments = async <TDocument extends AnyParamConstructor<any>>(
    model: ReturnModelType<TDocument>,
    query: FilterQuery<TDocument>
): Promise<number> => {
    return await model.countDocuments(query).exec();
};

export default async function paginationHelper<TDoc extends AnyParamConstructor<any>>(
    model: ReturnModelType<TDoc>,
    query: FilterQuery<TDoc>,
    options?: IPaginateOptions
) {
    const cursor = _.get(options, "cursor", undefined);
    const limit = fallbackNaN(parseInt, _.get(options, "limit", 25), 25);
    const projection = _.get(options, "project", undefined);
    const sortKey = remapSchemaToDatabase(_.get(options, "sortBy", "_id"), "ch", "name");
    const sortMeth: any = {};
    sortMeth[sortKey] = ["asc", "ascending"].includes(_.get(options, "sortOrder", "asc").toLowerCase())
        ? 1
        : -1;
    const paginationParams: any = {
        first: limit,
    };
    if (typeof cursor === "string" && cursor.length > 0) {
        paginationParams["after"] = cursor;
    }
    paginationParams["sort"] = sortMeth;
    if (typeof projection === "object" && Object.keys(projection).length > 0) {
        paginationParams["projection"] = projection;
    }
    paginationParams["query"] = query;

    const docsResults = await findPaginationMongoose<TDoc>(model, paginationParams);
    const totalCount = await countDocuments<TDoc>(model, query);
    const allDocuments = docsResults.edges.map((x) => x.node);
    return {
        docs: allDocuments,
        pageInfo: {
            hasNextPage: docsResults.pageInfo.hasNextPage,
            nextCursor: docsResults.pageInfo.endCursor,
            totalData: totalCount,
        },
    };
}
