import redis from "../config/redis";
import logger from "./logger";

/**
 * Cache utility functions for Redis operations
 */

export class CacheService {
    static async get<T>(key: string): Promise<T | null> {
        try {
            const value = await redis.get(key);
            if (!value) return null;
            return JSON.parse(value) as T;
        } catch (error) {
            logger.error(`Cache get error for key ${key}:`, error);
            return null;
        }
    }

    static async set(
        key: string,
        value: any,
        expirationInSeconds?: number,
    ): Promise<void> {
        try {
            const stringValue = JSON.stringify(value);

            if (expirationInSeconds) {
                await redis.setex(key, expirationInSeconds, stringValue);
            } else {
                await redis.set(key, stringValue);
            }
        } catch (error) {
            logger.error(`Cache set error for key ${key}:`, error);
        }
    }

    static async delete(key: string): Promise<void> {
        try {
            await redis.del(key);
        } catch (error) {
            logger.error(`Cache delete error for key ${key}:`, error);
        }
    }

    static async deletePattern(pattern: string): Promise<void> {
        try {
            const keys = await redis.keys(pattern);
            if (keys.length > 0) {
                await redis.del(...keys);
            }
        } catch (error) {
            logger.error(`Cache delete pattern error for ${pattern}:`, error);
        }
    }

    static async exists(key: string): Promise<boolean> {
        try {
            const result = await redis.exists(key);
            return result === 1;
        } catch (error) {
            logger.error(`Cache exists error for key ${key}:`, error);
            return false;
        }
    }

    static async expire(key: string, seconds: number): Promise<void> {
        try {
            await redis.expire(key, seconds);
        } catch (error) {
            logger.error(`Cache expire error for key ${key}:`, error);
        }
    }

    static async increment(key: string): Promise<number> {
        try {
            return await redis.incr(key);
        } catch (error) {
            logger.error(`Cache increment error for key ${key}:`, error);
            return 0;
        }
    }

    static async ttl(key: string): Promise<number> {
        try {
            return await redis.ttl(key);
        } catch (error) {
            logger.error(`Cache TTL error for key ${key}:`, error);
            return -2;
        }
    }

    static async flush(): Promise<void> {
        try {
            await redis.flushall();
            logger.warn("Cache flushed - all keys deleted");
        } catch (error) {
            logger.error("Cache flush error:", error);
        }
    }
}

export default CacheService;
