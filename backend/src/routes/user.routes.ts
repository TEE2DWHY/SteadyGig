import { Router } from "express";
import { body } from "express-validator";
import { validate } from "../middlewares/validate";
import { authenticate } from "../middlewares/auth";
import {
    getAllUsers,
    getUserById,
    getCurrentUser,
    updateUser,
    deleteUser,
    uploadProfileImage,
} from "../controllers/user.controller";
import { uploadProfileImage as uploadProfileImageMiddleware } from "../middlewares/upload";

const router = Router();

/**
 * @swagger
 * /users:
 *   get:
 *     tags: [Users]
 *     summary: Get all users
 *     description: Retrieve a list of all users
 *     responses:
 *       200:
 *         description: List of users retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 */
router.get("/", getAllUsers);

/**
 * @swagger
 * /users/{id}:
 *   get:
 *     tags: [Users]
 *     summary: Get user by ID
 *     description: Retrieve a specific user by their ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: User retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/:id", getUserById);

router.use(authenticate);

/**
 * @swagger
 * /users/me/profile:
 *   get:
 *     tags: [Users]
 *     summary: Get current user profile
 *     description: Retrieve the authenticated user's profile
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile retrieved successfully
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
router.get("/me/profile", getCurrentUser);

router.put(
    "/me/profile",
    [
        body("firstName")
            .optional()
            .notEmpty()
            .withMessage("First name cannot be empty"),
        body("lastName")
            .optional()
            .notEmpty()
            .withMessage("Last name cannot be empty"),
        body("phone")
            .optional()
            .notEmpty()
            .withMessage("Phone cannot be empty"),
    ],
    validate,
    updateUser,
);

router.post(
    "/me/profile/image",
    uploadProfileImageMiddleware,
    uploadProfileImage,
);

router.delete("/me/profile", deleteUser);

export default router;
