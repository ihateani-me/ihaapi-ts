import { MongoDataSource } from 'apollo-datasource-mongodb'
import { ObjectId } from 'mongodb'
import { is_none } from '../../utils/swissknife';

interface TwitchLiveData {
    id: string
    title: string
    startTime: number
    channel: string
    channel_id: number
    thumbnail: string
    viewers: number
    peakViewers: number
    group: string
    platform: string
}

interface TwitchLiveDocument {
    _id: ObjectId
    live: TwitchLiveData[]
}

export class TwitchLive extends MongoDataSource<TwitchLiveDocument> {
    async getLive() {
        let get_data = await this.collection.find().toArray();
        return get_data[0]["live"];
    }
}

interface TwitchChannelData {
    id: string
    user_id: string
    name: string
    description: string
    thumbnail: string
    subscriberCount: number
    followersCount?: number
    viewCount: number
    group: string
    platform: string
}

interface TwitchChannelDocument {
    [channel_name: string]: TwitchChannelData
}

function convertToFollowers(channel: TwitchChannelData) {
    channel["subscriberCount"] = channel.followersCount;
    delete channel.followersCount;
    return channel;
}

export class TwitchChannel extends MongoDataSource<TwitchChannelDocument> {
    async getChannels(user_ids: string[] = null) {
        let get_data = (await this.collection.find().toArray())[0];
        let new_data: TwitchChannelDocument = {};
        if (is_none(user_ids)) {
            for (let [channel_name, channel_data] of Object.entries(get_data)) {
                if (channel_name ===  "_id") {
                    new_data[channel_name] = convertToFollowers(channel_data);
                }
            }
        } else {
            for (let i = 0; i < user_ids.length; i++) {
                let user_id = user_ids[i];
                try {
                    new_data[user_id] = convertToFollowers(get_data[user_id]);
                } catch (e) {};
            }
        }
        return new_data;
    }
}
