import mongoose from "mongoose";

// NEW: backs the real app-side poll voting flow (GET /poll/active,
// POST /poll/:id/vote). pollModel.js only ever had a single flat
// `votes` counter with no way to know how many votes each individual
// option got, and no way to stop the same user voting twice — this
// collection is what actually makes per-option tallies and one-vote-
// per-user possible, the same way contestParticipantModel.js exists
// for tracking contest entries.

const PollVoteSchema = new mongoose.Schema(
  {
    poll_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Poll",
      required: true,
    },

    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Index into the Poll's `options` array at the time of voting.
    option_index: {
      type: Number,
      required: true,
    },
  },
  { timestamps: true }
);

// One vote per user per poll — also what lets a duplicate vote attempt
// fail fast with a clean E11000 instead of needing a separate existence
// check + race condition window.
PollVoteSchema.index({ poll_id: 1, user_id: 1 }, { unique: true });

const PollVote = mongoose.model("PollVote", PollVoteSchema);

export default PollVote;