import { Request, Response } from "express";
import bcrypt from "bcrypt";
import asyncWrapper from "../utils/asyncWrapper";
import { validationResult } from "express-validator";
import {
    sendErrorResponse,
    sendSuccessResponse,
} from "../utils/responseHandler";
import { StatusCodes } from "http-status-codes";
import { prisma } from "../config/database";
import {
    generateTokens,
    verifyRefreshToken,
    generateAccessToken,
} from "../utils/jwt";
import redisClient from "../config/redis";
import jwt from "jsonwebtoken";
import { AuthRequest } from "../middlewares/auth";

export const register = asyncWrapper(async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return sendErrorResponse(
            res,
            StatusCodes.BAD_REQUEST,
            "Validation error",
        );
    }
    const { email, password, firstName, lastName, phone, role } = req.body;
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
        return sendErrorResponse(
            res,
            StatusCodes.BAD_REQUEST,
            "Email already registered.",
        );
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
        data: {
            email,
            password: hashedPassword,
            firstName,
            lastName,
            phone,
            role,
        },
        select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
        },
    });

    const tokens = generateTokens({
        userId: user.id,
        email: user.email,
        role: user.role,
    });

    sendSuccessResponse(
        res,
        StatusCodes.CREATED,
        "User registered successfully",
        { user, ...tokens },
    );
});

export const login = asyncWrapper(async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return sendErrorResponse(
            res,
            StatusCodes.BAD_REQUEST,
            "Validation error",
        );
    }
    const { email, password } = req.body;

    // Rate limiting: Check login attempts
    const attemptsKey = `login:attempts:${email}`;
    const attempts = await redisClient.get(attemptsKey);

    if (attempts && parseInt(attempts) >= 5) {
        const ttl = await redisClient.ttl(attemptsKey);
        return sendErrorResponse(
            res,
            StatusCodes.TOO_MANY_REQUESTS,
            `Too many login attempts. Please try again in ${Math.ceil(ttl / 60)} minutes.`,
        );
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
        await redisClient.incr(attemptsKey);
        await redisClient.expire(attemptsKey, 900);
        return sendErrorResponse(
            res,
            StatusCodes.UNAUTHORIZED,
            "Invalid email or password.",
        );
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
        await redisClient.incr(attemptsKey);
        await redisClient.expire(attemptsKey, 900);
        return sendErrorResponse(
            res,
            StatusCodes.UNAUTHORIZED,
            "Invalid email or password.",
        );
    }

    await redisClient.del(attemptsKey);

    const tokens = generateTokens({
        userId: user.id,
        email: user.email,
        role: user.role,
    });

    await redisClient.setex(
        `refresh:${user.id}`,
        7 * 24 * 60 * 60,
        tokens.refreshToken,
    );

    sendSuccessResponse(res, StatusCodes.OK, "Login successful", {
        user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
        },
        ...tokens,
    });
});

export const logout = asyncWrapper(async (req: AuthRequest, res: Response) => {
    const token = req.headers.authorization?.split(" ")[1];

    if (token && req.user) {
        const decodedJwt = jwt.decode(token) as { exp: number } | null;

        if (decodedJwt?.exp) {
            const ttl = decodedJwt.exp - Math.floor(Date.now() / 1000);
            if (ttl > 0) {
                await redisClient.setex(`blacklist:${token}`, ttl, "true");
            }
        }
        await redisClient.del(`refresh:${req.user.userId}`);
    }

    sendSuccessResponse(res, StatusCodes.OK, "Logged out successfully");
});

export const refreshToken = asyncWrapper(
    async (req: Request, res: Response) => {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return sendErrorResponse(
                res,
                StatusCodes.BAD_REQUEST,
                "Refresh token is required",
            );
        }

        const decoded = verifyRefreshToken(refreshToken);

        const storedToken = await redisClient.get(`refresh:${decoded.userId}`);

        if (!storedToken || storedToken !== refreshToken) {
            return sendErrorResponse(
                res,
                StatusCodes.UNAUTHORIZED,
                "Invalid or expired refresh token",
            );
        }

        const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
        });

        if (!user) {
            return sendErrorResponse(
                res,
                StatusCodes.UNAUTHORIZED,
                "User not found",
            );
        }

        const newAccessToken = generateAccessToken({
            userId: user.id,
            email: user.email,
            role: user.role,
        });

        sendSuccessResponse(
            res,
            StatusCodes.OK,
            "Token refreshed successfully",
            { accessToken: newAccessToken },
        );
    },
);
