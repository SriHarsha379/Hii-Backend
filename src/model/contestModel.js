import mongoose from "mongoose";

// NEW: see pollModel.js for the full context — same situation, this
// entity didn't exist at all before.

const ContestSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    city: {
      type: String,
      default: "ALL",
    },

    rules: {
      type: String,
      default: "",
    },

    reward: {
      type: String,
      default: "",
    },

    deadline: {
      type: Date,
      required: true,
    },

    // Real count, kept in sync as entries come in — there's no app-side
    // contest-entry flow built yet, so this genuinely starts at 0 and
    // stays there until that exists, rather than showing a fake number.
    participants: {
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

const Contest = mongoose.model("Contest", ContestSchema);

export default Contest;