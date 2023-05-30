import express from "express";
import { RedisDB } from "../controller";

export interface GQLContext {
    req: express.Request;
    res: express.Response;
    redisCache: RedisDB;
}
