import { User } from "../../model/index.js";
import apiResponse from "../../utility/apiResponse.js";
import { computeUserRolesBulk } from "../../utility/userRoles.js";

// POST /admin/user-roles/batch  { ids: [...] }  -> { [userId]: [roles] }
const getRolesBatch = async (req, res) => {
  try {
    const ids = Array.isArray(req.body?.ids)
      ? req.body.ids
      : String(req.query.ids || "").split(",").map((s) => s.trim()).filter(Boolean);
    if (!ids.length) return apiResponse.ok(res, {}, "Success");
    const users = await User.find({ _id: { $in: ids }, is_deleted: false })
      .select("_id email phone_number").lean();
    const map = await computeUserRolesBulk(users);
    return apiResponse.ok(res, map, "Success");
  } catch (err) {
    return apiResponse.serverError(res, "Failed to compute roles", err.message);
  }
};

// GET /admin/user-roles/:id  -> [roles]  (for the user profile)
const getRolesForUser = async (req, res) => {
  try {
    const user = await User.findOne({ _id: req.params.id, is_deleted: false })
      .select("_id email phone_number").lean();
    if (!user) return apiResponse.notFoundResponse(res, "User not found");
    const map = await computeUserRolesBulk([user]);
    return apiResponse.ok(res, map[String(user._id)] || ["User"], "Success");
  } catch (err) {
    return apiResponse.serverError(res, "Failed to compute roles", err.message);
  }
};

export default { getRolesBatch, getRolesForUser };
