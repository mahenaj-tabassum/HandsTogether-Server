import { getCollection } from "../config/db.js";
import { validateEventInput } from "../utils/validateEvent.js";
import { EVENT_TYPES } from "../utils/eventTypes.js";
import { escapeRegex } from "../utils/escapeRegex.js";
import { ObjectId } from "mongodb";

const OBJECT_ID_PATTERN = /^[a-f\d]{24}$/i;

// GET /api/events?limit=6&type=Donation&q=winter
// All three are optional. Returns only upcoming events, soonest first.
export const GetUpcomingEventsController = async (req, res) => {
  const requested = Number.parseInt(req.query.limit, 10);
  const limit =
    Number.isInteger(requested) && requested > 0 ? Math.min(requested, 50) : 0;

  const startOfToday = new Date();
  startOfToday.setUTCHours(0, 0, 0, 0);
  const filter = { eventDate: { $gte: startOfToday } };

  // typeof check: ?type=a&type=b makes req.query.type an array, not a string.
  const type = typeof req.query.type === "string" ? req.query.type.trim() : "";
  if (EVENT_TYPES.includes(type)) filter.eventType = type; // unknown types are ignored

  const q =
    typeof req.query.q === "string" ? req.query.q.trim().slice(0, 100) : "";
  if (q) {
    const pattern = new RegExp(escapeRegex(q), "i"); // "i" = ignore upper/lower case
    filter.$or = [{ title: pattern }, { location: pattern }];
  }

  const events = await getCollection("events")
    .find(filter)
    .project({ createdBy: 0 })
    .sort({ eventDate: 1 })
    .limit(limit)
    .toArray();
  res.json({ success: true, count: events.length, events });
};

// POST /api/events  (login required)
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
    joinedCount: 0, // nobody has joined yet
    createdBy: req.user.email,
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

// GET /api/events/:id
export const GetEventByIdController = async (req, res) => {
  const { id } = req.params;

  // 24 hex characters is the real shape of a MongoDB _id.
  // We avoid ObjectId.isValid() because it also accepts any 12-character string.
  if (!OBJECT_ID_PATTERN.test(id)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid event id." });
  }

  const event = await getCollection("events").findOne(
    { _id: new ObjectId(id) },
    { projection: { createdBy: 0 } }, // never expose the creator's email
  );
  if (!event) {
    return res
      .status(404)
      .json({ success: false, message: "Event not found." });
  }
  res.json({ success: true, event });
};

// POST /api/events/:id/join  (login required)
export const JoinEventController = async (req, res) => {
  const { id } = req.params;
  if (!OBJECT_ID_PATTERN.test(id)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid event id." });
  }
  const eventId = new ObjectId(id);
  const events = getCollection("events");
  const joins = getCollection("joins");

  const event = await events.findOne(
    { _id: eventId },
    { projection: { eventDate: 1 } },
  );
  if (!event) {
    return res
      .status(404)
      .json({ success: false, message: "Event not found." });
  }

  const startOfToday = new Date();
  startOfToday.setUTCHours(0, 0, 0, 0);
  if (event.eventDate < startOfToday) {
    return res
      .status(400)
      .json({ success: false, message: "This event has already ended." });
  }

  // 1) Record the join. The unique index rejects a second join by the same user.
  try {
    await joins.insertOne({
      eventId,
      userEmail: req.user.email,
      joinedAt: new Date(),
    });
  } catch (error) {
    if (error.code === 11000) {
      return res
        .status(409)
        .json({ success: false, message: "You already joined this event." });
    }
    throw error;
  }

  // 2) Take a seat. The filter only matches while joinedCount < capacity, so two people
  //    racing for the last seat cannot both win: MongoDB applies the updates one at a time.
  let updated;
  try {
    updated = await events.findOneAndUpdate(
      { _id: eventId, $expr: { $lt: ["$joinedCount", "$capacity"] } },
      { $inc: { joinedCount: 1 } },
      { returnDocument: "after", projection: { joinedCount: 1, capacity: 1 } },
    );
  } catch (error) {
    // Undo step 1, then report the failure.
    await joins.deleteOne({ eventId, userEmail: req.user.email });
    throw error;
  }

  // 3) No seat left: undo step 1.
  if (!updated) {
    await joins.deleteOne({ eventId, userEmail: req.user.email });
    return res
      .status(409)
      .json({ success: false, message: "This event is full." });
  }

  res.status(201).json({
    success: true,
    joined: true,
    joinedCount: updated.joinedCount,
    capacity: updated.capacity,
  });
};

// GET /api/events/:id/join  ->  { joined: true | false }  (so the button can say "Joined")
export const GetJoinStatusController = async (req, res) => {
  const { id } = req.params;
  if (!OBJECT_ID_PATTERN.test(id)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid event id." });
  }
  const count = await getCollection("joins").countDocuments(
    { eventId: new ObjectId(id), userEmail: req.user.email },
    { limit: 1 },
  );
  res.json({ success: true, joined: count > 0 });
};

// GET /api/events/joined  ->  every event the logged-in user joined (past and upcoming)
export const GetJoinedEventsController = async (req, res) => {
  const joins = await getCollection("joins")
    .find({ userEmail: req.user.email })
    .toArray();

  if (joins.length === 0) {
    return res.json({ success: true, count: 0, events: [] });
  }

  const joinedAtById = new Map(
    joins.map((j) => [j.eventId.toString(), j.joinedAt]),
  );

  const events = await getCollection("events")
    .find({ _id: { $in: joins.map((j) => j.eventId) } })
    .project({ createdBy: 0 })
    .sort({ eventDate: 1 })
    .toArray();

  res.json({
    success: true,
    count: events.length,
    events: events.map((e) => ({
      ...e,
      joinedAt: joinedAtById.get(e._id.toString()),
    })),
  });
};

// GET /api/events/mine  (login required)  ->  events created by the logged-in user
export const GetMyEventsController = async (req, res) => {
  const events = await getCollection("events")
    .find({ createdBy: req.user.email })
    .project({ createdBy: 0 })
    .sort({ eventDate: 1 })
    .toArray();

  res.json({ success: true, count: events.length, events });
};

// PATCH /api/events/:id  (login required, owner only)
export const UpdateEventController = async (req, res) => {
  const { id } = req.params;
  if (!OBJECT_ID_PATTERN.test(id)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid event id." });
  }
  const eventId = new ObjectId(id);
  const events = getCollection("events");

  const existing = await events.findOne(
    { _id: eventId },
    { projection: { createdBy: 1, eventDate: 1 } },
  );
  if (!existing) {
    return res
      .status(404)
      .json({ success: false, message: "Event not found." });
  }
  if (existing.createdBy !== req.user.email) {
    return res.status(403).json({
      success: false,
      message: "You can only edit events you created.",
    });
  }

  // The old date comes from the database, never from the request.
  const { errors, values } = validateEventInput(req.body, existing.eventDate);
  if (errors) {
    return res.status(400).json({
      success: false,
      message: "Please fix the highlighted fields.",
      errors,
    });
  }

  const updated = await events.findOneAndUpdate(
    {
      _id: eventId,
      createdBy: req.user.email,
      joinedCount: { $lte: values.capacity },
    },
    { $set: { ...values, updatedAt: new Date() } },
    { returnDocument: "after", projection: { createdBy: 0 } },
  );

  if (!updated) {
    const latest = await events.findOne(
      { _id: eventId },
      { projection: { joinedCount: 1 } },
    );
    return res.status(400).json({
      success: false,
      message: "Please fix the highlighted fields.",
      errors: {
        capacity: `${latest?.joinedCount ?? 0} people already joined, so capacity cannot be lower.`,
      },
    });
  }

  res.json({ success: true, event: updated });
};
// DELETE /api/events/:id  (login required, owner only)
export const DeleteEventController = async (req, res) => {
  const { id } = req.params;
  if (!OBJECT_ID_PATTERN.test(id)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid event id." });
  }
  const eventId = new ObjectId(id);
  const events = getCollection("events");

  const existing = await events.findOne(
    { _id: eventId },
    { projection: { createdBy: 1 } },
  );
  if (!existing) {
    return res
      .status(404)
      .json({ success: false, message: "Event not found." });
  }
  if (existing.createdBy !== req.user.email) {
    return res.status(403).json({
      success: false,
      message: "You can only delete events you created.",
    });
  }

  await events.deleteOne({ _id: eventId, createdBy: req.user.email });
  // Remove the join records too, so no orphan rows are left behind.
  await getCollection("joins").deleteMany({ eventId });

  res.json({ success: true });
};
