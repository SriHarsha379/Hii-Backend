import { Contest, ContestParticipant } from "../../model/index.js";
import apiResponse from "../../utility/apiResponse.js";
import messages from "../../utility/messages.js";

// NEW: the app side of the Contests feature. Mirrors pollController.js
// (controller/app/) — the admin side and the entry-tracking model
// (contestParticipantModel.js) already existed, but nothing let a real
// user actually see or enter a contest. There was also no app UI for
// this at all (unlike Polls, which already had a built popup screen) —
// contest_popup.dart is new too, built to match that same pattern.

const shapeContest = (contest, alreadyEntered) => ({
  id: contest._id,
  title: contest.title,
  rules: contest.rules,
  reward: contest.reward,
  deadline: contest.deadline,
  participants: contest.participants,
  already_entered: !!alreadyEntered,
});

// GET /contest/active
const getActiveContests = async (req, res) => {
  try {
    const userId = req.userId;

    const contests = await Contest.find({
      status: "ACTIVE",
      is_deleted: false,
      deadline: { $gte: new Date() },
    })
      .sort({ createdAt: -1 })
      .lean();

    if (contests.length === 0) {
      return apiResponse.ok(res, [], messages.CONTESTS_FETCHED);
    }

    const contestIds = contests.map((c) => c._id);
    const entries = await ContestParticipant.find({
      contest_id: { $in: contestIds },
      user_id: userId,
    }).lean();

    const enteredSet = new Set(entries.map((e) => String(e.contest_id)));

    const shaped = contests.map((c) => shapeContest(c, enteredSet.has(String(c._id))));

    return apiResponse.ok(res, shaped, messages.CONTESTS_FETCHED);
  } catch (err) {
    console.error("getActiveContests error:", err);
    return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
  }
};

// POST /contest/:id/enter
// Body: { note? } — kept deliberately simple (register interest / join),
// stored in the existing flexible `entry_details` field. There's no
// spec anywhere for a richer submission flow (photo upload, multi-step
// form, etc.), so this doesn't invent one.
const enterContest = async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;
    const { note } = req.body || {};

    const contest = await Contest.findOne({ _id: id, is_deleted: false });
    if (!contest) {
      return apiResponse.notFoundResponse(res, "Contest not found");
    }
    if (contest.status !== "ACTIVE" || contest.deadline < new Date()) {
      return apiResponse.badRequest(res, "This contest is no longer accepting entries");
    }

    try {
      await ContestParticipant.create({
        contest_id: id,
        user_id: userId,
        entry_details: note ? { note } : {},
      });
    } catch (err) {
      if (err?.code === 11000) {
        return apiResponse.badRequest(res, "You've already entered this contest");
      }
      throw err;
    }

    const updated = await Contest.findOneAndUpdate(
      { _id: id },
      { $inc: { participants: 1 } },
      { new: true }
    );

    return apiResponse.ok(res, shapeContest(updated, true), messages.CONTEST_ENTERED);
  } catch (err) {
    console.error("enterContest error:", err);
    return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
  }
};

export default { getActiveContests, enterContest };