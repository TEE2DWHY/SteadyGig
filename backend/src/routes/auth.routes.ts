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

router.post(
    "/login",
    [
        body("email").isEmail().withMessage("Valid email is required"),
        body("password").notEmpty().withMessage("Password is required"),
    ],
    validate,
    login,
);

router.post(
    "/forgot-password",
    [body("email").isEmail().withMessage("Valid email is required")],
    validate,
    forgotPassword,
);

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

router.post(
    "/refresh-token",
    [body("refreshToken").notEmpty().withMessage("Refresh token is required")],
    validate,
    refreshToken,
);

router.use(authenticate);

router.post("/logout", logout);

export default router;
