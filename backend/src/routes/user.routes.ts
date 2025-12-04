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
} from "../controllers/user.controller";

const router = Router();

router.get("/", getAllUsers);

router.get("/:id", getUserById);

router.use(authenticate);

router.get("/me/profile", getCurrentUser);

router.put(
    "/me/profile",
    [
        body("firstName").optional().notEmpty().withMessage("First name cannot be empty"),
        body("lastName").optional().notEmpty().withMessage("Last name cannot be empty"),
        body("phone").optional().notEmpty().withMessage("Phone cannot be empty"),
    ],
    validate,
    updateUser,
);

router.delete("/me/profile", deleteUser);

export default router;
