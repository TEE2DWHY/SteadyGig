import { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";
import { sendErrorResponse } from "../utils/responseHandler";

const errorHandler = (
    err: any,
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    let message = err.message || "An unexpected error occurred";

    if (err.name === "ValidationError") {
        message = err.message;
    } else if (err.code === 11000) {
        message = `${Object.keys(err.keyValue)} is taken already.`;
    } else if (err.name === "CastError") {
        message = `${Object.keys(err.value)} is not found in database.`;
    } else if (err.name === "TokenExpiredError") {
        message = "Token has expired.";
    } else if (err.name === "JsonWebTokenError") {
        message = "Invalid token. Please provide a valid token.";
    }

    console.error("Error:", err);
    sendErrorResponse(res, getStatusCode(err), message);
};

const getStatusCode = (err: any) => {
    if (err.statusCode) {
        return err.statusCode;
    }
    if (err.name === "ValidationError") {
        return StatusCodes.BAD_REQUEST;
    }
    if (err.code === 11000 || err.name === "CastError") {
        return StatusCodes.BAD_REQUEST;
    }
    if (err.name === "TokenExpiredError" || err.name === "JsonWebTokenError") {
        return StatusCodes.UNAUTHORIZED;
    }
    return StatusCodes.INTERNAL_SERVER_ERROR;
};

export default errorHandler;
