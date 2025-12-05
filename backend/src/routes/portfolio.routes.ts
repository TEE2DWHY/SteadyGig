import { Router } from "express";
import {
    uploadPortfolioItem,
    getPortfolioItems,
    getMyPortfolioItems,
    getPortfolioItemById,
    updatePortfolioItem,
    deletePortfolioItem,
} from "../controllers/portfolio.controller";
import { authenticate, authorize } from "../middlewares/auth";
import { uploadSingle } from "../middlewares/upload";

const router = Router();

router.post(
    "/",
    authenticate,
    authorize("MUSICIAN"),
    uploadSingle,
    uploadPortfolioItem,
);

router.get("/me", authenticate, authorize("MUSICIAN"), getMyPortfolioItems);

router.get("/musician/:musicianProfileId", getPortfolioItems);

router.get("/:id", getPortfolioItemById);

router.put(
    "/:id",
    authenticate,
    authorize("MUSICIAN"),
    updatePortfolioItem,
);

router.delete(
    "/:id",
    authenticate,
    authorize("MUSICIAN"),
    deletePortfolioItem,
);

export default router;
