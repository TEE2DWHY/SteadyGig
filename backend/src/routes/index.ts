import { Router } from "express";
import authRoutes from "./auth.routes";
import userRoutes from "./user.routes";
import musicianRoutes from "./musician.routes";
import bookingRoutes from "./booking.routes";
import portfolioRoutes from "./portfolio.routes";
import subscriptionRoutes from "./subscription.routes";
import paymentRoutes from "./payment.routes";
import reviewRoutes from "./review.routes";
import notificationRoutes from "./notification.routes";
import instrumentRoutes from "./instrument.routes";
import genreRoutes from "./genre.routes";
import adminRoutes from "./admin.routes";

const router = Router();

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/musicians", musicianRoutes);
router.use("/bookings", bookingRoutes);
router.use("/portfolio", portfolioRoutes);
router.use("/subscriptions", subscriptionRoutes);
router.use("/payments", paymentRoutes);
router.use("/reviews", reviewRoutes);
router.use("/notifications", notificationRoutes);
router.use("/instruments", instrumentRoutes);
router.use("/genres", genreRoutes);
router.use("/admin", adminRoutes);

export default router;
