import { Router } from "express";
import {
    createReview,
    getReviewsByMusician,
    getReviewById,
    updateReview,
    deleteReview,
    getMyReviews,
} from "../controllers/review.controller";
import { authenticate, authorize } from "../middlewares/auth";

const router = Router();

router.post("/", authenticate, authorize("CLIENT"), createReview);

router.get("/me", authenticate, authorize("CLIENT"), getMyReviews);

router.get("/musician/:musicianId", getReviewsByMusician);

router.get("/:id", getReviewById);

router.put("/:id", authenticate, authorize("CLIENT"), updateReview);

router.delete("/:id", authenticate, authorize("CLIENT"), deleteReview);

export default router;
