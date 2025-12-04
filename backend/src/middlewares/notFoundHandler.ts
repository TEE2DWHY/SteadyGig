import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { sendErrorResponse } from "../utils/responseHandler";

const notFoundHandler = (req: Request, res: Response) => {
    sendErrorResponse(res, StatusCodes.NOT_FOUND, "Resource not found");
};

export default notFoundHandler;
