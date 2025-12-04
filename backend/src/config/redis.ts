import Redis from "ioredis";
import logger from "../utils/logger";

const REDIS_HOST = process.env.REDIS_HOST || "localhost";
const REDIS_PORT = parseInt(process.env.REDIS_PORT || "6379");
const REDIS_PASSWORD = process.env.REDIS_PASSWORD;

const redis = new Redis({
    host: REDIS_HOST,
    port: REDIS_PORT,
    password: REDIS_PASSWORD,
    retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
    },
    maxRetriesPerRequest: 3,
});

redis.on("connect", () => {
    logger.info("Redis client connected");
});

redis.on("ready", () => {
    logger.info("Redis client ready");
});

redis.on("error", (err) => {
    logger.error("Redis client error:", err);
});

redis.on("close", () => {
    logger.warn("Redis client connection closed");
});

redis.on("reconnecting", () => {
    logger.info("Redis client reconnecting...");
});

export default redis;
