import { createServer } from "http";
import app from "./app";
import { connectDb } from "./config/database";
import logger from "./utils/logger";
import { initializeSocket } from "./config/socket";

const PORT = process.env.PORT || 3000;

const startServer = async () => {
    try {
        await connectDb();

        const httpServer = createServer(app);

        initializeSocket(httpServer);

        httpServer.listen(PORT, () => {
            logger.info(`Server running on port ${PORT}`);
            logger.info(`Socket.io initialized and ready`);
        });
    } catch (error) {
        logger.error("Failed to start server:", error);
        process.exit(1);
    }
};

startServer();
