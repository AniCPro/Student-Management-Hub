import mongoose from "mongoose";
import { logger } from "./logger";

let connectionPromise: Promise<void> | undefined;

export function connectMongo(): Promise<void> {
  if (mongoose.connection.readyState === 1) {
    return Promise.resolve();
  }
  if (connectionPromise) {
    return connectionPromise;
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    return Promise.reject(
      new Error("MONGODB_URI must be configured to use student records."),
    );
  }

  connectionPromise = mongoose
    .connect(uri, { serverSelectionTimeoutMS: 5_000 })
    .then(() => {
      logger.info("Connected to MongoDB");
    })
    .catch((error: unknown) => {
      connectionPromise = undefined;
      throw error;
    });

  return connectionPromise;
}
