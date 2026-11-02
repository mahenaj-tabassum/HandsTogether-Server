import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
  GetMyEventsController,
  UpdateEventController,
  DeleteEventController,
  GetUpcomingEventsController,
  GetJoinedEventsController,
  GetEventByIdController,
  CreateEventController,
  GetJoinStatusController,
  JoinEventController,
} from "../controllers/events.controller.js";

const router = Router();

// Public routes
router.get("/", GetUpcomingEventsController);
router.get("/:id/join", verifyJWT, GetJoinStatusController);

// Protected routes
router.get("/joined", verifyJWT, GetJoinedEventsController);
router.get("/mine", verifyJWT, GetMyEventsController);

router.post("/", verifyJWT, CreateEventController);
router.post("/:id/join", verifyJWT, JoinEventController);
router.patch("/:id", verifyJWT, UpdateEventController);
router.delete("/:id", verifyJWT, DeleteEventController);

// Keep this after static GET routes
router.get("/:id", GetEventByIdController);

export default router;
