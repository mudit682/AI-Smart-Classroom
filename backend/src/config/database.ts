import mongoose from "mongoose";
import { env } from "./env.js";

export async function connectDatabase() {
  if (env.NODE_ENV === "test") {
    return;
  }

  await mongoose.connect(env.MONGODB_URI);
  console.log("MongoDB connection established");
}

