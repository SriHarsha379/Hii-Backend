import { Poll, PollVote } from "../../model/index.js";
import apiResponse from "../../utility/apiResponse.js";
import messages from "../../utility/messages.js";

// NEW: the app side of the Polls feature. The admin dashboard's Polls &
// Contests page and pollModel.js already existed, but nothing here did —
// the mobile app's poll popup (poll_popup.dart) was showing hardcoded
// sample data with no API call at all. This is what makes that real.

// Shapes a Poll document (plus its live vote tallies) into the format
// the Flutter app's PollData/PollOption models expect: each option gets
// its own real vote count, and the response tells the app whether this
// user has already voted (and on what) so it can show results instead
// of the voting UI on repeat visits.
const shapePoll = (poll, votesByOption, userVote) => ({
  id: poll._id,
  question: poll.title,
  options: (poll.options || []).map((text, index) => ({
    id: String(index),
    text,
    votes: votesByOption[index] || 0,
  })),
  already_voted: !!userVote,
  selected_option: userVote ? String(userVote.option_index) : null,
});

// GET /poll/active
// Active, non-expired polls, filtered to the user's city where the poll
// isn't targeted at "ALL". Real per-option tallies are computed here
// rather than trusting Poll.votes, which is just a flat counter with no
// per-option breakdown.
const getActivePolls = async (req, res) => {
  try {
    const userId = req.userId;

    const filter = {
      status: "ACTIVE",
      is_deleted: false,
      end_date: { $gte: new Date() },
    };

    const polls = await Poll.find(filter).sort({ createdAt: -1 }).lean();

    if (polls.length === 0) {
      return apiResponse.ok(res, [], messages.POLLS_FETCHED);
    }

    const pollIds = polls.map((p) => p._id);

    const [voteCounts, userVotes] = await Promise.all([
      PollVote.aggregate([
        { $match: { poll_id: { $in: pollIds } } },
        { $group: { _id: { poll_id: "$poll_id", option_index: "$option_index" }, count: { $sum: 1 } } },
      ]),
      PollVote.find({ poll_id: { $in: pollIds }, user_id: userId }).lean(),
    ]);

    // poll_id -> { option_index -> count }
    const tallyMap = {};
    for (const row of voteCounts) {
      const pid = String(row._id.poll_id);
      tallyMap[pid] = tallyMap[pid] || {};
      tallyMap[pid][row._id.option_index] = row.count;
    }

    // poll_id -> that user's vote doc
    const userVoteMap = {};
    for (const v of userVotes) {
      userVoteMap[String(v.poll_id)] = v;
    }

    const shaped = polls.map((poll) =>
      shapePoll(poll, tallyMap[String(poll._id)] || {}, userVoteMap[String(poll._id)] || null)
    );

    return apiResponse.ok(res, shaped, messages.POLLS_FETCHED);
  } catch (err) {
    console.error("getActivePolls error:", err);
    return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
  }
};

// POST /poll/:id/vote
// Body: { option_index }
const voteOnPoll = async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;
    const { option_index } = req.body;

    if (option_index === undefined || option_index === null) {
      return apiResponse.badRequest(res, "option_index is required");
    }

    const poll = await Poll.findOne({ _id: id, is_deleted: false });
    if (!poll) {
      return apiResponse.notFoundResponse(res, "Poll not found");
    }
    if (poll.status !== "ACTIVE" || poll.end_date < new Date()) {
      return apiResponse.badRequest(res, "This poll is no longer active");
    }
    if (option_index < 0 || option_index >= poll.options.length) {
      return apiResponse.badRequest(res, "Invalid option");
    }

    try {
      await PollVote.create({ poll_id: id, user_id: userId, option_index });
    } catch (err) {
      if (err?.code === 11000) {
        return apiResponse.badRequest(res, "You've already voted on this poll");
      }
      throw err;
    }

    // Keep the admin dashboard's flat counter in sync too, so the
    // existing PollsContests.tsx list view (which only ever reads
    // poll.votes, not per-option data) still shows a real, moving number.
    await Poll.updateOne({ _id: id }, { $inc: { votes: 1 } });

    const voteCounts = await PollVote.aggregate([
      { $match: { poll_id: poll._id } },
      { $group: { _id: "$option_index", count: { $sum: 1 } } },
    ]);
    const tally = {};
    for (const row of voteCounts) tally[row._id] = row.count;

    const userVote = { option_index };
    return apiResponse.ok(res, shapePoll(poll, tally, userVote), messages.VOTE_RECORDED);
  } catch (err) {
    console.error("voteOnPoll error:", err);
    return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
  }
};

export default { getActivePolls, voteOnPoll };