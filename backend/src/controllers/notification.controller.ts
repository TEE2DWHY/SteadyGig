import { Request, Response } from "express";
import {
    sendSuccessResponse,
    sendErrorResponse,
} from "../utils/responseHandler";
import { StatusCodes } from "http-status-codes";
import { prisma } from "../config/database";
import asyncWrapper from "../utils/asyncWrapper";
import { AuthRequest } from "../middlewares/auth";
import { emitToUser } from "../config/socket";

export const getNotifications = asyncWrapper(
    async (req: AuthRequest, res: Response) => {
        const userId = req.user?.userId;
        const { page = 1, limit = 20, isRead } = req.query;

        const skip = (Number(page) - 1) * Number(limit);

        const where: any = { userId };
        if (isRead !== undefined) {
            where.isRead = isRead === "true";
        }

        const [notifications, total] = await Promise.all([
            prisma.notification.findMany({
                where,
                skip,
                take: Number(limit),
                orderBy: { createdAt: "desc" },
            }),
            prisma.notification.count({ where }),
        ]);

        const unreadCount = await prisma.notification.count({
            where: { userId, isRead: false },
        });

        sendSuccessResponse(
            res,
            StatusCodes.OK,
            "Notifications retrieved successfully.",
            {
                notifications,
                unreadCount,
                pagination: {
                    total,
                    page: Number(page),
                    limit: Number(limit),
                    totalPages: Math.ceil(total / Number(limit)),
                },
            },
        );
    },
);

export const markAsRead = asyncWrapper(
    async (req: AuthRequest, res: Response) => {
        const userId = req.user?.userId;
        const { id } = req.params;

        const notification = await prisma.notification.findFirst({
            where: {
                id,
                userId,
            },
        });

        if (!notification) {
            return sendErrorResponse(
                res,
                StatusCodes.NOT_FOUND,
                "Notification not found.",
            );
        }

        const updatedNotification = await prisma.notification.update({
            where: { id },
            data: { isRead: true },
        });

        emitToUser(userId!, "notification_read", { notificationId: id });

        sendSuccessResponse(
            res,
            StatusCodes.OK,
            "Notification marked as read.",
            { notification: updatedNotification },
        );
    },
);

export const markAllAsRead = asyncWrapper(
    async (req: AuthRequest, res: Response) => {
        const userId = req.user?.userId;

        await prisma.notification.updateMany({
            where: {
                userId,
                isRead: false,
            },
            data: { isRead: true },
        });

        emitToUser(userId!, "notifications_all_read", { userId });

        sendSuccessResponse(
            res,
            StatusCodes.OK,
            "All notifications marked as read.",
        );
    },
);

export const deleteNotification = asyncWrapper(
    async (req: AuthRequest, res: Response) => {
        const userId = req.user?.userId;
        const { id } = req.params;

        const notification = await prisma.notification.findFirst({
            where: {
                id,
                userId,
            },
        });

        if (!notification) {
            return sendErrorResponse(
                res,
                StatusCodes.NOT_FOUND,
                "Notification not found.",
            );
        }

        await prisma.notification.delete({
            where: { id },
        });

        emitToUser(userId!, "notification_deleted", { notificationId: id });

        sendSuccessResponse(
            res,
            StatusCodes.OK,
            "Notification deleted successfully.",
        );
    },
);

export const getUnreadCount = asyncWrapper(
    async (req: AuthRequest, res: Response) => {
        const userId = req.user?.userId;

        const unreadCount = await prisma.notification.count({
            where: {
                userId,
                isRead: false,
            },
        });

        sendSuccessResponse(
            res,
            StatusCodes.OK,
            "Unread count retrieved successfully.",
            { unreadCount },
        );
    },
);

export const deleteAllNotifications = asyncWrapper(
    async (req: AuthRequest, res: Response) => {
        const userId = req.user?.userId;

        await prisma.notification.deleteMany({
            where: { userId },
        });

        emitToUser(userId!, "notifications_all_deleted", { userId });

        sendSuccessResponse(
            res,
            StatusCodes.OK,
            "All notifications deleted successfully.",
        );
    },
);

export const getNotificationById = asyncWrapper(
    async (req: AuthRequest, res: Response) => {
        const userId = req.user?.userId;
        const { id } = req.params;

        const notification = await prisma.notification.findFirst({
            where: {
                id,
                userId,
            },
        });

        if (!notification) {
            return sendErrorResponse(
                res,
                StatusCodes.NOT_FOUND,
                "Notification not found.",
            );
        }

        sendSuccessResponse(
            res,
            StatusCodes.OK,
            "Notification retrieved successfully.",
            { notification },
        );
    },
);
