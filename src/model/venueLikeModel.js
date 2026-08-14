// models/VenueLike.js
import mongoose from "mongoose";

const VenueLikeSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    venue_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Venue",
      required: true
    },
    is_liked: {
      type: Boolean,
      default: true
    },
    is_active: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

VenueLikeSchema.index(
  { user_id: 1, venue_id: 1 },
  { unique: true }
);

const VenueLike = mongoose.model("VenueLike", VenueLikeSchema);
export default VenueLike;
