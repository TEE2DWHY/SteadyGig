import { Request, Response } from "express";
import { sendSuccessResponse } from "../utils/responseHandler";
import { StatusCodes } from "http-status-codes";
import { prisma } from "../config/database";
import asyncWrapper from "../utils/asyncWrapper";

export const getAllUsers = asyncWrapper(async (req: Request, res: Response) => {
    const users = await prisma.user.findMany({
        select: {
            id: true,
            email: true,
            role: true,
            createdAt: true,
            updatedAt: true,
        },
    });
    sendSuccessResponse(res, StatusCodes.OK, "Users retrieved successfully.", {
        users,
    });
});
