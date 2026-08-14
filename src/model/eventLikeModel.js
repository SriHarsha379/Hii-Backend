// models/EventLike.js
import mongoose from "mongoose";

const EventLikeSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    event_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true
    },

    is_active: {
      type: Boolean,
      default: true
    },

    is_liked: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

EventLikeSchema.index(
  { user_id: 1, event_id: 1 },
  { unique: true }
);

const EventLike = mongoose.model("EventLike", EventLikeSchema);
export default EventLike;
