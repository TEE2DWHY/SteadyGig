import { Request, Response } from "express";
import {
    sendSuccessResponse,
    sendErrorResponse,
} from "../utils/responseHandler";
import { StatusCodes } from "http-status-codes";
import { prisma } from "../config/database";
import asyncWrapper from "../utils/asyncWrapper";
import { AuthRequest } from "../middlewares/auth";
import redisClient from "../config/redis";
import cloudinaryUploadService from "../utils/cloudinaryUpload";

export const getAllUsers = asyncWrapper(async (req: Request, res: Response) => {
    const users = await prisma.user.findMany({
        select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            role: true,
            createdAt: true,
            updatedAt: true,
        },
    });
    sendSuccessResponse(res, StatusCodes.OK, "Users retrieved successfully.", {
        users,
    });
});

export const getUserById = asyncWrapper(async (req: Request, res: Response) => {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
        where: { id },
        select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            role: true,
            createdAt: true,
            updatedAt: true,
        },
    });

    if (!user) {
        return sendErrorResponse(res, StatusCodes.NOT_FOUND, "User not found.");
    }

    sendSuccessResponse(res, StatusCodes.OK, "User retrieved successfully.", {
        user,
    });
});

export const getCurrentUser = asyncWrapper(
    async (req: AuthRequest, res: Response) => {
        const userId = req.user?.userId;

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                phone: true,
                role: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        if (!user) {
            return sendErrorResponse(
                res,
                StatusCodes.NOT_FOUND,
                "User not found.",
            );
        }

        sendSuccessResponse(
            res,
            StatusCodes.OK,
            "User retrieved successfully.",
            { user },
        );
    },
);

export const updateUser = asyncWrapper(
    async (req: AuthRequest, res: Response) => {
        const userId = req.user?.userId;
        const { firstName, lastName, phone } = req.body;

        const attemptsKey = `update:attempts:${userId}`;
        const attempts = await redisClient.get(attemptsKey);

        if (attempts && parseInt(attempts) >= 5) {
            const ttl = await redisClient.ttl(attemptsKey);
            return sendErrorResponse(
                res,
                StatusCodes.TOO_MANY_REQUESTS,
                `Too many update attempts. Please try again in ${Math.ceil(ttl / 60)} minutes.`,
            );
        }

        try {
            const user = await prisma.user.update({
                where: { id: userId },
                data: {
                    firstName,
                    lastName,
                    phone,
                },
                select: {
                    id: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                    phone: true,
                    role: true,
                    updatedAt: true,
                },
            });

            await redisClient.del(attemptsKey);

            sendSuccessResponse(
                res,
                StatusCodes.OK,
                "User updated successfully.",
                { user },
            );
        } catch (error) {
            await redisClient.incr(attemptsKey);
            await redisClient.expire(attemptsKey, 900);

            return sendErrorResponse(
                res,
                StatusCodes.BAD_REQUEST,
                "Failed to update user.",
            );
        }
    },
);

export const uploadProfileImage = asyncWrapper(
    async (req: AuthRequest, res: Response) => {
        const userId = req.user?.userId;

        if (!req.file) {
            return sendErrorResponse(
                res,
                StatusCodes.BAD_REQUEST,
                "No image uploaded.",
            );
        }

        const uploadResult = await cloudinaryUploadService.uploadImage(
            req.file,
            "steadygig/users/profiles",
        );

        if (!uploadResult || !uploadResult.success) {
            return sendErrorResponse(
                res,
                StatusCodes.INTERNAL_SERVER_ERROR,
                uploadResult?.error || "Failed to upload profile image.",
            );
        }

        const user = await prisma.user.update({
            where: { id: userId },
            data: { profileImage: uploadResult.secureUrl },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                profileImage: true,
                updatedAt: true,
            },
        });

        sendSuccessResponse(
            res,
            StatusCodes.OK,
            "Profile image uploaded successfully.",
            { user },
        );
    },
);

export const deleteUser = asyncWrapper(
    async (req: AuthRequest, res: Response) => {
        const userId = req.user?.userId;

        await prisma.user.delete({
            where: { id: userId },
        });

        sendSuccessResponse(res, StatusCodes.OK, "User deleted successfully.");
    },
);
