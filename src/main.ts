import dotenv from "dotenv";
import http from "http";
import path from "path";

import { app, replicaEnabled } from "./server";
import { expressErrorLogger } from "./utils/logger";
import { DateTime } from "luxon";
import { bindGQLServer, createGQLServer, GQLServerStartupOptions } from "./graphql";
import { is_none } from "./utils/swissknife";
import { RedisDB } from "./controller";
import config from "./config";
import { WebSocketServer } from "ws";
import initializeDataSources from "./graphql/datasources";

dotenv.config({ path: path.join(__dirname, "..", ".env") });

const REDIS_PASSWORD = config["redis"]["password"];
const REDIS_HOST = config["redis"]["host"];
const REDIS_PORT = config["redis"]["port"];
const REDIS_INSTANCE = new RedisDB(
    is_none(REDIS_HOST) ? "127.0.0.1" : REDIS_HOST,
    isNaN(REDIS_PORT) ? 6379 : REDIS_PORT,
    REDIS_PASSWORD
);

const PORT = process.env.PORT || 4200;

const httpServer = http.createServer(app);
const gqlStartOpts: GQLServerStartupOptions = {
    redis: REDIS_INSTANCE.client,
    httpServer: httpServer,
};
if (replicaEnabled) {
    gqlStartOpts.wsServer = new WebSocketServer({
        server: httpServer,
        path: "/v2/graphql",
    });
}
const GQLServer = createGQLServer(gqlStartOpts);
// @ts-ignore
bindGQLServer(app, GQLServer, {
    supportReplica: replicaEnabled,
    dataSources: initializeDataSources(),
    redisDB: REDIS_INSTANCE,
})
    .then(() => {
        app.use(expressErrorLogger);
        app.use(function (req, res, next) {
            const current_utc = DateTime.utc().toUnixInteger();
            res.status(404).json({
                time: current_utc,
                status: 404,
                message: `path '${req.path}' not found.`,
            });
            next();
        });

        const listener = httpServer.listen(PORT, () => {
            console.log("🚀 VTB API is now up and running!");
            // @ts-ignore
            console.log("http://127.0.0.1:" + listener.address().port + "\n");
            console.log(`🚀 GraphQL Server ready at http://127.0.0.1:${PORT}/v2/graphql`);
            if (replicaEnabled) {
                console.log(`🚀 GraphQL Subscriptions ready at ws://127.0.0.1:${PORT}/v2/graphql`);
            }
        });
    })
    .catch((e) => {
        console.error(e);
        process.exit(1);
    });
