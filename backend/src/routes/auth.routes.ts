import { Router } from "express";
import { body } from "express-validator";
import { validate } from "../middlewares/validate";
import {
    register,
    login,
    forgotPassword,
    resetPassword,
    logout,
    refreshToken,
} from "../controllers/auth.controller";
import { authenticate } from "../middlewares/auth";

const router = Router();

/**
 * @swagger
 * /auth/register:
 *   post:
 *     tags: [Authentication]
 *     summary: Register a new user
 *     description: Create a new user account (Client or Musician)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterRequest'
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Email already registered or validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
    "/register",
    [
        body("email").isEmail().withMessage("Valid email is required"),
        body("password")
            .isLength({ min: 6 })
            .withMessage("Password must be at least 6 characters"),
        body("firstName").notEmpty().withMessage("First name is required"),
        body("lastName").notEmpty().withMessage("Last name is required"),
        body("phone").notEmpty().withMessage("Phone is required"),
        body("role").isIn(["CLIENT", "MUSICIAN"]).withMessage("Invalid role"),
    ],
    validate,
    register,
);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     tags: [Authentication]
 *     summary: Login user
 *     description: Authenticate user and receive JWT tokens
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       429:
 *         description: Too many login attempts
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
    "/login",
    [
        body("email").isEmail().withMessage("Valid email is required"),
        body("password").notEmpty().withMessage("Password is required"),
    ],
    validate,
    login,
);

/**
 * @swagger
 * /auth/forgot-password:
 *   post:
 *     tags: [Authentication]
 *     summary: Request password reset
 *     description: Send password reset email to user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ForgotPasswordRequest'
 *     responses:
 *       200:
 *         description: Password reset email sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
    "/forgot-password",
    [body("email").isEmail().withMessage("Valid email is required")],
    validate,
    forgotPassword,
);

/**
 * @swagger
 * /auth/reset-password:
 *   post:
 *     tags: [Authentication]
 *     summary: Reset password
 *     description: Reset user password using reset token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ResetPasswordRequest'
 *     responses:
 *       200:
 *         description: Password reset successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Invalid or expired token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
    "/reset-password",
    [
        body("token").notEmpty().withMessage("Token is required"),
        body("newPassword")
            .isLength({ min: 6 })
            .withMessage("Password must be at least 6 characters"),
    ],
    validate,
    resetPassword,
);

/**
 * @swagger
 * /auth/refresh-token:
 *   post:
 *     tags: [Authentication]
 *     summary: Refresh access token
 *     description: Get a new access token using refresh token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RefreshTokenRequest'
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RefreshTokenResponse'
 *       401:
 *         description: Invalid or expired refresh token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
    "/refresh-token",
    [body("refreshToken").notEmpty().withMessage("Refresh token is required")],
    validate,
    refreshToken,
);

router.use(authenticate);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     tags: [Authentication]
 *     summary: Logout user
 *     description: Logout user and invalidate tokens
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logged out successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post("/logout", logout);

export default router;
