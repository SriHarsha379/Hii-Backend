import { Poll } from "../../model/index.js";
import apiResponse from "../../utility/apiResponse.js";
import messages from "../../utility/messages.js";

// GET /polls
const getAllPolls = async (req, res) => {
  try {
    const polls = await Poll.find({ is_deleted: false }).sort({ createdAt: -1 });
    // The frontend reads `poll.id`, not `poll._id` — remapped here rather
    // than changing every reference across the page.
    const mapped = polls.map((p) => ({ ...p.toObject(), id: p._id }));
    return apiResponse.ok(res, mapped, "Polls fetched successfully");
  } catch (err) {
    console.error(err);
    return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
  }
};

// POST /polls
const createPoll = async (req, res) => {
  try {
    const { title, city, end_date, options } = req.body;
    if (!title || !end_date) {
      return apiResponse.badRequest(res, "Title and end date are required");
    }
    const cleanOptions = Array.isArray(options) ? options.filter((o) => o && o.trim()) : [];
    if (cleanOptions.length < 2) {
      return apiResponse.badRequest(res, "At least 2 options are required");
    }
    const poll = await Poll.create({
      title: title.trim(),
      city: city || "ALL",
      end_date,
      options: cleanOptions,
    });
    const result = { ...poll.toObject(), id: poll._id };
    return apiResponse.created(res, result, "Poll created successfully");
  } catch (err) {
    console.error(err);
    return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
  }
};

// PATCH /polls/:id/status
const updatePollStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!["ACTIVE", "PENDING"].includes(status)) {
      return apiResponse.badRequest(res, "Status must be ACTIVE or PENDING");
    }
    const poll = await Poll.findOneAndUpdate(
      { _id: id, is_deleted: false },
      { status },
      { new: true, runValidators: false }
    );
    if (!poll) return apiResponse.notFoundResponse(res, "Poll not found");
    const result = { ...poll.toObject(), id: poll._id };
    return apiResponse.ok(res, result, "Poll status updated");
  } catch (err) {
    console.error(err);
    return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
  }
};

// DELETE /polls/:id
const deletePoll = async (req, res) => {
  try {
    const { id } = req.params;
    const poll = await Poll.findOneAndUpdate(
      { _id: id, is_deleted: false },
      { is_deleted: true },
      { runValidators: false }
    );
    if (!poll) return apiResponse.notFoundResponse(res, "Poll not found");
    return apiResponse.ok(res, null, "Poll removed");
  } catch (err) {
    console.error(err);
    return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
  }
};

export default { getAllPolls, createPoll, updatePollStatus, deletePoll };