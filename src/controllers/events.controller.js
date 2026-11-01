// GET /api/events?limit=6
// Returns only upcoming events, soonest first.
// Main URL: http://localhost:5000/api/events/upcoming

import { getCollection } from "../config/db.js";

// http://localhost:5000/api/events/upcoming?limit=6
export const GetUpcomingEventsController = async (req, res) => {
  const requested = Number.parseInt(req.query.limit, 10);
  const limit =
    Number.isInteger(requested) && requested > 0 ? Math.min(requested, 50) : 0;

  const startOfToday = new Date();
  startOfToday.setUTCHours(0, 0, 0, 0);
  const events = await getCollection("events")
    .find({ eventDate: { $gte: startOfToday } })
    .project({ createdBy: 0 }) // hide private/internal fields from the public list
    .sort({ eventDate: 1 })
    .limit(limit)
    .toArray();
  res.json({ success: true, count: events.length, events: events });
};

export const CreateEventController = async (req, res) => {
  const { errors, values } = validateEventInput(req.body);

  if (errors) {
    return res.status(400).json({
      success: false,
      message: "Please fix the highlighted fields.",
      errors,
    });
  }

  const doc = {
    ...values,
    createdBy: req.user.email, // from the verified token, never from the request body
    createdAt: new Date(),
  };

  const result = await getCollection("events").insertOne(doc);

  // Do not send the creator's email back in the response.
  const { createdBy, ...event } = doc;
  res.status(201).json({
    success: true,
    event: { _id: result.insertedId, ...event },
  });
};
