import _ from "lodash";
import { Document, FilterQuery, Types } from "mongoose";

import { SortOrder } from "../../graphql/schemas";
import { fallbackNaN } from "../../utils/swissknife";

export interface IPaginateOptions {
    limit?: number
    project?: {}
    sortBy?: string
    sortOrder?: SortOrder
    cursor?: string
}

export interface IPaginationInfo {
    totalData?: number
    hasNextPage: boolean
    nextCursor?: string
}

export interface IPaginateResults<T> {
    docs: T[]
    pageInfo: IPaginationInfo
}

export async function pagination<S extends Document>(query: FilterQuery<S>, options?: IPaginateOptions) {
    // @ts-ignore
    let cursor = _.get(options, "cursor", undefined);
    let limit = fallbackNaN(parseInt, _.get(options, "limit", 25), 25) + 1;
    let projection = _.get(options, "project", undefined);
    let aggregateShits = [];
    aggregateShits.push({
        "$sort": {
            "_id": ["asc", "ascending"].includes(_.get(options, "sortOrder", "asc").toLowerCase()) ? 1 : -1
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

const VideoDBMap = {
    "id": "id",
    "title": "title",
    "status": "status",
    "scheduledStartTime": "timedata.scheduledStartTime",
    "timedata.scheduledStartTime": "timedata.scheduledStartTime",
    "timeData.scheduledStartTime": "timedata.scheduledStartTime",
    "startTime": "timedata.startTime",
    "timedata.startTime": "timedata.startTime",
    "timeData.startTime": "timedata.startTime",
    "endTime": "timedata.endTime",
    "timedata.endTime": "timedata.endTime",
    "timeData.endTime": "timedata.endTime",
    "lateBy": "timedata.lateTime",
    "timedata.lateBy": "timedata.lateTime",
    "timeData.lateBy": "timedata.lateTime",
    "duration": "timedata.duration",
    "timedata.duration": "timedata.duration",
    "timeData.duration": "timedata.duration",
    "publishedAt": "timedata.publishedAt",
    "timedata.publishedAt": "timedata.publishedAt",
    "timeData.publishedAt": "timedata.publishedAt",
    "viewers": "viewers",
    "peakViewers": "peakViewers",
    "averageViewers": "averageViewers",
    "channel_id": "channel_id",
    "platform": "platform"
}

const ChannelDBMap = {
    "id": "id",
    "name": "name",
    "en_name": "en_name",
    "description": "description",
    "publishedAt": "publishedAt",
    "image": "thumbnail",
    "group": "group",
    "statistics.subscriberCount": "subscriberCount",
    "statistics.viewCount": "viewCount",
    "statistics.videoCount": "videoCount",
    "statistics.followerCount": "followerCount",
    "platform": "platform"
}

export function remapSchemaToDatabase(key: string, type: "v" | "ch", defaults?: string): string {
    if (type === "v") {
        let mapped = _.get(VideoDBMap, key, typeof defaults === "string" ? defaults : "_id");
        return mapped;
    } else if (type == "ch") {
        let mapped = _.get(ChannelDBMap, key, typeof defaults === "string" ? defaults : "_id");
        return mapped;
    }
    return "_id";
}