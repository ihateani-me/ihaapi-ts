import { MongoDataSource } from 'apollo-datasource-mongodb'
import _ from 'lodash';
import moment from "moment-timezone";
import { MildomChannelDocs, MildomChannelProps, MildomVideoDocs, MildomVideoProps } from '../../dbconn/models';
import { GroupsResults } from '../../utils/models';
import { is_none } from '../../utils/swissknife';

export class MildomLive extends MongoDataSource<MildomVideoDocs> {
    async getLive(status: string, channel_ids: string[] = null, groups: string[] = null) {
        let lookbackMax = moment.tz("UTC").unix() - (24 * 3600);
        let fetchFormat = {
            "status": {"$eq": status},
            "$or": [{"timedata.endTime": {"$gte": lookbackMax}}, {"timedata.endTime": {"$type": "null"}}],
        };
        if (!is_none(channel_ids) && Array.isArray(channel_ids) && channel_ids.length > 0) {
            fetchFormat["channel_id"] = {"$in": channel_ids};
        }
        if (!is_none(channel_ids) && Array.isArray(groups) && channel_ids.length > 0) {
            fetchFormat["group"] = {"$in": groups};
        }
        // @ts-ignore
        const livesData: MildomVideoProps[] = await this.model.find(fetchFormat);
        return livesData;
    }
}

export class MildomChannel extends MongoDataSource<MildomChannelDocs> {
    async getChannels(channel_ids: string[] = null, groups: string[] = null) {
        let matchFormat = {};
        if (!is_none(channel_ids) && Array.isArray(channel_ids) && channel_ids.length > 0) {
            matchFormat["id"] = { "$in": channel_ids };
        }
        if (!is_none(groups) && Array.isArray(groups) && groups.length > 0) {
            matchFormat["group"] = { "$in": groups };
        }
        let aggregateReq = [];
        if (Object.keys(matchFormat).length > 0) {
            aggregateReq.push({
                "$match": matchFormat
            })
        }
        // omit history because it's resource hog
        let projectFormat = {
            "_id": 0,
            "history": 0,
            "__v": 0
        }
        aggregateReq.push({
            "$project": projectFormat,
        })
        // @ts-ignore
        const channelsData: MildomChannelProps[] = await this.model.aggregate(aggregateReq);
        return channelsData;
    }

    async getChannelHistory(channel_id: string): Promise<MildomChannelProps> {
        let historyReq = [{
            "$match": {
                "id": {"$eq": channel_id}
            }
        },
        {
            "$project": {
                "id": 1,
                "history": 1,
            }
        }]
        let raw_results = await this.model.aggregate(historyReq);
        return _.nth(raw_results, 0);
    }

    async getGroups(): Promise<string[]> {
        let groups_results: GroupsResults[] = await this.model.aggregate([
            {
                "$project": {
                    "group": 1,
                }
            }
        ])
        return _.uniq(_.map(groups_results, "group"));
    }
}
