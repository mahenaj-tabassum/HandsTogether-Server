import { MongoClient } from "mongodb";
import "dotenv/config";

let client;
let db;

export const connectDB = async () => {
  const mongodbUrl = process.env.MONGODB_DATABASE_URL;

  if (!mongodbUrl) {
    throw new Error("MONGODB_DATABASE_URL is missing in .env");
  }

  client = new MongoClient(mongodbUrl);

  try {
    await client.connect();

    db = client.db(process.env.DB_NAME || "HandsTogether");

    // Create an index for event date queries
    await db.collection("events").createIndex({ eventDate: 1 });

    await db
      .collection("joins")
      .createIndex({ eventId: 1, userEmail: 1 }, { unique: true });
    console.log("MongoDB connected successfully");
  } catch (error) {
    await client.close();

    // Cleanup
    client = null;
    db = null;
    throw error;
  }
};

export const getCollection = (name) => {
  if (!db) {
    throw new Error("Database is not connected yet");
  }

  return db.collection(name);
};
