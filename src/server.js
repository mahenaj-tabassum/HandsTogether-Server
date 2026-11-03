import "dotenv/config";
import express from "express";
import cors from "cors";
import { connectDB } from "./config/db.js";
import eventsRoutes from "./routes/events.routes.js";
import { notFound, errorHandler } from "./middlewares/error.middleware.js";

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Root route
app.get("/", (req, res) => {
  res.json({ message: "HandsTogether API is running" });
});

// API routes
app.use("/api/events", eventsRoutes);

// Order matters: these two must stay last.
app.use(notFound);
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 5000;

await connectDB();

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
