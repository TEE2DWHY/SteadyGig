import { PrismaClient } from "../../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import logger from "../utils/logger";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
  adapter,
  log:
    process.env.NODE_ENV === "development"
      ? ["query", "info", "warn", "error"]
      : ["warn", "error"],
});

const connectDb = async () => {
  try {
    await prisma.$connect();
    logger.info("Database connected successfully.");
  } catch (error) {
    logger.error("Database connection failed:", error);
    process.exit(1);
  }
};

export { connectDb, prisma };
