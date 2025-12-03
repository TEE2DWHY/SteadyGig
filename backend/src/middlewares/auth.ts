import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../utils/jwt";
import { prisma } from "../config/database";
import { sendErrorResponse } from "../utils/responseHandler";
import { StatusCodes } from "http-status-codes";

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
  };
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return sendErrorResponse(
        res,
        StatusCodes.UNAUTHORIZED,
        "No token provided",
      );
    }

    const token = authHeader.substring(7);

    try {
      const decoded = verifyAccessToken(token);

      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, email: true, role: true, isActive: true },
      });

      if (!user || !user.isActive) {
        return sendErrorResponse(
          res,
          StatusCodes.UNAUTHORIZED,
          "User not found or inactive",
        );
      }

      req.user = {
        userId: user.id,
        email: user.email,
        role: user.role,
      };

      next();
    } catch (error) {
      return sendErrorResponse(
        res,
        StatusCodes.UNAUTHORIZED,
        "Invalid or expired token",
      );
    }
  } catch (error) {
    next(error);
  }
};

export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      sendErrorResponse(res, StatusCodes.UNAUTHORIZED, "Unauthorized access");
      return;
    }

    if (!roles.includes(req.user.role)) {
      return sendErrorResponse(
        res,
        StatusCodes.FORBIDDEN,
        "Forbidden: You do not have access to this resource",
      );
    }

    next();
  };
};
