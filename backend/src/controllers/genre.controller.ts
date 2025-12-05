import { Request, Response } from "express";
import {
    sendSuccessResponse,
    sendErrorResponse,
} from "../utils/responseHandler";
import { StatusCodes } from "http-status-codes";
import { prisma } from "../config/database";
import asyncWrapper from "../utils/asyncWrapper";

export const createGenre = asyncWrapper(async (req: Request, res: Response) => {
    const { name, description } = req.body;

    const existingGenre = await prisma.genre.findUnique({
        where: { name },
    });

    if (existingGenre) {
        return sendErrorResponse(
            res,
            StatusCodes.BAD_REQUEST,
            "Genre already exists.",
        );
    }

    const genre = await prisma.genre.create({
        data: {
            name,
            description,
        },
    });

    sendSuccessResponse(
        res,
        StatusCodes.CREATED,
        "Genre created successfully.",
        { genre },
    );
});

export const getGenres = asyncWrapper(async (req: Request, res: Response) => {
    const { page = 1, limit = 50 } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    const [genres, total] = await Promise.all([
        prisma.genre.findMany({
            skip,
            take: Number(limit),
            orderBy: { name: "asc" },
        }),
        prisma.genre.count(),
    ]);

    sendSuccessResponse(res, StatusCodes.OK, "Genres retrieved successfully.", {
        genres,
        pagination: {
            total,
            page: Number(page),
            limit: Number(limit),
            totalPages: Math.ceil(total / Number(limit)),
        },
    });
});

export const getGenreById = asyncWrapper(
    async (req: Request, res: Response) => {
        const { id } = req.params;

        const genre = await prisma.genre.findUnique({
            where: { id },
            include: {
                _count: {
                    select: {
                        musicians: true,
                    },
                },
            },
        });

        if (!genre) {
            return sendErrorResponse(
                res,
                StatusCodes.NOT_FOUND,
                "Genre not found.",
            );
        }

        sendSuccessResponse(
            res,
            StatusCodes.OK,
            "Genre retrieved successfully.",
            { genre },
        );
    },
);

export const updateGenre = asyncWrapper(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, description } = req.body;

    const existingGenre = await prisma.genre.findUnique({
        where: { id },
    });

    if (!existingGenre) {
        return sendErrorResponse(
            res,
            StatusCodes.NOT_FOUND,
            "Genre not found.",
        );
    }

    if (name && name !== existingGenre.name) {
        const duplicateGenre = await prisma.genre.findUnique({
            where: { name },
        });

        if (duplicateGenre) {
            return sendErrorResponse(
                res,
                StatusCodes.BAD_REQUEST,
                "Genre name already exists.",
            );
        }
    }

    const genre = await prisma.genre.update({
        where: { id },
        data: {
            name,
            description,
        },
    });

    sendSuccessResponse(
        res,
        StatusCodes.OK,
        "Genre updated successfully.",
        { genre },
    );
});

export const deleteGenre = asyncWrapper(async (req: Request, res: Response) => {
    const { id } = req.params;

    const genre = await prisma.genre.findUnique({
        where: { id },
        include: {
            _count: {
                select: {
                    musicians: true,
                },
            },
        },
    });

    if (!genre) {
        return sendErrorResponse(
            res,
            StatusCodes.NOT_FOUND,
            "Genre not found.",
        );
    }

    if (genre._count.musicians > 0) {
        return sendErrorResponse(
            res,
            StatusCodes.BAD_REQUEST,
            "Cannot delete genre that is in use by musicians.",
        );
    }

    await prisma.genre.delete({
        where: { id },
    });

    sendSuccessResponse(res, StatusCodes.OK, "Genre deleted successfully.");
});
