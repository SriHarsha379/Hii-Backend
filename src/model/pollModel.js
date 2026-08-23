import mongoose from "mongoose";

// NEW: PollsContests.tsx has been fully built against /polls,
// /contests, /contests/:id/status, /polls/:id/status, and
// /contests/:id/participants this whole time, but none of it existed on
// the backend — every interaction on that page was hitting a 404.

const PollSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    // Plain string rather than a strict City ref — the frontend uses the
    // literal sentinel "ALL" to mean "all cities", which isn't a valid
    // ObjectId, so this stays an opaque string rather than a populated
    // reference.
    city: {
      type: String,
      default: "ALL",
    },

    options: {
      type: [String],
      default: [],
    },

    end_date: {
      type: Date,
      required: true,
    },

    votes: {
      type: Number,
      default: 0,
    },

    status: {
      type: String,
      enum: ["ACTIVE", "PENDING"],
      default: "PENDING",
    },

    is_deleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const Poll = mongoose.model("Poll", PollSchema);

export default Poll;