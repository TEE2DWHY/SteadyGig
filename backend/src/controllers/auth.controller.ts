import { Request, Response } from "express";
import bcrypt from "bcrypt";
import asyncWrapper from "../utils/asyncWrapper";
import {
    sendErrorResponse,
    sendSuccessResponse,
} from "../utils/responseHandler";
import { StatusCodes } from "http-status-codes";
import { prisma } from "../config/database";
import {
    generateTokens,
    verifyRefreshToken,
    generateAccessToken,
} from "../utils/jwt";
import redisClient from "../config/redis";
import jwt from "jsonwebtoken";
import { AuthRequest } from "../middlewares/auth";
import { EmailHandler } from "../utils/emailHandler";

export const register = asyncWrapper(async (req: Request, res: Response) => {
    const { email, password, firstName, lastName, phone, role } = req.body;
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
        return sendErrorResponse(
            res,
            StatusCodes.BAD_REQUEST,
            "Email already registered.",
        );
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
        data: {
            email,
            password: hashedPassword,
            firstName,
            lastName,
            phone,
            role,
        },
        select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
        },
    });

    const tokens = generateTokens({
        userId: user.id,
        email: user.email,
        role: user.role,
    });

    const emailHandler = new EmailHandler();
    await emailHandler.sendWelcomeEmail(
        email,
        `${firstName} ${lastName}`.trim() || email,
    );

    sendSuccessResponse(
        res,
        StatusCodes.CREATED,
        "User registered successfully",
        { user, ...tokens },
    );
});

export const login = asyncWrapper(async (req: Request, res: Response) => {
    const { email, password } = req.body;

    const attemptsKey = `login:attempts:${email}`;
    const attempts = await redisClient.get(attemptsKey);

    if (attempts && parseInt(attempts) >= 5) {
        const ttl = await redisClient.ttl(attemptsKey);
        return sendErrorResponse(
            res,
            StatusCodes.TOO_MANY_REQUESTS,
            `Too many login attempts. Please try again in ${Math.ceil(ttl / 60)} minutes.`,
        );
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
        await redisClient.incr(attemptsKey);
        await redisClient.expire(attemptsKey, 900);
        return sendErrorResponse(
            res,
            StatusCodes.UNAUTHORIZED,
            "Invalid email or password.",
        );
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
        await redisClient.incr(attemptsKey);
        await redisClient.expire(attemptsKey, 900);
        return sendErrorResponse(
            res,
            StatusCodes.UNAUTHORIZED,
            "Invalid email or password.",
        );
    }

    await redisClient.del(attemptsKey);

    const tokens = generateTokens({
        userId: user.id,
        email: user.email,
        role: user.role,
    });

    await redisClient.setex(
        `refresh:${user.id}`,
        7 * 24 * 60 * 60,
        tokens.refreshToken,
    );

    const emailHandler = new EmailHandler();
    await emailHandler.sendEmail({
        to: user.email,
        subject: "New Login to Your Account - SteadyGig",
        html: `
            <!DOCTYPE html>
            <html>
              <head>
                <style>
                  body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                  .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                  .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
                  .content { padding: 20px; background-color: #f9f9f9; }
                  .info-box { background-color: #e8f5e9; border-left: 4px solid #4CAF50; padding: 12px; margin: 15px 0; }
                  .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="header">
                    <h1>Login Notification</h1>
                  </div>
                  <div class="content">
                    <p>Hello ${user.firstName || "there"},</p>
                    <p>We detected a new login to your SteadyGig account.</p>
                    <div class="info-box">
                      <strong>Login Details:</strong><br>
                      Time: ${new Date().toLocaleString()}<br>
                      Email: ${user.email}
                    </div>
                    <p>If this was you, no action is needed.</p>
                    <p>If you didn't log in, please reset your password immediately and contact our support team.</p>
                  </div>
                  <div class="footer">
                    <p>&copy; ${new Date().getFullYear()} SteadyGig. All rights reserved.</p>
                  </div>
                </div>
              </body>
            </html>
        `,
        text: `Hello ${user.firstName || "there"},\n\nWe detected a new login to your SteadyGig account at ${new Date().toLocaleString()}.\n\nIf this was you, no action is needed.\n\nIf you didn't log in, please reset your password immediately and contact our support team.`,
    });

    sendSuccessResponse(res, StatusCodes.OK, "Login successful", {
        user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
        },
        ...tokens,
    });
});

export const forgotPassword = asyncWrapper(
    async (req: Request, res: Response) => {
        const { email } = req.body;
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            return sendErrorResponse(
                res,
                StatusCodes.BAD_REQUEST,
                "Bad Request.",
            );
        }
        const refreshToken = generateTokens({
            userId: user.id,
            email: user.email,
            role: user.role,
        }).refreshToken;
        const emailInstance = new EmailHandler();
        await emailInstance.sendPasswordResetEmail(email, refreshToken);
        sendSuccessResponse(
            res,
            StatusCodes.OK,
            "Password reset email sent successfully.",
        );
    },
);

export const resetPassword = asyncWrapper(
    async (req: Request, res: Response) => {
        const { token, newPassword } = req.body;

        const decoded = verifyRefreshToken(token);

        const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
        });

        if (!user) {
            return sendErrorResponse(
                res,
                StatusCodes.BAD_REQUEST,
                "Invalid or expired token.",
            );
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await prisma.user.update({
            where: { id: user.id },
            data: { password: hashedPassword },
        });

        const emailHandler = new EmailHandler();
        await emailHandler.sendEmail({
            to: user.email,
            subject: "Password Reset Successful - SteadyGig",
            html: `
                <!DOCTYPE html>
                <html>
                  <head>
                    <style>
                      body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                      .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
                      .content { padding: 20px; background-color: #f9f9f9; }
                      .success-box { background-color: #e8f5e9; border-left: 4px solid #4CAF50; padding: 12px; margin: 15px 0; }
                      .warning { background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 12px; margin: 15px 0; }
                      .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
                    </style>
                  </head>
                  <body>
                    <div class="container">
                      <div class="header">
                        <h1>Password Reset Successful</h1>
                      </div>
                      <div class="content">
                        <p>Hello ${user.firstName || "there"},</p>
                        <div class="success-box">
                          Your password has been successfully reset at ${new Date().toLocaleString()}.
                        </div>
                        <p>You can now log in to your SteadyGig account using your new password.</p>
                        <div class="warning">
                          <strong>Security Note:</strong> If you didn't make this change, please contact our support team immediately.
                        </div>
                      </div>
                      <div class="footer">
                        <p>&copy; ${new Date().getFullYear()} SteadyGig. All rights reserved.</p>
                      </div>
                    </div>
                  </body>
                </html>
            `,
            text: `Hello ${user.firstName || "there"},\n\nYour password has been successfully reset at ${new Date().toLocaleString()}.\n\nYou can now log in to your SteadyGig account using your new password.\n\nIf you didn't make this change, please contact our support team immediately.`,
        });

        sendSuccessResponse(
            res,
            StatusCodes.OK,
            "Password reset successfully.",
        );
    },
);

export const logout = asyncWrapper(async (req: AuthRequest, res: Response) => {
    const token = req.headers.authorization?.split(" ")[1];

    if (token && req.user) {
        const decodedJwt = jwt.decode(token) as { exp: number } | null;

        if (decodedJwt?.exp) {
            const ttl = decodedJwt.exp - Math.floor(Date.now() / 1000);
            if (ttl > 0) {
                await redisClient.setex(`blacklist:${token}`, ttl, "true");
            }
        }
        await redisClient.del(`refresh:${req.user.userId}`);
    }

    sendSuccessResponse(res, StatusCodes.OK, "Logged out successfully");
});

export const refreshToken = asyncWrapper(
    async (req: Request, res: Response) => {
        const { refreshToken } = req.body;
        const decoded = verifyRefreshToken(refreshToken);
        const storedToken = await redisClient.get(`refresh:${decoded.userId}`);

        if (!storedToken || storedToken !== refreshToken) {
            return sendErrorResponse(
                res,
                StatusCodes.UNAUTHORIZED,
                "Invalid or expired refresh token",
            );
        }

        const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
        });

        if (!user) {
            return sendErrorResponse(
                res,
                StatusCodes.UNAUTHORIZED,
                "User not found",
            );
        }
        const newAccessToken = generateAccessToken({
            userId: user.id,
            email: user.email,
            role: user.role,
        });
        sendSuccessResponse(
            res,
            StatusCodes.OK,
            "Token refreshed successfully",
            { accessToken: newAccessToken },
        );
    },
);
