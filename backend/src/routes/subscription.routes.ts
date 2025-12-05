import { Router } from "express";
import {
    createSubscription,
    getSubscription,
    renewSubscription,
    cancelSubscription,
    checkSubscriptionStatus,
    getAllSubscriptions,
} from "../controllers/subscription.controller";
import { authenticate, authorize } from "../middlewares/auth";

const router = Router();

router.post(
    "/",
    authenticate,
    authorize("MUSICIAN"),
    createSubscription,
);

router.get("/me", authenticate, authorize("MUSICIAN"), getSubscription);

router.post(
    "/renew",
    authenticate,
    authorize("MUSICIAN"),
    renewSubscription,
);

router.patch(
    "/cancel",
    authenticate,
    authorize("MUSICIAN"),
    cancelSubscription,
);

router.get(
    "/status",
    authenticate,
    authorize("MUSICIAN"),
    checkSubscriptionStatus,
);

router.get("/all", authenticate, authorize("ADMIN"), getAllSubscriptions);

export default router;
