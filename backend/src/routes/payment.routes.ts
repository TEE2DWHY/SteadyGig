import { Router } from "express";
import {
    initiatePayment,
    verifyPayment,
    getPaymentHistory,
    getPaymentById,
    processBookingPayment,
    processSubscriptionPayment,
    getAllPayments,
} from "../controllers/payment.controller";
import { authenticate, authorize } from "../middlewares/auth";

const router = Router();

router.post("/initiate", authenticate, initiatePayment);

router.get("/verify/:transactionRef", verifyPayment);

router.get("/history", authenticate, getPaymentHistory);

router.get("/:id", authenticate, getPaymentById);

router.post("/booking", authenticate, authorize("CLIENT"), processBookingPayment);

router.post(
    "/subscription",
    authenticate,
    authorize("MUSICIAN"),
    processSubscriptionPayment,
);

router.get("/all/admin", authenticate, authorize("ADMIN"), getAllPayments);

export default router;
