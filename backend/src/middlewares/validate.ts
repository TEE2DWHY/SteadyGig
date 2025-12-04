import { Request, Response, NextFunction } from "express";
import { validationResult } from "express-validator";
import { sendErrorResponse } from "../utils/responseHandler";
import { StatusCodes } from "http-status-codes";

export const validate = (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return sendErrorResponse(
            res,
            StatusCodes.BAD_REQUEST,
            "Validation Error.",
        );
    }
    next();
};
