import { Router } from "express";
import {
    getNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    getUnreadCount,
    deleteAllNotifications,
    getNotificationById,
} from "../controllers/notification.controller";
import { authenticate } from "../middlewares/auth";

const router = Router();

router.use(authenticate);

router.get("/", getNotifications);

router.get("/unread-count", getUnreadCount);

router.get("/:id", getNotificationById);

router.patch("/:id/read", markAsRead);

router.patch("/read-all", markAllAsRead);

router.delete("/:id", deleteNotification);

router.delete("/", deleteAllNotifications);

export default router;
