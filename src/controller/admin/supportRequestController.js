import { ReportProblem, User } from "../../model/index.js";
import apiResponse from "../../utility/apiResponse.js";
import messages from "../../utility/messages.js";
import sendNotification from "../../utility/notification.js";
import { isMainAdmin, manageableVendorIds } from "../../utility/adminScope.js";
import { notifyMainAdmins, notifyVendorAdmins } from "../../utility/adminNotify.js";
import { SUPPORT_CATEGORIES, normalizeSupportCategory, supportSourceForAdmin } from "../../utility/supportCategories.js";

/* =====================================================================
   SUPPORT & REQUESTS
   Three kinds of sender, shown in separate sections on the admin page:
     member    - app members (Report a problem / Contact Us)
     club      - club admins      (dashboard > Contact support)
     organiser - event organisers (dashboard > Contact support)
   Only MAIN admins see and handle requests; club / organiser admins see
   only their own (they used to be able to read every member's requests).
   ===================================================================== */

const VALID_STATUSES = ["Pending", "Inprogress", "Resolve", "Closed"];
const SOURCES = ["member", "club", "organiser"];

const senderName = (r) =>
  r.source === "member" || !r.source
    ? r.user_id?.name || "Member"
    : r.admin_id?.organisation || r.vendor_id?.name || r.admin_id?.name || "Club";

// GET /support-requests/get_all?source=member|club|organiser&category=&status=&search=
const getAllRequests = async (req, res) => {
  try {
    if (!isMainAdmin(req)) return apiResponse.forbidden(res, messages.FORBIDDEN);
    const { search = "", status, source, category, page = 1, limit = 100 } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (source === "member") filter.source = { $in: ["member", null] }; // older rows have no source
    else if (SOURCES.includes(source)) filter.source = source;
    if (category) filter.category = category;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(500, parseInt(limit, 10) || 100));
    const skip = (pageNum - 1) * limitNum;

    const query = ReportProblem.find(filter)
      .populate("user_id", "name email")
      .populate("admin_id", "name email organisation")
      .populate("vendor_id", "name")
      .sort({ createdAt: -1 });

    const [rows, total] = await Promise.all([
      query.clone().skip(skip).limit(limitNum).lean(),
      ReportProblem.countDocuments(filter),
    ]);

    const q = String(search).trim().toLowerCase();
    const requests = rows
      .map((r) => ({ ...r, source: r.source || "member", category: r.category || "Other", sender_name: senderName(r) }))
      .filter((r) => !q ||
        r.sender_name?.toLowerCase().includes(q) ||
        r.user_id?.email?.toLowerCase().includes(q) ||
        r.admin_id?.email?.toLowerCase().includes(q) ||
        r.description?.toLowerCase().includes(q));

    return apiResponse.ok(res, { requests, total, page: pageNum, limit: limitNum, categories: SUPPORT_CATEGORIES }, messages.SUCCESS);
  } catch (err) {
    console.error(err);
    return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
  }
};

// POST /support-requests/update_status/:id  body: { status, admin_reply? }
// The sender is notified: members on their phone, clubs in their dashboard.
const updateRequestStatus = async (req, res) => {
  try {
    if (!isMainAdmin(req)) return apiResponse.forbidden(res, messages.FORBIDDEN);
    const { id } = req.params;
    const { status, admin_reply } = req.body;

    if (!status || !VALID_STATUSES.includes(status)) {
      return apiResponse.badRequest(res, `status must be one of: ${VALID_STATUSES.join(", ")}`);
    }
    const update = { status };
    if (admin_reply !== undefined) update.admin_reply = admin_reply;

    const request = await ReportProblem.findByIdAndUpdate(id, update, { new: true })
      .populate("user_id", "name email player_id");
    if (!request) return apiResponse.notFoundResponse(res, "Request not found");

    const reply = String(admin_reply || "").trim();
    const statusText = { Pending: "pending", Inprogress: "in progress", Resolve: "resolved", Closed: "closed" }[status];
    const text = reply || `Your "${request.category || "support"}" request is now ${statusText}.`;
    if ((request.source || "member") === "member" && request.user_id) {
      sendNotification("support_reply", request.user_id.player_id, {
        senderId: req.user?._id,
        other_user_id: request.user_id._id,
        action: "support_reply",
        request_id: request._id,
        message: text,
      }, 0).catch(() => {});
    } else if (request.vendor_id) {
      notifyVendorAdmins(request.vendor_id, {
        title: "Reply from Hii support",
        message: text.slice(0, 160),
        action: "support_reply",
        action_json: { request_id: request._id },
      });
    }

    const out = request.toObject();
    if (out.user_id) delete out.user_id.player_id;
    return apiResponse.ok(res, out, messages.SUCCESS);
  } catch (err) {
    console.error(err);
    return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
  }
};

// GET /support-requests/categories - the lists this login can use
const getCategories = async (req, res) => {
  const source = supportSourceForAdmin(req.user);
  return apiResponse.ok(res, source ? { [source]: SUPPORT_CATEGORIES[source] } : SUPPORT_CATEGORIES, messages.SUCCESS);
};

// POST /support-requests/my_request  body: { category, description }  (club / organiser admins)
const createMyRequest = async (req, res) => {
  try {
    const source = supportSourceForAdmin(req.user);
    if (!source) return apiResponse.forbidden(res, messages.FORBIDDEN);
    const description = String(req.body?.description || "").trim();
    if (!description) return apiResponse.badRequest(res, "Please describe your request.");
    const vendorIds = (await manageableVendorIds(req)) || [];

    const request = await ReportProblem.create({
      source,
      category: normalizeSupportCategory(source, req.body?.category),
      admin_id: req.user._id,
      vendor_id: vendorIds[0] || null,
      description: description.slice(0, 2000),
      attachments: [],
    });

    notifyMainAdmins({
      title: `New ${source === "club" ? "club" : "event organiser"} request: ${request.category}`,
      message: `${req.user.organisation || req.user.name || ""}: ${description}`.slice(0, 120),
      action: "support_request",
      action_json: { request_id: request._id, source },
    });
    return apiResponse.ok(res, request, "Request sent. We'll get back to you soon.");
  } catch (err) {
    console.error(err);
    return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
  }
};

// GET /support-requests/my_requests - a club / organiser admin's own requests
const getMyRequests = async (req, res) => {
  try {
    if (!supportSourceForAdmin(req.user)) return apiResponse.forbidden(res, messages.FORBIDDEN);
    const requests = await ReportProblem.find({ admin_id: req.user._id })
      .select("category description status admin_reply createdAt updatedAt")
      .sort({ createdAt: -1 }).limit(100).lean();
    return apiResponse.ok(res, requests, messages.SUCCESS);
  } catch (err) {
    console.error(err);
    return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
  }
};

export default { getAllRequests, updateRequestStatus, getCategories, createMyRequest, getMyRequests };
