import { Request, Response } from "express";
import {
    sendSuccessResponse,
    sendErrorResponse,
} from "../utils/responseHandler";
import { StatusCodes } from "http-status-codes";
import { prisma } from "../config/database";
import asyncWrapper from "../utils/asyncWrapper";
import { AuthRequest } from "../middlewares/auth";

export const createReview = asyncWrapper(
    async (req: AuthRequest, res: Response) => {
        const userId = req.user?.userId;
        const { bookingId, rating, comment } = req.body;

        if (rating < 1 || rating > 5) {
            return sendErrorResponse(
                res,
                StatusCodes.BAD_REQUEST,
                "Rating must be between 1 and 5.",
            );
        }

        const booking = await prisma.booking.findFirst({
            where: {
                id: bookingId,
                clientId: userId,
                status: "COMPLETED",
            },
        });

        if (!booking) {
            return sendErrorResponse(
                res,
                StatusCodes.NOT_FOUND,
                "Booking not found or not completed.",
            );
        }

        const existingReview = await prisma.review.findUnique({
            where: { bookingId },
        });

        if (existingReview) {
            return sendErrorResponse(
                res,
                StatusCodes.BAD_REQUEST,
                "Review already exists for this booking.",
            );
        }

        const review = await prisma.review.create({
            data: {
                bookingId,
                reviewerId: userId!,
                rating,
                comment,
            },
            include: {
                reviewer: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        profileImage: true,
                    },
                },
                booking: {
                    select: {
                        id: true,
                        eventName: true,
                        eventDate: true,
                        musicianId: true,
                    },
                },
            },
        });

        const musicianReviews = await prisma.review.findMany({
            where: {
                booking: {
                    musicianId: booking.musicianId,
                },
            },
            select: { rating: true },
        });

        const totalRating = musicianReviews.reduce(
            (sum, r) => sum + r.rating,
            0,
        );
        const averageRating = totalRating / musicianReviews.length;

        await prisma.musicianProfile.update({
            where: { userId: booking.musicianId },
            data: { averageRating },
        });

        await prisma.notification.create({
            data: {
                userId: booking.musicianId,
                title: "New Review",
                message: `You received a ${rating}-star review`,
                type: "review_received",
                metadata: { reviewId: review.id },
            },
        });

        sendSuccessResponse(
            res,
            StatusCodes.CREATED,
            "Review created successfully.",
            { review },
        );
    },
);

export const getReviewsByMusician = asyncWrapper(
    async (req: Request, res: Response) => {
        const { musicianId } = req.params;
        const { page = 1, limit = 20 } = req.query;

        const skip = (Number(page) - 1) * Number(limit);

        const [reviews, total] = await Promise.all([
            prisma.review.findMany({
                where: {
                    booking: {
                        musicianId,
                    },
                },
                include: {
                    reviewer: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            profileImage: true,
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
            prisma.review.count({
                where: {
                    booking: {
                        musicianId,
                    },
                },
            }),
        ]);

        const ratingDistribution = await prisma.review.groupBy({
            by: ["rating"],
            where: {
                booking: {
                    musicianId,
                },
            },
            _count: { rating: true },
        });

        sendSuccessResponse(
            res,
            StatusCodes.OK,
            "Reviews retrieved successfully.",
            {
                reviews,
                ratingDistribution,
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

export const getReviewById = asyncWrapper(
    async (req: Request, res: Response) => {
        const { id } = req.params;

        const review = await prisma.review.findUnique({
            where: { id },
            include: {
                reviewer: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        profileImage: true,
                    },
                },
                booking: {
                    select: {
                        id: true,
                        eventName: true,
                        eventDate: true,
                        musician: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                profileImage: true,
                            },
                        },
                    },
                },
            },
        });

        if (!review) {
            return sendErrorResponse(
                res,
                StatusCodes.NOT_FOUND,
                "Review not found.",
            );
        }

        sendSuccessResponse(
            res,
            StatusCodes.OK,
            "Review retrieved successfully.",
            { review },
        );
    },
);

export const updateReview = asyncWrapper(
    async (req: AuthRequest, res: Response) => {
        const userId = req.user?.userId;
        const { id } = req.params;
        const { rating, comment } = req.body;

        if (rating && (rating < 1 || rating > 5)) {
            return sendErrorResponse(
                res,
                StatusCodes.BAD_REQUEST,
                "Rating must be between 1 and 5.",
            );
        }

        const review = await prisma.review.findFirst({
            where: {
                id,
                reviewerId: userId,
            },
            include: { booking: true },
        });

        if (!review) {
            return sendErrorResponse(
                res,
                StatusCodes.NOT_FOUND,
                "Review not found or unauthorized.",
            );
        }

        const reviewAge = Date.now() - new Date(review.createdAt).getTime();
        const maxEditTime = 7 * 24 * 60 * 60 * 1000;

        if (reviewAge > maxEditTime) {
            return sendErrorResponse(
                res,
                StatusCodes.BAD_REQUEST,
                "Reviews can only be edited within 7 days of creation.",
            );
        }

        const updatedReview = await prisma.review.update({
            where: { id },
            data: {
                rating: rating !== undefined ? rating : review.rating,
                comment: comment !== undefined ? comment : review.comment,
            },
            include: {
                reviewer: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        profileImage: true,
                    },
                },
            },
        });

        if (rating !== undefined) {
            const musicianReviews = await prisma.review.findMany({
                where: {
                    booking: {
                        musicianId: review.booking.musicianId,
                    },
                },
                select: { rating: true },
            });

            const totalRating = musicianReviews.reduce(
                (sum, r) => sum + r.rating,
                0,
            );
            const averageRating = totalRating / musicianReviews.length;

            await prisma.musicianProfile.update({
                where: { userId: review.booking.musicianId },
                data: { averageRating },
            });
        }

        sendSuccessResponse(
            res,
            StatusCodes.OK,
            "Review updated successfully.",
            { review: updatedReview },
        );
    },
);

export const deleteReview = asyncWrapper(
    async (req: AuthRequest, res: Response) => {
        const userId = req.user?.userId;
        const { id } = req.params;

        const review = await prisma.review.findFirst({
            where: {
                id,
                reviewerId: userId,
            },
            include: { booking: true },
        });

        if (!review) {
            return sendErrorResponse(
                res,
                StatusCodes.NOT_FOUND,
                "Review not found or unauthorized.",
            );
        }

        await prisma.review.delete({
            where: { id },
        });

        const musicianReviews = await prisma.review.findMany({
            where: {
                booking: {
                    musicianId: review.booking.musicianId,
                },
            },
            select: { rating: true },
        });

        const averageRating =
            musicianReviews.length > 0
                ? musicianReviews.reduce((sum, r) => sum + r.rating, 0) /
                  musicianReviews.length
                : 0;

        await prisma.musicianProfile.update({
            where: { userId: review.booking.musicianId },
            data: { averageRating },
        });

        sendSuccessResponse(res, StatusCodes.OK, "Review deleted successfully.");
    },
);

export const getMyReviews = asyncWrapper(
    async (req: AuthRequest, res: Response) => {
        const userId = req.user?.userId;
        const { page = 1, limit = 20 } = req.query;

        const skip = (Number(page) - 1) * Number(limit);

        const [reviews, total] = await Promise.all([
            prisma.review.findMany({
                where: { reviewerId: userId },
                include: {
                    booking: {
                        select: {
                            id: true,
                            eventName: true,
                            eventDate: true,
                            musician: {
                                select: {
                                    id: true,
                                    firstName: true,
                                    lastName: true,
                                    profileImage: true,
                                },
                            },
                        },
                    },
                },
                skip,
                take: Number(limit),
                orderBy: { createdAt: "desc" },
            }),
            prisma.review.count({ where: { reviewerId: userId } }),
        ]);

        sendSuccessResponse(
            res,
            StatusCodes.OK,
            "Your reviews retrieved successfully.",
            {
                reviews,
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
