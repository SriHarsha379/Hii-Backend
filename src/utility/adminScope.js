import { Vendor, Admin } from "../model/index.js";

/* =====================================================================
   Which clubs / organisers (Vendors) can the logged-in dashboard user manage?
   - SUPER_ADMIN / NORMAL_ADMIN: everything              -> null
   - CLUB_ADMIN / EVENT_ADMIN:  their own organisation   -> [vendor ids]
   - vendor logins:             themselves               -> [vendor id]
   A club admin is linked to their club by organisation name (ignoring
   capitals / extra spaces), or - if no name is saved - by the same email.
   Decided on the SERVER, never from ids sent in the request.
   ===================================================================== */
export const MAIN_ADMIN_ROLES = ["SUPER_ADMIN", "NORMAL_ADMIN"];

const escapeRx = (s) => String(s ?? "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
export const exactNameRx = (name) => new RegExp(`^\\s*${escapeRx(String(name).trim())}\\s*$`, "i");

export const isMainAdmin = (req) =>
  Boolean(req.user && !req.vendor && MAIN_ADMIN_ROLES.includes(req.user.role));

/** Vendor ids a club / event admin account is linked to. */
export const vendorIdsForAdmin = async (admin) => {
  const org = String(admin?.organisation || "").trim();
  let vendors = [];
  if (org) {
    vendors = await Vendor.find({ name: exactNameRx(org), is_deleted: { $ne: true } }).select("_id").lean();
  }
  if (!vendors.length && admin?.email) {
    vendors = await Vendor.find({ email: exactNameRx(admin.email), is_deleted: { $ne: true } }).select("_id").lean();
  }
  return vendors.map((v) => v._id);
};

export const manageableVendorIds = async (req) => {
  if (req.vendor?._id) return [req.vendor._id];
  if (isMainAdmin(req)) return null;
  if (!req.user) return [];
  return vendorIdsForAdmin(req.user);
};

/** Mongo filter limiting a query to what the caller may manage. */
export const ownershipFilter = async (req) => {
  const ids = await manageableVendorIds(req);
  return ids === null ? {} : { vendor_id: { $in: ids } };
};

/** Is some club / event admin already linked to this vendor? */
export const isVendorClaimed = async (vendor) => {
  if (!vendor) return false;
  const or = [{ organisation: exactNameRx(vendor.name) }];
  if (vendor.email) or.push({ email: exactNameRx(vendor.email) });
  return Boolean(await Admin.exists({
    role: { $in: ["CLUB_ADMIN", "EVENT_ADMIN"] },
    is_deleted: { $ne: true },
    $or: or,
  }));
};
