import { MongoDataSource } from 'apollo-datasource-mongodb'
import { ObjectId } from 'mongodb'
import { is_none } from '../../utils/swissknife';

export interface TwitcastingLiveData {
    id: string
    title: string
    startTime: number
    channel: string
    viewers: number
    peakViewers: number
    group: string
    platform: string
}

interface TwitcastingLiveDocument {
    _id: ObjectId
    live: TwitcastingLiveData[]
}

export class TwitcastingLive extends MongoDataSource<TwitcastingLiveDocument> {
    async getLive(user_ids: string[] = null) {
        let get_data = await this.collection.find().toArray();
        let live_data = get_data[0]["live"];
        let new_live_data: TwitcastingLiveData[] = [];
        if (is_none(user_ids) || user_ids.length < 1) {
            for (let i = 0; i < live_data.length; i++) {
                let elem = live_data[i];
                new_live_data.push(elem);
            }
        } else {
            for (let i = 0; i < live_data.length; i++) {
                let elem = live_data[i];
                if (user_ids.includes(elem["channel"])) {
                    new_live_data.push(elem);
                }
            }
        }
        return new_live_data
    }
}

export interface TwitcastingChannelData {
    id: string
    name: string
    description: string
    thumbnail: string
    followerCount: number
    level: number
    group: string
    platform: string
}

export interface TwitcastingChannelDocument {
    [channel_name: string]: TwitcastingChannelData
}

export class TwitcastingChannel extends MongoDataSource<TwitcastingChannelDocument> {
    async getChannels(user_ids: string[] = null) {
        let get_data = (await this.collection.find().toArray())[0];
        try {
            delete get_data["_id"];
        } catch (e) {}
        let new_data: TwitcastingChannelDocument = {};
        if (is_none(user_ids) || user_ids.length < 1) {
            new_data = get_data;
        } else {
            for (let i = 0; i < user_ids.length; i++) {
                let user_id = user_ids[i];
                try {
                    new_data[user_id] = get_data[user_id];
                } catch (e) {};
            }
        }
        return new_data;
    }
}
