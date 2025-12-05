import { Request, Response } from "express";
import {
    sendSuccessResponse,
    sendErrorResponse,
} from "../utils/responseHandler";
import { StatusCodes } from "http-status-codes";
import { prisma } from "../config/database";
import asyncWrapper from "../utils/asyncWrapper";
import { AuthRequest } from "../middlewares/auth";

export const createSubscription = asyncWrapper(
    async (req: AuthRequest, res: Response) => {
        const userId = req.user?.userId;

        const profile = await prisma.musicianProfile.findUnique({
            where: { userId },
            include: { subscription: true },
        });

        if (!profile) {
            return sendErrorResponse(
                res,
                StatusCodes.NOT_FOUND,
                "Musician profile not found. Create a profile first.",
            );
        }

        if (
            profile.subscription &&
            profile.subscription.status === "ACTIVE"
        ) {
            return sendErrorResponse(
                res,
                StatusCodes.BAD_REQUEST,
                "Active subscription already exists.",
            );
        }

        const { paymentId, durationMonths = 1 } = req.body;

        const startDate = new Date();
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + durationMonths);

        const subscription = await prisma.subscription.create({
            data: {
                musicianProfileId: profile.id,
                status: "ACTIVE",
                startDate,
                endDate,
                paymentId,
            },
        });

        await prisma.notification.create({
            data: {
                userId: userId!,
                title: "Subscription Activated",
                message: `Your subscription is now active until ${endDate.toDateString()}`,
                type: "subscription_activated",
                metadata: { subscriptionId: subscription.id },
            },
        });

        sendSuccessResponse(
            res,
            StatusCodes.CREATED,
            "Subscription created successfully.",
            { subscription },
        );
    },
);

export const getSubscription = asyncWrapper(
    async (req: AuthRequest, res: Response) => {
        const userId = req.user?.userId;

        const profile = await prisma.musicianProfile.findUnique({
            where: { userId },
            include: { subscription: true },
        });

        if (!profile) {
            return sendErrorResponse(
                res,
                StatusCodes.NOT_FOUND,
                "Musician profile not found.",
            );
        }

        if (!profile.subscription) {
            return sendErrorResponse(
                res,
                StatusCodes.NOT_FOUND,
                "No subscription found.",
            );
        }

        const isExpired = new Date() > new Date(profile.subscription.endDate);
        const daysRemaining = Math.ceil(
            (new Date(profile.subscription.endDate).getTime() -
                new Date().getTime()) /
                (1000 * 60 * 60 * 24),
        );

        sendSuccessResponse(
            res,
            StatusCodes.OK,
            "Subscription retrieved successfully.",
            {
                subscription: profile.subscription,
                isExpired,
                daysRemaining: isExpired ? 0 : daysRemaining,
            },
        );
    },
);

export const renewSubscription = asyncWrapper(
    async (req: AuthRequest, res: Response) => {
        const userId = req.user?.userId;

        const profile = await prisma.musicianProfile.findUnique({
            where: { userId },
            include: { subscription: true },
        });

        if (!profile || !profile.subscription) {
            return sendErrorResponse(
                res,
                StatusCodes.NOT_FOUND,
                "Subscription not found.",
            );
        }

        const { paymentId, durationMonths = 1 } = req.body;

        const currentEndDate = new Date(profile.subscription.endDate);
        const now = new Date();
        const startDate = currentEndDate > now ? currentEndDate : now;

        const newEndDate = new Date(startDate);
        newEndDate.setMonth(newEndDate.getMonth() + durationMonths);

        const updatedSubscription = await prisma.subscription.update({
            where: { id: profile.subscription.id },
            data: {
                status: "ACTIVE",
                startDate,
                endDate: newEndDate,
                paymentId,
            },
        });

        await prisma.notification.create({
            data: {
                userId: userId!,
                title: "Subscription Renewed",
                message: `Your subscription has been renewed until ${newEndDate.toDateString()}`,
                type: "subscription_renewed",
                metadata: { subscriptionId: updatedSubscription.id },
            },
        });

        sendSuccessResponse(
            res,
            StatusCodes.OK,
            "Subscription renewed successfully.",
            { subscription: updatedSubscription },
        );
    },
);

export const cancelSubscription = asyncWrapper(
    async (req: AuthRequest, res: Response) => {
        const userId = req.user?.userId;

        const profile = await prisma.musicianProfile.findUnique({
            where: { userId },
            include: { subscription: true },
        });

        if (!profile || !profile.subscription) {
            return sendErrorResponse(
                res,
                StatusCodes.NOT_FOUND,
                "Subscription not found.",
            );
        }

        const updatedSubscription = await prisma.subscription.update({
            where: { id: profile.subscription.id },
            data: {
                status: "CANCELLED",
                autoRenew: false,
            },
        });

        await prisma.notification.create({
            data: {
                userId: userId!,
                title: "Subscription Cancelled",
                message:
                    "Your subscription has been cancelled. It will remain active until the end date.",
                type: "subscription_cancelled",
                metadata: { subscriptionId: updatedSubscription.id },
            },
        });

        sendSuccessResponse(
            res,
            StatusCodes.OK,
            "Subscription cancelled successfully.",
            { subscription: updatedSubscription },
        );
    },
);

export const checkSubscriptionStatus = asyncWrapper(
    async (req: AuthRequest, res: Response) => {
        const userId = req.user?.userId;

        const profile = await prisma.musicianProfile.findUnique({
            where: { userId },
            include: { subscription: true },
        });

        if (!profile) {
            return sendErrorResponse(
                res,
                StatusCodes.NOT_FOUND,
                "Musician profile not found.",
            );
        }

        if (!profile.subscription) {
            return sendSuccessResponse(
                res,
                StatusCodes.OK,
                "No subscription found.",
                {
                    hasSubscription: false,
                    isActive: false,
                },
            );
        }

        const now = new Date();
        const endDate = new Date(profile.subscription.endDate);
        const isActive =
            profile.subscription.status === "ACTIVE" && endDate > now;

        if (!isActive && profile.subscription.status === "ACTIVE") {
            await prisma.subscription.update({
                where: { id: profile.subscription.id },
                data: { status: "EXPIRED" },
            });
        }

        sendSuccessResponse(res, StatusCodes.OK, "Subscription status checked.", {
            hasSubscription: true,
            isActive,
            subscription: profile.subscription,
        });
    },
);

export const getAllSubscriptions = asyncWrapper(
    async (req: Request, res: Response) => {
        const { status, page = 1, limit = 20 } = req.query;

        const skip = (Number(page) - 1) * Number(limit);

        const where: any = {};
        if (status) where.status = status;

        const [subscriptions, total] = await Promise.all([
            prisma.subscription.findMany({
                where,
                include: {
                    musicianProfile: {
                        include: {
                            user: {
                                select: {
                                    id: true,
                                    firstName: true,
                                    lastName: true,
                                    email: true,
                                },
                            },
                        },
                    },
                },
                skip,
                take: Number(limit),
                orderBy: { createdAt: "desc" },
            }),
            prisma.subscription.count({ where }),
        ]);

        sendSuccessResponse(
            res,
            StatusCodes.OK,
            "Subscriptions retrieved successfully.",
            {
                subscriptions,
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
