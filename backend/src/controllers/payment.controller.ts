import { Request, Response } from "express";
import {
    sendSuccessResponse,
    sendErrorResponse,
} from "../utils/responseHandler";
import { StatusCodes } from "http-status-codes";
import { prisma } from "../config/database";
import asyncWrapper from "../utils/asyncWrapper";
import { AuthRequest } from "../middlewares/auth";
import paystackService from "../utils/paystack";
import { emitToUser } from "../config/socket";

export const initiatePayment = asyncWrapper(
    async (req: AuthRequest, res: Response) => {
        const userId = req.user?.userId;

        const { amount, currency, bookingId, metadata, callback_url } = req.body;

        if (!amount || amount <= 0) {
            return sendErrorResponse(
                res,
                StatusCodes.BAD_REQUEST,
                "Invalid amount.",
            );
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { email: true, firstName: true, lastName: true },
        });

        if (!user) {
            return sendErrorResponse(
                res,
                StatusCodes.NOT_FOUND,
                "User not found.",
            );
        }

        const transactionRef = paystackService.generateReference();

        const paystackResponse = await paystackService.initializePayment({
            email: user.email,
            amount,
            reference: transactionRef,
            callback_url: callback_url || `${process.env.FRONTEND_URL}/payment/verify`,
            metadata: {
                ...metadata,
                userId,
                userName: `${user.firstName} ${user.lastName}`,
                bookingId,
            },
        });

        if (!paystackResponse.success) {
            return sendErrorResponse(
                res,
                StatusCodes.BAD_REQUEST,
                paystackResponse.error || "Failed to initialize payment",
            );
        }

        const payment = await prisma.payment.create({
            data: {
                userId: userId!,
                amount,
                currency: currency || "NGN",
                paymentMethod: "paystack",
                transactionRef,
                paymentStatus: "pending",
                bookingId: bookingId || null,
                metadata: {
                    ...metadata,
                    accessCode: paystackResponse.accessCode,
                },
            },
        });

        sendSuccessResponse(
            res,
            StatusCodes.CREATED,
            "Payment initiated successfully.",
            {
                payment,
                authorizationUrl: paystackResponse.authorizationUrl,
                accessCode: paystackResponse.accessCode,
                reference: transactionRef,
            },
        );
    },
);

export const verifyPayment = asyncWrapper(
    async (req: Request, res: Response) => {
        const { transactionRef } = req.params;

        const payment = await prisma.payment.findUnique({
            where: { transactionRef },
        });

        if (!payment) {
            return sendErrorResponse(
                res,
                StatusCodes.NOT_FOUND,
                "Payment not found.",
            );
        }

        if (payment.paymentStatus === "successful") {
            return sendSuccessResponse(
                res,
                StatusCodes.OK,
                "Payment already verified.",
                { payment },
            );
        }

        const verificationResult = await paystackService.verifyPayment(transactionRef);

        if (!verificationResult || !verificationResult.status) {
            await prisma.payment.update({
                where: { transactionRef },
                data: { paymentStatus: "failed" },
            });

            return sendErrorResponse(
                res,
                StatusCodes.BAD_REQUEST,
                "Payment verification failed.",
            );
        }

        const paystackData = verificationResult.data;
        const isSuccessful = paystackData.status === "success";

        const updatedPayment = await prisma.payment.update({
            where: { transactionRef },
            data: {
                paymentStatus: isSuccessful ? "successful" : "failed",
                metadata: {
                    ...(payment.metadata as any),
                    paystackData: {
                        paidAt: paystackData.paid_at,
                        channel: paystackData.channel,
                        fees: paystackData.fees,
                        authorization: paystackData.authorization,
                    },
                },
            },
        });

        if (isSuccessful) {
            const notification = await prisma.notification.create({
                data: {
                    userId: payment.userId,
                    title: "Payment Successful",
                    message: "Your payment has been processed successfully.",
                    type: "payment_received",
                    metadata: { paymentId: payment.id },
                },
            });

            emitToUser(payment.userId, "notification", notification);

            if (payment.bookingId) {
                const booking = await prisma.booking.findUnique({
                    where: { id: payment.bookingId },
                    include: { musician: true },
                });

                if (booking) {
                    const musicianNotification = await prisma.notification.create({
                        data: {
                            userId: booking.musicianId,
                            title: "Payment Received",
                            message: `Payment received for ${booking.eventName}`,
                            type: "payment_received",
                            metadata: { bookingId: booking.id, paymentId: payment.id },
                        },
                    });

                    emitToUser(booking.musicianId, "notification", musicianNotification);
                }
            }
        }

        return sendSuccessResponse(
            res,
            StatusCodes.OK,
            isSuccessful ? "Payment verified successfully." : "Payment verification failed.",
            { payment: updatedPayment },
        );
    },
);

export const getPaymentHistory = asyncWrapper(
    async (req: AuthRequest, res: Response) => {
        const userId = req.user?.userId;
        const { page = 1, limit = 20, status } = req.query;

        const skip = (Number(page) - 1) * Number(limit);

        const where: any = { userId };
        if (status) where.paymentStatus = status;

        const [payments, total] = await Promise.all([
            prisma.payment.findMany({
                where,
                include: {
                    booking: {
                        select: {
                            id: true,
                            eventName: true,
                            eventDate: true,
                        },
                    },
                },
                skip,
                take: Number(limit),
                orderBy: { createdAt: "desc" },
            }),
            prisma.payment.count({ where }),
        ]);

        sendSuccessResponse(
            res,
            StatusCodes.OK,
            "Payment history retrieved successfully.",
            {
                payments,
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

export const getPaymentById = asyncWrapper(
    async (req: AuthRequest, res: Response) => {
        const userId = req.user?.userId;
        const { id } = req.params;

        const payment = await prisma.payment.findFirst({
            where: {
                id,
                userId,
            },
            include: {
                booking: {
                    select: {
                        id: true,
                        eventName: true,
                        eventDate: true,
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
                },
            },
        });

        if (!payment) {
            return sendErrorResponse(
                res,
                StatusCodes.NOT_FOUND,
                "Payment not found.",
            );
        }

        sendSuccessResponse(
            res,
            StatusCodes.OK,
            "Payment retrieved successfully.",
            { payment },
        );
    },
);

export const processBookingPayment = asyncWrapper(
    async (req: AuthRequest, res: Response) => {
        const userId = req.user?.userId;
        const { bookingId, callback_url } = req.body;

        const booking = await prisma.booking.findFirst({
            where: {
                id: bookingId,
                clientId: userId,
                status: "ACCEPTED",
            },
            include: {
                client: {
                    select: { email: true, firstName: true, lastName: true },
                },
            },
        });

        if (!booking) {
            return sendErrorResponse(
                res,
                StatusCodes.NOT_FOUND,
                "Booking not found or not in accepted state.",
            );
        }

        if (!booking.agreedRate) {
            return sendErrorResponse(
                res,
                StatusCodes.BAD_REQUEST,
                "Booking does not have an agreed rate.",
            );
        }

        const existingPayment = await prisma.payment.findFirst({
            where: {
                bookingId,
                paymentStatus: { in: ["successful", "pending"] },
            },
        });

        if (existingPayment) {
            return sendErrorResponse(
                res,
                StatusCodes.BAD_REQUEST,
                "Payment already exists for this booking.",
            );
        }

        const transactionRef = paystackService.generateReference();

        const paystackResponse = await paystackService.initializePayment({
            email: booking.client.email,
            amount: booking.agreedRate,
            reference: transactionRef,
            callback_url: callback_url || `${process.env.FRONTEND_URL}/bookings/${bookingId}/payment`,
            metadata: {
                bookingId,
                eventName: booking.eventName,
                musicianId: booking.musicianId,
                userId,
                type: "booking",
            },
        });

        if (!paystackResponse.success) {
            return sendErrorResponse(
                res,
                StatusCodes.BAD_REQUEST,
                paystackResponse.error || "Failed to initialize payment",
            );
        }

        const payment = await prisma.payment.create({
            data: {
                userId: userId!,
                bookingId,
                amount: booking.agreedRate,
                currency: "NGN",
                paymentMethod: "paystack",
                transactionRef,
                paymentStatus: "pending",
                metadata: {
                    bookingId,
                    eventName: booking.eventName,
                    musicianId: booking.musicianId,
                    accessCode: paystackResponse.accessCode,
                },
            },
        });

        sendSuccessResponse(
            res,
            StatusCodes.CREATED,
            "Booking payment initiated successfully.",
            {
                payment,
                authorizationUrl: paystackResponse.authorizationUrl,
                accessCode: paystackResponse.accessCode,
                reference: transactionRef,
            },
        );
    },
);

export const processSubscriptionPayment = asyncWrapper(
    async (req: AuthRequest, res: Response) => {
        const userId = req.user?.userId;
        const { amount, durationMonths = 1, callback_url } = req.body;

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { email: true, firstName: true, lastName: true },
        });

        if (!user) {
            return sendErrorResponse(
                res,
                StatusCodes.NOT_FOUND,
                "User not found.",
            );
        }

        const profile = await prisma.musicianProfile.findUnique({
            where: { userId },
        });

        if (!profile) {
            return sendErrorResponse(
                res,
                StatusCodes.NOT_FOUND,
                "Musician profile not found.",
            );
        }

        const transactionRef = paystackService.generateReference();

        const paystackResponse = await paystackService.initializePayment({
            email: user.email,
            amount,
            reference: transactionRef,
            callback_url: callback_url || `${process.env.FRONTEND_URL}/subscription/verify`,
            metadata: {
                type: "subscription",
                durationMonths,
                musicianProfileId: profile.id,
                userId,
            },
        });

        if (!paystackResponse.success) {
            return sendErrorResponse(
                res,
                StatusCodes.BAD_REQUEST,
                paystackResponse.error || "Failed to initialize payment",
            );
        }

        const payment = await prisma.payment.create({
            data: {
                userId: userId!,
                amount,
                currency: "NGN",
                paymentMethod: "paystack",
                transactionRef,
                paymentStatus: "pending",
                metadata: {
                    type: "subscription",
                    durationMonths,
                    musicianProfileId: profile.id,
                    accessCode: paystackResponse.accessCode,
                },
            },
        });

        sendSuccessResponse(
            res,
            StatusCodes.CREATED,
            "Subscription payment initiated successfully.",
            {
                payment,
                authorizationUrl: paystackResponse.authorizationUrl,
                accessCode: paystackResponse.accessCode,
                reference: transactionRef,
            },
        );
    },
);

export const getAllPayments = asyncWrapper(
    async (req: Request, res: Response) => {
        const { page = 1, limit = 20, status, userId } = req.query;

        const skip = (Number(page) - 1) * Number(limit);

        const where: any = {};
        if (status) where.paymentStatus = status;
        if (userId) where.userId = userId;

        const [payments, total] = await Promise.all([
            prisma.payment.findMany({
                where,
                include: {
                    user: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                        },
                    },
                    booking: {
                        select: {
                            id: true,
                            eventName: true,
                            eventDate: true,
                        },
                    },
                },
                skip,
                take: Number(limit),
                orderBy: { createdAt: "desc" },
            }),
            prisma.payment.count({ where }),
        ]);

        sendSuccessResponse(
            res,
            StatusCodes.OK,
            "Payments retrieved successfully.",
            {
                payments,
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
