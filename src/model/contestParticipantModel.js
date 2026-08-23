import mongoose from "mongoose";

// NEW: backs GET /contests/:id/participants. There's no app-side contest
// entry flow built yet, so this collection will genuinely be empty for
// now — that's an honest reflection of reality, not a bug. Exists so
// that endpoint returns a real (if currently empty) query result rather
// than a hardcoded fake response.

const ContestParticipantSchema = new mongoose.Schema(
  {
    contest_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Contest",
      required: true,
    },

    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    entry_details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

const ContestParticipant = mongoose.model("ContestParticipant", ContestParticipantSchema);

export default ContestParticipant;