export const PlatformData = ["youtube", "bilibili", "twitch", "twitcasting", "mildom", "twitter"] as const;
export const LiveStatus = ["live", "upcoming", "past", "video"] as const;

export type PlatformDataType = "youtube" | "bilibili" | "twitch" | "twitcasting" | "mildom" | "twitter";
export type LiveStatusType = "live" | "upcoming" | "past" | "video";
