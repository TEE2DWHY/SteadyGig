import { Router } from "express";
import {
    createMusicianProfile,
    getMusicianProfile,
    getCurrentMusicianProfile,
    updateMusicianProfile,
    toggleAvailability,
    searchMusicians,
    getMusiciansByLocation,
    getMusicianStats,
} from "../controllers/musician.controller";
import { authenticate, authorize } from "../middlewares/auth";

const router = Router();

router.post(
    "/",
    authenticate,
    authorize("MUSICIAN"),
    createMusicianProfile,
);

router.get("/me", authenticate, authorize("MUSICIAN"), getCurrentMusicianProfile);

router.get("/search", searchMusicians);

router.get("/nearby", getMusiciansByLocation);

router.get("/stats", authenticate, authorize("MUSICIAN"), getMusicianStats);

router.put(
    "/",
    authenticate,
    authorize("MUSICIAN"),
    updateMusicianProfile,
);

router.patch(
    "/availability",
    authenticate,
    authorize("MUSICIAN"),
    toggleAvailability,
);

router.get("/:id", getMusicianProfile);

export default router;
