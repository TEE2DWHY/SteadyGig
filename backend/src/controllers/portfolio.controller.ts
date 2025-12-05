import { Request, Response } from "express";
import {
    sendSuccessResponse,
    sendErrorResponse,
} from "../utils/responseHandler";
import { StatusCodes } from "http-status-codes";
import { prisma } from "../config/database";
import asyncWrapper from "../utils/asyncWrapper";
import { AuthRequest } from "../middlewares/auth";
import cloudinaryUploadService from "../utils/cloudinaryUpload";

export const uploadPortfolioItem = asyncWrapper(
    async (req: AuthRequest, res: Response) => {
        const userId = req.user?.userId;

        if (!req.file) {
            return sendErrorResponse(
                res,
                StatusCodes.BAD_REQUEST,
                "No file uploaded.",
            );
        }

        const profile = await prisma.musicianProfile.findUnique({
            where: { userId },
        });

        if (!profile) {
            return sendErrorResponse(
                res,
                StatusCodes.NOT_FOUND,
                "Musician profile not found. Create a profile first.",
            );
        }

        const { title, description } = req.body;
        const file = req.file;

        const fileType = cloudinaryUploadService.determineFileType(file.mimetype);

        let uploadResult;
        if (fileType === "image") {
            uploadResult = await cloudinaryUploadService.uploadImage(file, "steadygig/portfolio/images");
        } else if (fileType === "video") {
            uploadResult = await cloudinaryUploadService.uploadVideo(file, "steadygig/portfolio/videos");
        } else if (fileType === "audio") {
            uploadResult = await cloudinaryUploadService.uploadAudio(file, "steadygig/portfolio/audio");
        }

        if (!uploadResult || !uploadResult.success) {
            return sendErrorResponse(
                res,
                StatusCodes.INTERNAL_SERVER_ERROR,
                uploadResult?.error || "Failed to upload file.",
            );
        }

        let thumbnailUrl = uploadResult.secureUrl;
        if (fileType === "video" && uploadResult.publicId) {
            thumbnailUrl = cloudinaryUploadService.generateThumbnail(uploadResult.publicId);
        }

        const portfolioItem = await prisma.portfolioItem.create({
            data: {
                musicianProfileId: profile.id,
                title,
                description,
                fileUrl: uploadResult.secureUrl!,
                fileType,
                thumbnailUrl,
                duration: null,
            },
        });

        sendSuccessResponse(
            res,
            StatusCodes.CREATED,
            "Portfolio item uploaded successfully.",
            { portfolioItem },
        );
    },
);

export const getPortfolioItems = asyncWrapper(
    async (req: Request, res: Response) => {
        const { musicianProfileId } = req.params;

        const items = await prisma.portfolioItem.findMany({
            where: { musicianProfileId },
            orderBy: { createdAt: "desc" },
        });

        sendSuccessResponse(
            res,
            StatusCodes.OK,
            "Portfolio items retrieved successfully.",
            { items },
        );
    },
);

export const getMyPortfolioItems = asyncWrapper(
    async (req: AuthRequest, res: Response) => {
        const userId = req.user?.userId;

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

        const items = await prisma.portfolioItem.findMany({
            where: { musicianProfileId: profile.id },
            orderBy: { createdAt: "desc" },
        });

        sendSuccessResponse(
            res,
            StatusCodes.OK,
            "Portfolio items retrieved successfully.",
            { items },
        );
    },
);

export const getPortfolioItemById = asyncWrapper(
    async (req: Request, res: Response) => {
        const { id } = req.params;

        const item = await prisma.portfolioItem.findUnique({
            where: { id },
            include: {
                musicianProfile: {
                    include: {
                        user: {
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

        if (!item) {
            return sendErrorResponse(
                res,
                StatusCodes.NOT_FOUND,
                "Portfolio item not found.",
            );
        }

        sendSuccessResponse(
            res,
            StatusCodes.OK,
            "Portfolio item retrieved successfully.",
            { item },
        );
    },
);

export const updatePortfolioItem = asyncWrapper(
    async (req: AuthRequest, res: Response) => {
        const userId = req.user?.userId;
        const { id } = req.params;

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

        const existingItem = await prisma.portfolioItem.findFirst({
            where: {
                id,
                musicianProfileId: profile.id,
            },
        });

        if (!existingItem) {
            return sendErrorResponse(
                res,
                StatusCodes.NOT_FOUND,
                "Portfolio item not found or unauthorized.",
            );
        }

        const { title, description, thumbnailUrl } = req.body;

        const updatedItem = await prisma.portfolioItem.update({
            where: { id },
            data: {
                title,
                description,
                thumbnailUrl,
            },
        });

        sendSuccessResponse(
            res,
            StatusCodes.OK,
            "Portfolio item updated successfully.",
            { portfolioItem: updatedItem },
        );
    },
);

export const deletePortfolioItem = asyncWrapper(
    async (req: AuthRequest, res: Response) => {
        const userId = req.user?.userId;
        const { id } = req.params;

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

        const existingItem = await prisma.portfolioItem.findFirst({
            where: {
                id,
                musicianProfileId: profile.id,
            },
        });

        if (!existingItem) {
            return sendErrorResponse(
                res,
                StatusCodes.NOT_FOUND,
                "Portfolio item not found or unauthorized.",
            );
        }

        await prisma.portfolioItem.delete({
            where: { id },
        });

        sendSuccessResponse(
            res,
            StatusCodes.OK,
            "Portfolio item deleted successfully.",
        );
    },
);
