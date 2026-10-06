import mongoose from "mongoose";

const lmsWorkspaceSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, default: "default" },
    state: { type: mongoose.Schema.Types.Mixed, required: true },
  },
  { timestamps: true },
);

export const LmsWorkspace = mongoose.model("LmsWorkspace", lmsWorkspaceSchema);
