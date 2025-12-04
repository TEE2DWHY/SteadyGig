import express from "express";
import cors from "cors";
import notFoundHandler from "./middlewares/notFoundHandler";
import { connectDb } from "./config/database";
import logger from "./utils/logger";
import errorHandler from "./middlewares/errorHandler";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use(errorHandler);
app.use(notFoundHandler);

const startServer = async () => {
    await connectDb();
    app.listen(PORT, () => {
        logger.info(`Server running on port ${PORT}`);
    });
};

startServer().catch((error) => {
    logger.error("Failed to start server:", error);
    process.exit(1);
});
