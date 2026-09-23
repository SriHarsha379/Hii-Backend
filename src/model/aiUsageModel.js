import mongoose from "mongoose";

// One row per member per day - counts Hii Owl messages for the daily limit.
const AiUsageSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    day: { type: String, required: true }, // YYYY-MM-DD in the app's timezone
    count: { type: Number, default: 0 },
  },
  { timestamps: true }
);
AiUsageSchema.index({ user_id: 1, day: 1 }, { unique: true });

export default mongoose.models.AiUsage || mongoose.model("AiUsage", AiUsageSchema);
