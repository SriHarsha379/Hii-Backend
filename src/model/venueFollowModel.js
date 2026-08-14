// models/VenueFollow.js
import mongoose from "mongoose";

const VenueFollowSchema = new mongoose.Schema(
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
    is_active: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

const VenueFollow = mongoose.model("VenueFollow", VenueFollowSchema);
export default VenueFollow;