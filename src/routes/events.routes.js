import { Router } from "express";
import { CreateEventController, GetUpcomingEventsController } from "../controllers/events.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();
router.get("/", GetUpcomingEventsController);
router.post("/", verifyJWT, CreateEventController)

export default router;
