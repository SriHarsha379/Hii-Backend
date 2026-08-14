// models/SwipeProfile.js
import mongoose from "mongoose";

const SwipeProfileSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true
    },
    show_age: {
      type: Boolean,
      default: true
    },
    show_height: {
      type: Boolean,
      default: true
    },
    show_pronouns: {
      type: Boolean,
      default: false
    },
    show_hobbies: {
      type: Boolean,
      default: true
    },
    show_location: {
      type: Boolean,
      default: false
    },
    show_vibes: {
      type: Boolean,
      default: true
    },
    show_interests: {
      type: Boolean,
      default: true
    },
    show_music_taste: {
      type: Boolean,
      default: false
    },
    custom_visibility_settings: {
      type: Map,
      of: Boolean,
      default: {}
    }
  },
  { timestamps: true }
);

const SwipeProfile = mongoose.model("SwipeProfile", SwipeProfileSchema);
export default SwipeProfile;