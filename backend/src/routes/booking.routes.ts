import { Router } from "express";
import {
    createBooking,
    getBookings,
    getBookingById,
    acceptBooking,
    rejectBooking,
    cancelBooking,
    completeBooking,
    getClientBookings,
    getMusicianBookings,
    getPendingBookings,
} from "../controllers/booking.controller";
import { authenticate, authorize } from "../middlewares/auth";

const router = Router();

router.post("/", authenticate, authorize("CLIENT"), createBooking);

router.get("/", authenticate, getBookings);

router.get("/client", authenticate, authorize("CLIENT"), getClientBookings);

router.get("/musician", authenticate, authorize("MUSICIAN"), getMusicianBookings);

router.get("/pending", authenticate, authorize("MUSICIAN"), getPendingBookings);

router.get("/:id", authenticate, getBookingById);

router.patch("/:id/accept", authenticate, authorize("MUSICIAN"), acceptBooking);

router.patch("/:id/reject", authenticate, authorize("MUSICIAN"), rejectBooking);

router.patch("/:id/cancel", authenticate, cancelBooking);

router.patch("/:id/complete", authenticate, completeBooking);

export default router;
