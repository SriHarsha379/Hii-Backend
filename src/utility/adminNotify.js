import { Admin, Vendor, Notification } from "../model/index.js";

/* =====================================================================
   ADMIN DASHBOARD NOTIFICATIONS
   - Main admins (SUPER_ADMIN / NORMAL_ADMIN) get one row each, keyed by
     their admin id (user_id).
   - A club / event organiser gets a row keyed by their Vendor id
     (vendor_user_id); their admin logins see it through the same
     organisation-name link the dashboard already uses for Bookings.
   `action` + `action_json` tell the dashboard which page to open on click.
   Never throws - a notification must never break the real request.
   ===================================================================== */

export const notifyMainAdmins = async ({ title, message, action, action_json = {} }) => {
  try {
    const admins = await Admin.find({
      role: { $in: ["SUPER_ADMIN", "NORMAL_ADMIN"] },
      is_deleted: { $ne: true },
    }).select("_id").lean();
    if (!admins.length) return;
    await Notification.insertMany(admins.map((a) => ({
      user_id: a._id,
      other_user_id: null,
      title,
      message,
      action,
      action_json,
      read_status: 0,
      is_deleted: 0,
    })));
  } catch (err) {
    console.warn("[adminNotify] main admins:", err.message);
  }
};

export const notifyVendorAdmins = async (vendorId, { title, message, action, action_json = {} }) => {
  if (!vendorId) return;
  try {
    await Notification.create({
      vendor_user_id: vendorId,
      other_user_id: null,
      title,
      message,
      action,
      action_json,
      read_status: 0,
      is_deleted: 0,
    });
  } catch (err) {
    console.warn("[adminNotify] vendor:", err.message);
  }
};

/** Which notification rows belong to the logged-in dashboard user. */
export const dashboardNotificationFilter = async (req) => {
  if (req.vendor?._id) return { vendor_user_id: req.vendor._id };
  const admin = req.user;
  if (!admin?._id) return null;
  const or = [{ user_id: admin._id }];
  if (["CLUB_ADMIN", "EVENT_ADMIN"].includes(admin.role) && admin.organisation) {
    const vendors = await Vendor.find({ name: admin.organisation, is_deleted: { $ne: true } })
      .select("_id").lean();
    if (vendors.length) or.push({ vendor_user_id: { $in: vendors.map((v) => v._id) } });
  }
  return { $or: or };
};
