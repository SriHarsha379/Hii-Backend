import { Vendor } from "../model/index.js";

/* =====================================================================
   Which clubs / organisers (Vendors) can the logged-in dashboard user manage?
   - SUPER_ADMIN / NORMAL_ADMIN: everything              -> null
   - CLUB_ADMIN / EVENT_ADMIN:  their own organisation   -> [vendor ids]
     (linked by organisation name, as the dashboard does everywhere)
   - vendor logins:             themselves               -> [vendor id]
   Anything else gets [] (nothing). Decided on the SERVER - never from ids
   sent in the request.
   ===================================================================== */
export const MAIN_ADMIN_ROLES = ["SUPER_ADMIN", "NORMAL_ADMIN"];

export const isMainAdmin = (req) =>
  Boolean(req.user && !req.vendor && MAIN_ADMIN_ROLES.includes(req.user.role));

export const manageableVendorIds = async (req) => {
  if (req.vendor?._id) return [req.vendor._id];
  if (isMainAdmin(req)) return null;
  const org = req.user?.organisation;
  if (!org) return [];
  const vendors = await Vendor.find({ name: org, is_deleted: { $ne: true } }).select("_id").lean();
  return vendors.map((v) => v._id);
};

/** Mongo filter limiting a query to what the caller may manage. */
export const ownershipFilter = async (req) => {
  const ids = await manageableVendorIds(req);
  return ids === null ? {} : { vendor_id: { $in: ids } };
};
