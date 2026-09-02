import { Vendor, Event, User } from "../../model/index.js";
import apiResponse from "../../utility/apiResponse.js";

// NEW: the admin dashboard's global search bar (top nav, Cmd+K) has always
// called GET /search — there was never a matching route on the backend at
// all, so every search silently 404'd. The frontend (components/Layout.tsx)
// already expects a flat array of { type, id, title, link } — not wrapped
// in the usual { success, data } envelope — so this matches that shape
// directly rather than requiring a frontend change too.

const escapeRegex = (text) => String(text || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const RESULT_LIMIT = 5;

// The admin app doesn't have per-item detail routes (clicking a club/event/
// user opens a modal within the list page, not a separate URL) — so a
// result's link points at the relevant list page rather than a deep link
// that doesn't exist.
const search = async (req, res) => {
  try {
    const q = (req.query.q || "").toString().trim();

    if (!q) {
      return res.json([]);
    }

    const regex = new RegExp(escapeRegex(q), "i");

    const [vendors, events, users] = await Promise.all([
      Vendor.find({
        $or: [{ name: regex }, { email: regex }],
      })
        .select("_id name")
        .limit(RESULT_LIMIT)
        .lean(),
      Event.find({
        is_deleted: false,
        venue_name: regex,
      })
        .select("_id venue_name")
        .limit(RESULT_LIMIT)
        .lean(),
      User.find({
        is_deleted: false,
        $or: [{ first_name: regex }, { last_name: regex }, { email: regex }],
      })
        .select("_id first_name last_name email")
        .limit(RESULT_LIMIT)
        .lean(),
    ]);

    const results = [
      ...vendors.map((v) => ({
        type: "club",
        id: v._id,
        title: v.name || "Untitled Club",
        link: "/clubs",
      })),
      ...events.map((e) => ({
        type: "event",
        id: e._id,
        title: e.venue_name || "Untitled Event",
        link: "/events",
      })),
      ...users.map((u) => ({
        type: "user",
        id: u._id,
        title: `${u.first_name || ""} ${u.last_name || ""}`.trim() || u.email || "Unnamed User",
        link: "/users",
      })),
    ];

    // Frontend reads res.json() directly as the results array (no
    // { success, data } envelope) — matching that here rather than
    // changing the already-written UI code.
    return res.json(results);
  } catch (err) {
    return apiResponse.serverError(res, "Search failed", err.message);
  }
};

export default { search };