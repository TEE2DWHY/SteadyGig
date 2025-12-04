import { Request, Response } from "express";
import {
    sendSuccessResponse,
    sendErrorResponse,
} from "../utils/responseHandler";
import { StatusCodes } from "http-status-codes";
import { prisma } from "../config/database";
import asyncWrapper from "../utils/asyncWrapper";
import { AuthRequest } from "../middlewares/auth";

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

export const getUserById = asyncWrapper(
    async (req: Request, res: Response) => {
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

        sendSuccessResponse(
            res,
            StatusCodes.OK,
            "User updated successfully.",
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

        sendSuccessResponse(
            res,
            StatusCodes.OK,
            "User deleted successfully.",
        );
    },
);
