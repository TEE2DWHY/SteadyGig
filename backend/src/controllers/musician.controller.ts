import { Request, Response } from "express";
import {
    sendSuccessResponse,
    sendErrorResponse,
} from "../utils/responseHandler";
import { StatusCodes } from "http-status-codes";
import { prisma } from "../config/database";
import asyncWrapper from "../utils/asyncWrapper";
import { AuthRequest } from "../middlewares/auth";

export const createMusicianProfile = asyncWrapper(
    async (req: AuthRequest, res: Response) => {
        const userId = req.user?.userId;

        const existingProfile = await prisma.musicianProfile.findUnique({
            where: { userId },
        });

        if (existingProfile) {
            return sendErrorResponse(
                res,
                StatusCodes.BAD_REQUEST,
                "Musician profile already exists.",
            );
        }

        const {
            bio,
            yearsOfExperience,
            hourlyRate,
            city,
            state,
            country,
            latitude,
            longitude,
            instrumentIds,
            genreIds,
        } = req.body;

        const profile = await prisma.musicianProfile.create({
            data: {
                userId: userId!,
                bio,
                yearsOfExperience,
                hourlyRate,
                city,
                state,
                country: country || "Nigeria",
                latitude,
                longitude,
                instruments: instrumentIds
                    ? {
                          connect: instrumentIds.map((id: string) => ({ id })),
                      }
                    : undefined,
                genres: genreIds
                    ? {
                          connect: genreIds.map((id: string) => ({ id })),
                      }
                    : undefined,
            },
            include: {
                instruments: true,
                genres: true,
                user: {
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                        profileImage: true,
                    },
                },
            },
        });

        sendSuccessResponse(
            res,
            StatusCodes.CREATED,
            "Musician profile created successfully.",
            { profile },
        );
    },
);

export const getMusicianProfile = asyncWrapper(
    async (req: Request, res: Response) => {
        const { id } = req.params;

        const profile = await prisma.musicianProfile.findUnique({
            where: { id },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                        phone: true,
                        profileImage: true,
                    },
                },
                instruments: true,
                genres: true,
                portfolioVideos: {
                    orderBy: { createdAt: "desc" },
                },
                subscription: true,
            },
        });

        if (!profile) {
            return sendErrorResponse(
                res,
                StatusCodes.NOT_FOUND,
                "Musician profile not found.",
            );
        }

        sendSuccessResponse(
            res,
            StatusCodes.OK,
            "Musician profile retrieved successfully.",
            { profile },
        );
    },
);

export const getCurrentMusicianProfile = asyncWrapper(
    async (req: AuthRequest, res: Response) => {
        const userId = req.user?.userId;

        const profile = await prisma.musicianProfile.findUnique({
            where: { userId },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                        phone: true,
                        profileImage: true,
                    },
                },
                instruments: true,
                genres: true,
                portfolioVideos: {
                    orderBy: { createdAt: "desc" },
                },
                subscription: true,
            },
        });

        if (!profile) {
            return sendErrorResponse(
                res,
                StatusCodes.NOT_FOUND,
                "Musician profile not found.",
            );
        }

        sendSuccessResponse(
            res,
            StatusCodes.OK,
            "Musician profile retrieved successfully.",
            { profile },
        );
    },
);

export const updateMusicianProfile = asyncWrapper(
    async (req: AuthRequest, res: Response) => {
        const userId = req.user?.userId;

        const {
            bio,
            yearsOfExperience,
            hourlyRate,
            city,
            state,
            country,
            latitude,
            longitude,
            instrumentIds,
            genreIds,
            isAvailable,
        } = req.body;

        const profile = await prisma.musicianProfile.update({
            where: { userId },
            data: {
                bio,
                yearsOfExperience,
                hourlyRate,
                city,
                state,
                country,
                latitude,
                longitude,
                isAvailable,
                instruments: instrumentIds
                    ? {
                          set: instrumentIds.map((id: string) => ({ id })),
                      }
                    : undefined,
                genres: genreIds
                    ? {
                          set: genreIds.map((id: string) => ({ id })),
                      }
                    : undefined,
            },
            include: {
                instruments: true,
                genres: true,
                user: {
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                        profileImage: true,
                    },
                },
            },
        });

        sendSuccessResponse(
            res,
            StatusCodes.OK,
            "Musician profile updated successfully.",
            { profile },
        );
    },
);

export const toggleAvailability = asyncWrapper(
    async (req: AuthRequest, res: Response) => {
        const userId = req.user?.userId;
        const { isAvailable } = req.body;

        const profile = await prisma.musicianProfile.update({
            where: { userId },
            data: { isAvailable },
            select: {
                id: true,
                isAvailable: true,
            },
        });

        sendSuccessResponse(
            res,
            StatusCodes.OK,
            "Availability updated successfully.",
            { profile },
        );
    },
);

export const searchMusicians = asyncWrapper(
    async (req: Request, res: Response) => {
        const {
            city,
            state,
            instrumentId,
            genreId,
            minRating,
            maxRate,
            page = 1,
            limit = 20,
        } = req.query;

        const skip = (Number(page) - 1) * Number(limit);

        const where: any = {
            isAvailable: true,
            subscription: {
                status: "ACTIVE",
            },
        };

        if (city) where.city = { contains: city as string, mode: "insensitive" };
        if (state) where.state = { contains: state as string, mode: "insensitive" };
        if (instrumentId) {
            where.instruments = {
                some: { id: instrumentId as string },
            };
        }
        if (genreId) {
            where.genres = {
                some: { id: genreId as string },
            };
        }
        if (minRating) {
            where.averageRating = { gte: Number(minRating) };
        }
        if (maxRate) {
            where.hourlyRate = { lte: Number(maxRate) };
        }

        const [musicians, total] = await Promise.all([
            prisma.musicianProfile.findMany({
                where,
                include: {
                    user: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            profileImage: true,
                        },
                    },
                    instruments: true,
                    genres: true,
                },
                skip,
                take: Number(limit),
                orderBy: { averageRating: "desc" },
            }),
            prisma.musicianProfile.count({ where }),
        ]);

        sendSuccessResponse(
            res,
            StatusCodes.OK,
            "Musicians retrieved successfully.",
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

export const getMusiciansByLocation = asyncWrapper(
    async (req: Request, res: Response) => {
        const { latitude, longitude, radius = 50, limit = 20 } = req.query;

        if (!latitude || !longitude) {
            return sendErrorResponse(
                res,
                StatusCodes.BAD_REQUEST,
                "Latitude and longitude are required.",
            );
        }

        const lat = Number(latitude);
        const lon = Number(longitude);
        const rad = Number(radius);

        const musicians = await prisma.musicianProfile.findMany({
            where: {
                isAvailable: true,
                subscription: {
                    status: "ACTIVE",
                },
                latitude: { not: null },
                longitude: { not: null },
            },
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        profileImage: true,
                    },
                },
                instruments: true,
                genres: true,
            },
            take: Number(limit),
        });

        const musiciansWithDistance = musicians
            .map((musician) => {
                if (!musician.latitude || !musician.longitude) return null;

                const distance = calculateDistance(
                    lat,
                    lon,
                    musician.latitude,
                    musician.longitude,
                );

                return {
                    ...musician,
                    distance: Math.round(distance * 10) / 10,
                };
            })
            .filter((m) => m !== null && m.distance <= rad)
            .sort((a, b) => a!.distance - b!.distance);

        sendSuccessResponse(
            res,
            StatusCodes.OK,
            "Nearby musicians retrieved successfully.",
            { musicians: musiciansWithDistance },
        );
    },
);

export const getMusicianStats = asyncWrapper(
    async (req: AuthRequest, res: Response) => {
        const userId = req.user?.userId;

        const profile = await prisma.musicianProfile.findUnique({
            where: { userId },
            select: {
                totalGigs: true,
                averageRating: true,
                isAvailable: true,
            },
        });

        if (!profile) {
            return sendErrorResponse(
                res,
                StatusCodes.NOT_FOUND,
                "Musician profile not found.",
            );
        }

        const [totalEarnings, pendingBookings, completedBookings] =
            await Promise.all([
                prisma.booking.aggregate({
                    where: {
                        musician: { id: userId },
                        status: "COMPLETED",
                    },
                    _sum: { agreedRate: true },
                }),
                prisma.booking.count({
                    where: {
                        musician: { id: userId },
                        status: "PENDING",
                    },
                }),
                prisma.booking.count({
                    where: {
                        musician: { id: userId },
                        status: "COMPLETED",
                    },
                }),
            ]);

        sendSuccessResponse(res, StatusCodes.OK, "Stats retrieved successfully.", {
            stats: {
                ...profile,
                totalEarnings: totalEarnings._sum.agreedRate || 0,
                pendingBookings,
                completedBookings,
            },
        });
    },
);

function calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
): number {
    const R = 6371;
    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRadians(lat1)) *
            Math.cos(toRadians(lat2)) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
}
