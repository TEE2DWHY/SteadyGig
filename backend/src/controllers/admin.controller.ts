import { Request, Response } from "express";
import {
    sendSuccessResponse,
    sendErrorResponse,
} from "../utils/responseHandler";
import { StatusCodes } from "http-status-codes";
import { prisma } from "../config/database";
import asyncWrapper from "../utils/asyncWrapper";

export const getDashboardStats = asyncWrapper(
    async (req: Request, res: Response) => {
        const [
            totalUsers,
            totalMusicians,
            totalClients,
            activeSubscriptions,
            totalBookings,
            completedBookings,
            totalRevenue,
            pendingBookings,
        ] = await Promise.all([
            prisma.user.count(),
            prisma.user.count({ where: { role: "MUSICIAN" } }),
            prisma.user.count({ where: { role: "CLIENT" } }),
            prisma.subscription.count({ where: { status: "ACTIVE" } }),
            prisma.booking.count(),
            prisma.booking.count({ where: { status: "COMPLETED" } }),
            prisma.payment.aggregate({
                where: { paymentStatus: "successful" },
                _sum: { amount: true },
            }),
            prisma.booking.count({ where: { status: "PENDING" } }),
        ]);

        const recentUsers = await prisma.user.findMany({
            take: 5,
            orderBy: { createdAt: "desc" },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                role: true,
                createdAt: true,
            },
        });

        const recentBookings = await prisma.booking.findMany({
            take: 5,
            orderBy: { createdAt: "desc" },
            include: {
                client: {
                    select: {
                        firstName: true,
                        lastName: true,
                    },
                },
                musician: {
                    select: {
                        firstName: true,
                        lastName: true,
                    },
                },
            },
        });

        sendSuccessResponse(
            res,
            StatusCodes.OK,
            "Dashboard stats retrieved successfully.",
            {
                stats: {
                    totalUsers,
                    totalMusicians,
                    totalClients,
                    activeSubscriptions,
                    totalBookings,
                    completedBookings,
                    pendingBookings,
                    totalRevenue: totalRevenue._sum.amount || 0,
                },
                recentUsers,
                recentBookings,
            },
        );
    },
);

export const getAllUsers = asyncWrapper(async (req: Request, res: Response) => {
    const { role, isActive, page = 1, limit = 20 } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};
    if (role) where.role = role;
    if (isActive !== undefined) where.isActive = isActive === "true";

    const [users, total] = await Promise.all([
        prisma.user.findMany({
            where,
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                phone: true,
                role: true,
                isActive: true,
                isVerified: true,
                createdAt: true,
            },
            skip,
            take: Number(limit),
            orderBy: { createdAt: "desc" },
        }),
        prisma.user.count({ where }),
    ]);

    sendSuccessResponse(res, StatusCodes.OK, "Users retrieved successfully.", {
        users,
        pagination: {
            total,
            page: Number(page),
            limit: Number(limit),
            totalPages: Math.ceil(total / Number(limit)),
        },
    });
});

export const toggleUserStatus = asyncWrapper(
    async (req: Request, res: Response) => {
        const { userId } = req.params;
        const { isActive } = req.body;

        const user = await prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user) {
            return sendErrorResponse(
                res,
                StatusCodes.NOT_FOUND,
                "User not found.",
            );
        }

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: { isActive },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                isActive: true,
            },
        });

        await prisma.notification.create({
            data: {
                userId,
                title: isActive ? "Account Activated" : "Account Deactivated",
                message: isActive
                    ? "Your account has been activated by an administrator."
                    : "Your account has been deactivated. Please contact support.",
                type: "account_status",
            },
        });

        sendSuccessResponse(
            res,
            StatusCodes.OK,
            `User ${isActive ? "activated" : "deactivated"} successfully.`,
            { user: updatedUser },
        );
    },
);

export const verifyMusician = asyncWrapper(
    async (req: Request, res: Response) => {
        const { userId } = req.params;

        const user = await prisma.user.findFirst({
            where: {
                id: userId,
                role: "MUSICIAN",
            },
        });

        if (!user) {
            return sendErrorResponse(
                res,
                StatusCodes.NOT_FOUND,
                "Musician not found.",
            );
        }

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: { isVerified: true },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                isVerified: true,
            },
        });

        await prisma.notification.create({
            data: {
                userId,
                title: "Profile Verified",
                message:
                    "Congratulations! Your musician profile has been verified.",
                type: "profile_verified",
            },
        });

        sendSuccessResponse(
            res,
            StatusCodes.OK,
            "Musician verified successfully.",
            { user: updatedUser },
        );
    },
);

export const getUnverifiedMusicians = asyncWrapper(
    async (req: Request, res: Response) => {
        const { page = 1, limit = 20 } = req.query;

        const skip = (Number(page) - 1) * Number(limit);

        const [musicians, total] = await Promise.all([
            prisma.user.findMany({
                where: {
                    role: "MUSICIAN",
                    isVerified: false,
                },
                include: {
                    musicianProfile: {
                        include: {
                            instruments: true,
                            genres: true,
                            portfolioVideos: true,
                        },
                    },
                },
                skip,
                take: Number(limit),
                orderBy: { createdAt: "desc" },
            }),
            prisma.user.count({
                where: {
                    role: "MUSICIAN",
                    isVerified: false,
                },
            }),
        ]);

        sendSuccessResponse(
            res,
            StatusCodes.OK,
            "Unverified musicians retrieved successfully.",
            {
                musicians,
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

export const deleteUser = asyncWrapper(async (req: Request, res: Response) => {
    const { userId } = req.params;

    const user = await prisma.user.findUnique({
        where: { id: userId },
    });

    if (!user) {
        return sendErrorResponse(res, StatusCodes.NOT_FOUND, "User not found.");
    }

    await prisma.user.delete({
        where: { id: userId },
    });

    sendSuccessResponse(res, StatusCodes.OK, "User deleted successfully.");
});

export const getBookingDisputes = asyncWrapper(
    async (req: Request, res: Response) => {
        const { page = 1, limit = 20 } = req.query;

        const skip = (Number(page) - 1) * Number(limit);

        const [bookings, total] = await Promise.all([
            prisma.booking.findMany({
                where: {
                    status: { in: ["CANCELLED", "REJECTED"] },
                },
                include: {
                    client: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                        },
                    },
                    musician: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                        },
                    },
                },
                skip,
                take: Number(limit),
                orderBy: { updatedAt: "desc" },
            }),
            prisma.booking.count({
                where: {
                    status: { in: ["CANCELLED", "REJECTED"] },
                },
            }),
        ]);

        sendSuccessResponse(
            res,
            StatusCodes.OK,
            "Booking disputes retrieved successfully.",
            {
                bookings,
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

export const getRevenueReport = asyncWrapper(
    async (req: Request, res: Response) => {
        const { startDate, endDate } = req.query;

        const where: any = {
            paymentStatus: "successful",
        };

        if (startDate) {
            where.createdAt = { gte: new Date(startDate as string) };
        }
        if (endDate) {
            where.createdAt = {
                ...where.createdAt,
                lte: new Date(endDate as string),
            };
        }

        const [totalRevenue, paymentCount, bookingPayments, subscriptionPayments] =
            await Promise.all([
                prisma.payment.aggregate({
                    where,
                    _sum: { amount: true },
                }),
                prisma.payment.count({ where }),
                prisma.payment.aggregate({
                    where: {
                        ...where,
                        bookingId: { not: null },
                    },
                    _sum: { amount: true },
                    _count: true,
                }),
                prisma.payment.aggregate({
                    where: {
                        ...where,
                        bookingId: null,
                    },
                    _sum: { amount: true },
                    _count: true,
                }),
            ]);

        sendSuccessResponse(
            res,
            StatusCodes.OK,
            "Revenue report retrieved successfully.",
            {
                totalRevenue: totalRevenue._sum.amount || 0,
                totalTransactions: paymentCount,
                bookingRevenue: bookingPayments._sum.amount || 0,
                bookingTransactions: bookingPayments._count,
                subscriptionRevenue: subscriptionPayments._sum.amount || 0,
                subscriptionTransactions: subscriptionPayments._count,
            },
        );
    },
);
