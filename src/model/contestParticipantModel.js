import mongoose from "mongoose";

// Backs GET /contests/:id/participants (admin) and the real app-side
// entry flow at POST /contest/:id/enter (contestController.js in
// controller/app/). This used to be a genuinely empty collection since
// nothing wrote to it — that's no longer the case now that users can
// actually enter contests from the app.

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

// NEW: was no constraint at all preventing the same user from entering
// the same contest multiple times. One entry per user per contest, same
// pattern as PollVote's poll_id+user_id index.
ContestParticipantSchema.index({ contest_id: 1, user_id: 1 }, { unique: true });

const ContestParticipant = mongoose.model("ContestParticipant", ContestParticipantSchema);

export default ContestParticipant;