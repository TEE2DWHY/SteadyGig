import { Router } from "express";
import {
    getDashboardStats,
    getAllUsers,
    toggleUserStatus,
    verifyMusician,
    getUnverifiedMusicians,
    deleteUser,
    getBookingDisputes,
    getRevenueReport,
} from "../controllers/admin.controller";
import { authenticate, authorize } from "../middlewares/auth";

const router = Router();

router.use(authenticate);
router.use(authorize("ADMIN"));

router.get("/dashboard", getDashboardStats);

router.get("/users", getAllUsers);

router.patch("/users/:userId/status", toggleUserStatus);

router.patch("/musicians/:userId/verify", verifyMusician);

router.get("/musicians/unverified", getUnverifiedMusicians);

router.delete("/users/:userId", deleteUser);

router.get("/bookings/disputes", getBookingDisputes);

router.get("/revenue", getRevenueReport);

export default router;
