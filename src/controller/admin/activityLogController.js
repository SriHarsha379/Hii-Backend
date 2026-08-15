import { ActivityLog } from "../../model/index.js";
import apiResponse from "../../utility/apiResponse.js";
import messages from "../../utility/messages.js";

// GET /activity-logs/get_all
// Supports search (?search=), action filter (?action=CREATE|UPDATE|DELETE|LOGIN|LOGOUT),
// pagination (?page=&limit=).
const getAllLogs = async (req, res) => {
  try {
    const { search = "", action, page = 1, limit = 100 } = req.query;

    const filter = {};
    if (action) filter.action = String(action).toUpperCase();
    if (search) {
      const regex = new RegExp(search.trim(), "i");
      filter.$or = [{ admin_name: regex }, { action: regex }, { resource: regex }, { details: regex }];
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(500, parseInt(limit, 10) || 100));
    const skip = (pageNum - 1) * limitNum;

    const [logs, total] = await Promise.all([
      ActivityLog.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      ActivityLog.countDocuments(filter),
    ]);

    return apiResponse.ok(res, { logs, total, page: pageNum, limit: limitNum }, messages.ACTIVITY_LOGS_FETCHED);
  } catch (err) {
    console.error(err);
    return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
  }
};

export default { getAllLogs };
