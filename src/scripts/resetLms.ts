import dotenv from "dotenv";
dotenv.config();
dotenv.config({ path: `.env.${process.env.NODE_ENV || "development"}` });

import mongoose from "mongoose";
import { LmsWorkspace } from "../models/lmsWorkspace";
import { createEmptyLmsState } from "../lms/seed";

async function main() {
  await mongoose.connect(process.env.MONGO_URI!);
  await LmsWorkspace.findOneAndUpdate(
    { key: "default" },
    { state: createEmptyLmsState() },
    { upsert: true },
  );
  console.log("LMS workspace reset to empty starter templates");
  await mongoose.disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
