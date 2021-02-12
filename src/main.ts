import dotenv from "dotenv";
import http from "http";
import path from "path";

import { app, GQLAPIv2Server, replicaEnabled } from "./server";
import { logger } from "./utils/logger";

dotenv.config({ path: path.join(__dirname, "..", ".env") });

const PORT = process.env.PORT || 4200;

const httpServer = http.createServer(app);
if (replicaEnabled) {
    logger.info("Binding GraphQL Subscription WS Handler");
    GQLAPIv2Server.installSubscriptionHandlers(httpServer);
}
const listener = httpServer.listen(PORT, () => {
    console.log("🚀 VTB API is now up and running!");
    // @ts-ignore
    console.log("http://127.0.0.1:" + listener.address().port + "\n");
    console.log(`🚀 GraphQL Server ready at http://127.0.0.1:${PORT}${GQLAPIv2Server.graphqlPath}`);
    if (replicaEnabled) {
        console.log(
            `🚀 GraphQL Subscriptions ready at ws://127.0.0.1:${PORT}${GQLAPIv2Server.subscriptionsPath}`
        );
    }
});
