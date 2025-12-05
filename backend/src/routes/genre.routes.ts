import { Router } from "express";
import {
    createGenre,
    getGenres,
    getGenreById,
    updateGenre,
    deleteGenre,
} from "../controllers/genre.controller";
import { authenticate, authorize } from "../middlewares/auth";

const router = Router();

router.get("/", getGenres);

router.get("/:id", getGenreById);

router.post("/", authenticate, authorize("ADMIN"), createGenre);

router.put("/:id", authenticate, authorize("ADMIN"), updateGenre);

router.delete("/:id", authenticate, authorize("ADMIN"), deleteGenre);

export default router;
