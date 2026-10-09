import { Vendor, Event, User, Admin } from "../../model/index.js";
import apiResponse from "../../utility/apiResponse.js";
import { computeUserRolesBulk } from "../../utility/userRoles.js";

const escapeRegex = (text) => String(text || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const RESULT_LIMIT = 5;
const ADMIN_ROLE_LABEL = {
  SUPER_ADMIN: "Main Admin", NORMAL_ADMIN: "Admin",
  EVENT_ADMIN: "Event Manager", CLUB_ADMIN: "Club Owner", CITY_ADMIN: "City Manager",
};

const search = async (req, res) => {
  try {
    const q = (req.query.q || "").toString().trim();
    if (!q) return res.json([]);
    const regex = new RegExp(escapeRegex(q), "i");

    const [vendors, events, users, admins] = await Promise.all([
      Vendor.find({ is_deleted: { $ne: true }, $or: [{ name: regex }, { email: regex }] })
        .select("_id name").limit(RESULT_LIMIT).lean(),
      Event.find({ is_deleted: false, venue_name: regex })
        .select("_id venue_name").limit(RESULT_LIMIT).lean(),
      User.find({ is_deleted: false, $or: [{ first_name: regex }, { last_name: regex }, { name: regex }, { username: regex }, { email: regex }] })
        .select("_id first_name last_name name username email is_banned").limit(RESULT_LIMIT).lean(),
      Admin.find({ is_deleted: { $ne: true }, $or: [{ name: regex }, { email: regex }, { organisation: regex }] })
        .select("_id name email role organisation").limit(RESULT_LIMIT).lean(),
    ]);

    const userRoleMap = await computeUserRolesBulk(users);

    const results = [
      ...vendors.map((v) => ({ type: "club", id: v._id, title: v.name || "Untitled Club", role: "Club", link: "/clubs" })),
      ...events.map((e) => ({ type: "event", id: e._id, title: e.venue_name || "Untitled Event", role: "Event", link: "/events" })),
      ...users.map((u) => {
        const extra = (userRoleMap[String(u._id)] || ["User"]).filter((r) => r !== "User");
        return {
          type: "user", id: u._id,
          title: (u.name || `${u.first_name || ""} ${u.last_name || ""}`).trim() || u.username || u.email || "Unnamed User",
          role: extra.length ? extra.join(" · ") : "User",
          link: "/users",
        };
      }),
      ...admins.map((a) => ({ type: "admin", id: a._id, title: a.name || a.organisation || a.email || "Admin", role: ADMIN_ROLE_LABEL[a.role] || "Admin", link: "/admins" })),
    ];
    return res.json(results);
  } catch (err) {
    return apiResponse.serverError(res, "Search failed", err.message);
  }
};

export default { search };
