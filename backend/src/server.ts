import app from "./app";
import { connectDb } from "./config/database";
import logger from "./utils/logger";

const PORT = process.env.PORT || 3000;

const startServer = async () => {
    try {
        await connectDb();
        app.listen(PORT, () => {
            logger.info(`Server running on port ${PORT}`);
        });
    } catch (error) {
        logger.error("Failed to start server:", error);
        process.exit(1);
    }
};

startServer();
