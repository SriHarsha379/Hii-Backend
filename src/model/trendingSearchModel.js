import mongoose from "mongoose";

const TrendingSearchSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    keyword: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },

    type: {
      type: String,
      enum: ["event", "venue", "member"],  // ✅ FIX: added member support
      required: true
    }
  },
  { timestamps: true }
);


export default mongoose.model("TrendingSearch", TrendingSearchSchema);
