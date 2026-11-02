import { Router } from "express";
import { CreateEventController, GetEventByIdController, GetUpcomingEventsController } from "../controllers/events.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();
router.get("/", GetUpcomingEventsController);
router.get("/:id", GetEventByIdController)
router.post("/", verifyJWT, CreateEventController)

export default router;
