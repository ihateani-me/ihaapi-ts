import dotenv from "dotenv";
import http from "http";
import path from "path";

import { app, replicaEnabled } from "./server";

dotenv.config({ path: path.join(__dirname, "..", ".env") });

const PORT = process.env.PORT || 4200;

const httpServer = http.createServer(app);
const listener = httpServer.listen(PORT, () => {
    console.log("🚀 VTB API is now up and running!");
    // @ts-ignore
    console.log("http://127.0.0.1:" + listener.address().port + "\n");
    // console.log(`🚀 GraphQL Server ready at http://127.0.0.1:4200${GQLAPIv2Server.graphqlPath}`);
    if (replicaEnabled) {
        //     console.log(`🚀 GraphQL Subscriptions ready at ws://127.0.0.1:4200${GQLAPIv2Server.subscriptionsPath}`);
    }
});
