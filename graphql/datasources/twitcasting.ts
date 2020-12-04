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
    async getLive() {
        let get_data = await this.collection.find().toArray();
        return get_data[0]["live"];
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
        if (is_none(user_ids)) {
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
