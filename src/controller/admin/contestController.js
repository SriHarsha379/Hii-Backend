import { Contest, ContestParticipant } from "../../model/index.js";
import apiResponse from "../../utility/apiResponse.js";
import messages from "../../utility/messages.js";

// GET /contests
const getAllContests = async (req, res) => {
  try {
    const contests = await Contest.find({ is_deleted: false }).sort({ createdAt: -1 });
    const mapped = contests.map((c) => ({ ...c.toObject(), id: c._id }));
    return apiResponse.ok(res, mapped, "Contests fetched successfully");
  } catch (err) {
    console.error(err);
    return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
  }
};

// POST /contests
const createContest = async (req, res) => {
  try {
    const { title, city, rules, reward, deadline } = req.body;
    if (!title || !deadline) {
      return apiResponse.badRequest(res, "Title and deadline are required");
    }
    const contest = await Contest.create({
      title: title.trim(),
      city: city || "ALL",
      rules: rules || "",
      reward: reward || "",
      deadline,
    });
    const result = { ...contest.toObject(), id: contest._id };
    return apiResponse.created(res, result, "Contest created successfully");
  } catch (err) {
    console.error(err);
    return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
  }
};

// PATCH /contests/:id/status
const updateContestStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!["ACTIVE", "PENDING"].includes(status)) {
      return apiResponse.badRequest(res, "Status must be ACTIVE or PENDING");
    }
    const contest = await Contest.findOneAndUpdate(
      { _id: id, is_deleted: false },
      { status },
      { new: true, runValidators: false }
    );
    if (!contest) return apiResponse.notFoundResponse(res, "Contest not found");
    const result = { ...contest.toObject(), id: contest._id };
    return apiResponse.ok(res, result, "Contest status updated");
  } catch (err) {
    console.error(err);
    return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
  }
};

// DELETE /contests/:id
const deleteContest = async (req, res) => {
  try {
    const { id } = req.params;
    const contest = await Contest.findOneAndUpdate(
      { _id: id, is_deleted: false },
      { is_deleted: true },
      { runValidators: false }
    );
    if (!contest) return apiResponse.notFoundResponse(res, "Contest not found");
    return apiResponse.ok(res, null, "Contest removed");
  } catch (err) {
    console.error(err);
    return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
  }
};

// GET /contests/:id/participants
// Genuinely empty right now — there's no app-side contest-entry flow
// built yet, so this honestly reflects that rather than faking data.
const getContestParticipants = async (req, res) => {
  try {
    const { id } = req.params;
    const participants = await ContestParticipant.find({ contest_id: id })
      .populate("user_id", "name email profile_image")
      .sort({ createdAt: -1 });
    return apiResponse.ok(res, participants, "Participants fetched successfully");
  } catch (err) {
    console.error(err);
    return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
  }
};

export default { getAllContests, createContest, updateContestStatus, deleteContest, getContestParticipants };