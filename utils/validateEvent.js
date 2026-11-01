import { EVENT_TYPES } from "./eventTypes.js";

const text = (value) => (typeof value === "string" ? value.trim() : "");

const isHttpUrl = (value) => {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

// Returns { errors } when something is wrong, or { values } ready to save.
export const validateEventInput = (body = {}) => {
  const errors = {};
  const title = text(body.title);
  const eventType = text(body.eventType);
  const location = text(body.location);
  const thumbnail = text(body.thumbnail);
  const description = text(body.description);
  const rawDate = text(body.eventDate);

  if (title.length < 3 || title.length > 100) {
    errors.title = "Title must be 3 to 100 characters.";
  }
  if (!EVENT_TYPES.includes(eventType)) {
    errors.eventType = "Choose a valid event type.";
  }
  if (location.length < 2 || location.length > 120) {
    errors.location = "Location must be 2 to 120 characters.";
  }
  if (!isHttpUrl(thumbnail)) {
    errors.thumbnail = "Thumbnail must be a valid http or https link.";
  }
  if (description.length < 20 || description.length > 1000) {
    errors.description = "Description must be 20 to 1000 characters.";
  }

  // The date must look like 2026-12-20, be a real calendar day, and be in the future.
  const eventDate = new Date(`${rawDate}T00:00:00.000Z`);
  const isRealDate =
    /^\d{4}-\d{2}-\d{2}$/.test(rawDate) &&
    !Number.isNaN(eventDate.getTime()) &&
    eventDate.toISOString().slice(0, 10) === rawDate; // rejects 2026-02-31

  const startOfToday = new Date();
  startOfToday.setUTCHours(0, 0, 0, 0);

  if (!isRealDate) {
    errors.eventDate = "Enter a valid date.";
  } else if (eventDate.getTime() <= startOfToday.getTime()) {
    errors.eventDate = "Choose a date in the future.";
  }

  if (Object.keys(errors).length > 0) return { errors };

  return {
    values: { title, eventType, eventDate, location, thumbnail, description },
  };
};
