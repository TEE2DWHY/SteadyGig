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

export const createBooking = asyncWrapper(
    async (req: AuthRequest, res: Response) => {
        const clientId = req.user?.userId;

        const {
            musicianId,
            eventName,
            eventDate,
            eventTime,
            duration,
            venue,
            address,
            city,
            state,
            latitude,
            longitude,
            instrumentIds,
            description,
            offeredRate,
        } = req.body;

        const musician = await prisma.user.findUnique({
            where: { id: musicianId },
            include: { musicianProfile: true },
        });

        if (!musician || musician.role !== "MUSICIAN") {
            return sendErrorResponse(
                res,
                StatusCodes.BAD_REQUEST,
                "Invalid musician ID.",
            );
        }

        if (!musician.musicianProfile?.isAvailable) {
            return sendErrorResponse(
                res,
                StatusCodes.BAD_REQUEST,
                "Musician is not available.",
            );
        }

        const booking = await prisma.booking.create({
            data: {
                clientId: clientId!,
                musicianId,
                eventName,
                eventDate: new Date(eventDate),
                eventTime,
                duration,
                venue,
                address,
                city,
                state,
                latitude,
                longitude,
                offeredRate,
                description,
                instruments: instrumentIds
                    ? {
                          connect: instrumentIds.map((id: string) => ({ id })),
                      }
                    : undefined,
            },
            include: {
                client: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        phone: true,
                    },
                },
                musician: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        phone: true,
                    },
                },
                instruments: true,
            },
        });

        const notification = await prisma.notification.create({
            data: {
                userId: musicianId,
                title: "New Booking Request",
                message: `You have a new booking request for ${eventName}`,
                type: "booking_request",
                metadata: { bookingId: booking.id },
            },
        });

        emitToUser(musicianId, "notification", notification);

        sendSuccessResponse(
            res,
            StatusCodes.CREATED,
            "Booking created successfully.",
            { booking },
        );
    },
);

export const getBookings = asyncWrapper(
    async (req: AuthRequest, res: Response) => {
        const userId = req.user?.userId;
        const { status, page = 1, limit = 20 } = req.query;

        const skip = (Number(page) - 1) * Number(limit);

        const where: any = {
            OR: [{ clientId: userId }, { musicianId: userId }],
        };

        if (status) {
            where.status = status;
        }

        const [bookings, total] = await Promise.all([
            prisma.booking.findMany({
                where,
                include: {
                    client: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                            phone: true,
                        },
                    },
                    musician: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                            phone: true,
                        },
                    },
                    instruments: true,
                },
                skip,
                take: Number(limit),
                orderBy: { createdAt: "desc" },
            }),
            prisma.booking.count({ where }),
        ]);

        sendSuccessResponse(
            res,
            StatusCodes.OK,
            "Bookings retrieved successfully.",
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

export const getBookingById = asyncWrapper(
    async (req: AuthRequest, res: Response) => {
        const userId = req.user?.userId;
        const { id } = req.params;

        const booking = await prisma.booking.findFirst({
            where: {
                id,
                OR: [{ clientId: userId }, { musicianId: userId }],
            },
            include: {
                client: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        phone: true,
                        profileImage: true,
                    },
                },
                musician: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        phone: true,
                        profileImage: true,
                    },
                },
                instruments: true,
                payment: true,
                review: true,
            },
        });

        if (!booking) {
            return sendErrorResponse(
                res,
                StatusCodes.NOT_FOUND,
                "Booking not found.",
            );
        }

        sendSuccessResponse(
            res,
            StatusCodes.OK,
            "Booking retrieved successfully.",
            { booking },
        );
    },
);

export const acceptBooking = asyncWrapper(
    async (req: AuthRequest, res: Response) => {
        const userId = req.user?.userId;
        const { id } = req.params;
        const { agreedRate } = req.body;

        const booking = await prisma.booking.findFirst({
            where: {
                id,
                musicianId: userId,
                status: "PENDING",
            },
        });

        if (!booking) {
            return sendErrorResponse(
                res,
                StatusCodes.NOT_FOUND,
                "Booking not found or already processed.",
            );
        }

        const updatedBooking = await prisma.booking.update({
            where: { id },
            data: {
                status: "ACCEPTED",
                agreedRate: agreedRate || booking.offeredRate,
            },
            include: {
                client: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                    },
                },
                musician: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                    },
                },
            },
        });

        const clientNotification = await prisma.notification.create({
            data: {
                userId: booking.clientId,
                title: "Booking Accepted",
                message: `Your booking for ${booking.eventName} has been accepted`,
                type: "booking_accepted",
                metadata: { bookingId: booking.id },
            },
        });

        emitToUser(booking.clientId, "notification", clientNotification);

        sendSuccessResponse(
            res,
            StatusCodes.OK,
            "Booking accepted successfully.",
            { booking: updatedBooking },
        );
    },
);

export const rejectBooking = asyncWrapper(
    async (req: AuthRequest, res: Response) => {
        const userId = req.user?.userId;
        const { id } = req.params;

        const booking = await prisma.booking.findFirst({
            where: {
                id,
                musicianId: userId,
                status: "PENDING",
            },
        });

        if (!booking) {
            return sendErrorResponse(
                res,
                StatusCodes.NOT_FOUND,
                "Booking not found or already processed.",
            );
        }

        const updatedBooking = await prisma.booking.update({
            where: { id },
            data: { status: "REJECTED" },
        });

        const rejectionNotification = await prisma.notification.create({
            data: {
                userId: booking.clientId,
                title: "Booking Rejected",
                message: `Your booking for ${booking.eventName} has been rejected`,
                type: "booking_rejected",
                metadata: { bookingId: booking.id },
            },
        });

        emitToUser(booking.clientId, "notification", rejectionNotification);

        sendSuccessResponse(
            res,
            StatusCodes.OK,
            "Booking rejected.",
            { booking: updatedBooking },
        );
    },
);

export const cancelBooking = asyncWrapper(
    async (req: AuthRequest, res: Response) => {
        const userId = req.user?.userId;
        const { id } = req.params;

        const booking = await prisma.booking.findFirst({
            where: {
                id,
                OR: [{ clientId: userId }, { musicianId: userId }],
                status: { in: ["PENDING", "ACCEPTED"] },
            },
        });

        if (!booking) {
            return sendErrorResponse(
                res,
                StatusCodes.NOT_FOUND,
                "Booking not found or cannot be cancelled.",
            );
        }

        const updatedBooking = await prisma.booking.update({
            where: { id },
            data: { status: "CANCELLED" },
        });

        const notifyUserId =
            booking.clientId === userId ? booking.musicianId : booking.clientId;

        const cancelNotification = await prisma.notification.create({
            data: {
                userId: notifyUserId,
                title: "Booking Cancelled",
                message: `The booking for ${booking.eventName} has been cancelled`,
                type: "booking_cancelled",
                metadata: { bookingId: booking.id },
            },
        });

        emitToUser(notifyUserId, "notification", cancelNotification);

        sendSuccessResponse(
            res,
            StatusCodes.OK,
            "Booking cancelled successfully.",
            { booking: updatedBooking },
        );
    },
);

export const completeBooking = asyncWrapper(
    async (req: AuthRequest, res: Response) => {
        const userId = req.user?.userId;
        const { id } = req.params;

        const booking = await prisma.booking.findFirst({
            where: {
                id,
                OR: [{ clientId: userId }, { musicianId: userId }],
                status: "ACCEPTED",
            },
        });

        if (!booking) {
            return sendErrorResponse(
                res,
                StatusCodes.NOT_FOUND,
                "Booking not found or cannot be completed.",
            );
        }

        const updatedBooking = await prisma.booking.update({
            where: { id },
            data: { status: "COMPLETED" },
        });

        await prisma.musicianProfile.update({
            where: { userId: booking.musicianId },
            data: {
                totalGigs: { increment: 1 },
            },
        });

        const otherUserId =
            booking.clientId === userId
                ? booking.musicianId
                : booking.clientId;

        const completionNotification = await prisma.notification.create({
            data: {
                userId: otherUserId,
                title: "Booking Completed",
                message: `The booking for ${booking.eventName} has been marked as completed`,
                type: "booking_completed",
                metadata: { bookingId: booking.id },
            },
        });

        emitToUser(otherUserId, "notification", completionNotification);

        sendSuccessResponse(
            res,
            StatusCodes.OK,
            "Booking completed successfully.",
            { booking: updatedBooking },
        );
    },
);

export const getClientBookings = asyncWrapper(
    async (req: AuthRequest, res: Response) => {
        const userId = req.user?.userId;
        const { status, page = 1, limit = 20 } = req.query;

        const skip = (Number(page) - 1) * Number(limit);

        const where: any = { clientId: userId };
        if (status) where.status = status;

        const [bookings, total] = await Promise.all([
            prisma.booking.findMany({
                where,
                include: {
                    musician: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            profileImage: true,
                            musicianProfile: {
                                select: {
                                    averageRating: true,
                                    totalGigs: true,
                                },
                            },
                        },
                    },
                    instruments: true,
                },
                skip,
                take: Number(limit),
                orderBy: { createdAt: "desc" },
            }),
            prisma.booking.count({ where }),
        ]);

        sendSuccessResponse(
            res,
            StatusCodes.OK,
            "Client bookings retrieved successfully.",
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

export const getMusicianBookings = asyncWrapper(
    async (req: AuthRequest, res: Response) => {
        const userId = req.user?.userId;
        const { status, page = 1, limit = 20 } = req.query;

        const skip = (Number(page) - 1) * Number(limit);

        const where: any = { musicianId: userId };
        if (status) where.status = status;

        const [bookings, total] = await Promise.all([
            prisma.booking.findMany({
                where,
                include: {
                    client: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            phone: true,
                            profileImage: true,
                        },
                    },
                    instruments: true,
                },
                skip,
                take: Number(limit),
                orderBy: { createdAt: "desc" },
            }),
            prisma.booking.count({ where }),
        ]);

        sendSuccessResponse(
            res,
            StatusCodes.OK,
            "Musician bookings retrieved successfully.",
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

export const getPendingBookings = asyncWrapper(
    async (req: AuthRequest, res: Response) => {
        const userId = req.user?.userId;

        const bookings = await prisma.booking.findMany({
            where: {
                musicianId: userId,
                status: "PENDING",
            },
            include: {
                client: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        phone: true,
                        email: true,
                        profileImage: true,
                    },
                },
                instruments: true,
            },
            orderBy: { createdAt: "desc" },
        });

        sendSuccessResponse(
            res,
            StatusCodes.OK,
            "Pending bookings retrieved successfully.",
            { bookings },
        );
    },
);
