import { Request, Response } from "express";
import {
    sendSuccessResponse,
    sendErrorResponse,
} from "../utils/responseHandler";
import { StatusCodes } from "http-status-codes";
import { prisma } from "../config/database";
import asyncWrapper from "../utils/asyncWrapper";

export const createInstrument = asyncWrapper(
    async (req: Request, res: Response) => {
        const { name, category, description } = req.body;

        const existingInstrument = await prisma.instrument.findUnique({
            where: { name },
        });

        if (existingInstrument) {
            return sendErrorResponse(
                res,
                StatusCodes.BAD_REQUEST,
                "Instrument already exists.",
            );
        }

        const instrument = await prisma.instrument.create({
            data: {
                name,
                category,
                description,
            },
        });

        sendSuccessResponse(
            res,
            StatusCodes.CREATED,
            "Instrument created successfully.",
            { instrument },
        );
    },
);

export const getInstruments = asyncWrapper(
    async (req: Request, res: Response) => {
        const { category, page = 1, limit = 50 } = req.query;

        const skip = (Number(page) - 1) * Number(limit);

        const where: any = {};
        if (category) where.category = category;

        const [instruments, total] = await Promise.all([
            prisma.instrument.findMany({
                where,
                skip,
                take: Number(limit),
                orderBy: { name: "asc" },
            }),
            prisma.instrument.count({ where }),
        ]);

        sendSuccessResponse(
            res,
            StatusCodes.OK,
            "Instruments retrieved successfully.",
            {
                instruments,
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

export const getInstrumentById = asyncWrapper(
    async (req: Request, res: Response) => {
        const { id } = req.params;

        const instrument = await prisma.instrument.findUnique({
            where: { id },
            include: {
                _count: {
                    select: {
                        musicians: true,
                        bookings: true,
                    },
                },
            },
        });

        if (!instrument) {
            return sendErrorResponse(
                res,
                StatusCodes.NOT_FOUND,
                "Instrument not found.",
            );
        }

        sendSuccessResponse(
            res,
            StatusCodes.OK,
            "Instrument retrieved successfully.",
            { instrument },
        );
    },
);

export const updateInstrument = asyncWrapper(
    async (req: Request, res: Response) => {
        const { id } = req.params;
        const { name, category, description } = req.body;

        const existingInstrument = await prisma.instrument.findUnique({
            where: { id },
        });

        if (!existingInstrument) {
            return sendErrorResponse(
                res,
                StatusCodes.NOT_FOUND,
                "Instrument not found.",
            );
        }

        if (name && name !== existingInstrument.name) {
            const duplicateInstrument = await prisma.instrument.findUnique({
                where: { name },
            });

            if (duplicateInstrument) {
                return sendErrorResponse(
                    res,
                    StatusCodes.BAD_REQUEST,
                    "Instrument name already exists.",
                );
            }
        }

        const instrument = await prisma.instrument.update({
            where: { id },
            data: {
                name,
                category,
                description,
            },
        });

        sendSuccessResponse(
            res,
            StatusCodes.OK,
            "Instrument updated successfully.",
            { instrument },
        );
    },
);

export const deleteInstrument = asyncWrapper(
    async (req: Request, res: Response) => {
        const { id } = req.params;

        const instrument = await prisma.instrument.findUnique({
            where: { id },
            include: {
                _count: {
                    select: {
                        musicians: true,
                        bookings: true,
                    },
                },
            },
        });

        if (!instrument) {
            return sendErrorResponse(
                res,
                StatusCodes.NOT_FOUND,
                "Instrument not found.",
            );
        }

        if (
            instrument._count.musicians > 0 ||
            instrument._count.bookings > 0
        ) {
            return sendErrorResponse(
                res,
                StatusCodes.BAD_REQUEST,
                "Cannot delete instrument that is in use by musicians or bookings.",
            );
        }

        await prisma.instrument.delete({
            where: { id },
        });

        sendSuccessResponse(
            res,
            StatusCodes.OK,
            "Instrument deleted successfully.",
        );
    },
);

export const getInstrumentCategories = asyncWrapper(
    async (req: Request, res: Response) => {
        const categories = [
            "STRINGS",
            "WOODWIND",
            "BRASS",
            "PERCUSSION",
            "KEYBOARD",
            "VOCAL",
            "ELECTRONIC",
            "OTHER",
        ];

        sendSuccessResponse(
            res,
            StatusCodes.OK,
            "Instrument categories retrieved successfully.",
            { categories },
        );
    },
);
