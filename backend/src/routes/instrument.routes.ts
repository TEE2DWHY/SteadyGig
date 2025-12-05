import { Router } from "express";
import {
    createInstrument,
    getInstruments,
    getInstrumentById,
    updateInstrument,
    deleteInstrument,
    getInstrumentCategories,
} from "../controllers/instrument.controller";
import { authenticate, authorize } from "../middlewares/auth";

const router = Router();

router.get("/", getInstruments);

router.get("/categories", getInstrumentCategories);

router.get("/:id", getInstrumentById);

router.post("/", authenticate, authorize("ADMIN"), createInstrument);

router.put("/:id", authenticate, authorize("ADMIN"), updateInstrument);

router.delete("/:id", authenticate, authorize("ADMIN"), deleteInstrument);

export default router;
