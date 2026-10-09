import { Vendor, Venue, Event, VenueFollow } from "../model/index.js";

const esc = (s) => String(s || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// App users have no stored role. These are derived from other collections:
//   Club Member    -> has an active VenueFollow (follows a club's venue)
//   Club Owner      -> email matches a Vendor that OWNS a Venue
//   Event Organizer -> email matches a Vendor that has created Event(s)
// Owner/Organizer only show when there's real evidence (a venue / events),
// never on a bare email match. Every user always carries base role "User".
// Bulk by design (one query per collection) so the Users list stays fast.
export async function computeUserRolesBulk(users = []) {
  const result = {};
  for (const u of users) result[String(u._id)] = ["User"];
  if (!users.length) return result;

  const userIds = users.map((u) => u._id);

  // Club Member
  const follows = await VenueFollow.find({ user_id: { $in: userIds }, is_active: true })
    .select("user_id").lean();
  const memberSet = new Set(follows.map((f) => String(f.user_id)));

  // Owner / Organizer via Vendor email match
  const emailUsers = users.filter((u) => u.email);
  const vendors = emailUsers.length
    ? await Vendor.find({
        is_deleted: { $ne: true },
        $or: emailUsers.map((u) => ({ email: new RegExp(`^${esc(u.email)}$`, "i") })),
      }).select("_id email").lean()
    : [];

  const emailToVendor = new Map();
  for (const v of vendors) if (v.email) emailToVendor.set(String(v.email).toLowerCase(), v._id);

  const vendorIds = vendors.map((v) => v._id);
  let ownerSet = new Set();
  let organizerSet = new Set();
  if (vendorIds.length) {
    const [venueVendors, eventVendors] = await Promise.all([
      Venue.find({ vendor_id: { $in: vendorIds }, is_deleted: false }).distinct("vendor_id"),
      Event.find({ vendor_id: { $in: vendorIds }, is_deleted: false }).distinct("vendor_id"),
    ]);
    ownerSet = new Set(venueVendors.map(String));
    organizerSet = new Set(eventVendors.map(String));
  }

  for (const u of users) {
    const id = String(u._id);
    const roles = result[id];
    const vId = u.email ? emailToVendor.get(String(u.email).toLowerCase()) : null;
    if (vId && ownerSet.has(String(vId))) roles.push("Club Owner");
    if (vId && organizerSet.has(String(vId))) roles.push("Event Organizer");
    if (memberSet.has(id)) roles.push("Club Member");
    // TODO(phone match): once the Vendor phone field name is confirmed,
    // add a phone_number -> vendor lookup here alongside the email match.
  }
  return result;
}
