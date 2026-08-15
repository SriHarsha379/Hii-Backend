import { ReportProblem } from "../../model/index.js";
import apiResponse from "../../utility/apiResponse.js";
import messages from "../../utility/messages.js";

// GET /support-requests/get_all
// Powers the "Requests" tab on the admin Support & Requests page. Was
// previously calling `${API_BASE}/requests` on the frontend, which had no
// backend route at all — so the tab always showed nothing, even though
// users had already been submitting "Report a Problem" tickets that were
// just sitting unreviewed in the ReportProblem collection.
const getAllRequests = async (req, res) => {
  try {
    const { search = "", status, page = 1, limit = 100 } = req.query;

    const filter = {};
    if (status) filter.status = status;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(500, parseInt(limit, 10) || 100));
    const skip = (pageNum - 1) * limitNum;

    let query = ReportProblem.find(filter)
      .populate("user_id", "name email")
      .sort({ createdAt: -1 });

    const [allMatching, total] = await Promise.all([
      query.clone().skip(skip).limit(limitNum).lean(),
      ReportProblem.countDocuments(filter),
    ]);

    // Search on the populated user's name/email needs to happen after
    // population since Mongo can't filter on populated fields directly.
    const trimmedSearch = search.trim().toLowerCase();
    const requests = trimmedSearch
      ? allMatching.filter(
          (r) =>
            r.user_id?.name?.toLowerCase().includes(trimmedSearch) ||
            r.user_id?.email?.toLowerCase().includes(trimmedSearch) ||
            r.description?.toLowerCase().includes(trimmedSearch)
        )
      : allMatching;

    return apiResponse.ok(res, { requests, total, page: pageNum, limit: limitNum }, messages.SUCCESS);
  } catch (err) {
    console.error(err);
    return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
  }
};

// POST /support-requests/update_status/:id  body: { status, admin_reply? }
const updateRequestStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, admin_reply } = req.body;

    const validStatuses = ["Pending", "Inprogress", "Resolve", "Closed"];
    if (!status || !validStatuses.includes(status)) {
      return apiResponse.badRequest(res, `status must be one of: ${validStatuses.join(", ")}`);
    }

    const update = { status };
    if (admin_reply !== undefined) update.admin_reply = admin_reply;

    const request = await ReportProblem.findByIdAndUpdate(id, update, { new: true }).populate("user_id", "name email");
    if (!request) return apiResponse.notFoundResponse(res, "Request not found");

    return apiResponse.ok(res, request, messages.SUCCESS);
  } catch (err) {
    console.error(err);
    return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
  }
};

export default { getAllRequests, updateRequestStatus };
