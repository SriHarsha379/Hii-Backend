import { ActivityLog } from "../model/index.js";

/**
 * Records an entry in the Activity Logs page. Call this from admin
 * controllers after a write action succeeds — never let a logging failure
 * break the actual request, so this always swallows its own errors.
 *
 * @param {import('express').Request} req - the authenticated request
 *   (req.user is set by adminauth/allowAdminOrVendor for admins,
 *   req.vendor is set for vendors)
 * @param {{action: 'CREATE'|'UPDATE'|'DELETE'|'LOGIN'|'LOGOUT', resource: string, resource_id?: string, details?: string}} entry
 */
const logActivity = async (req, { action, resource, resource_id = null, details = "" }) => {
  try {
    const isVendor = Boolean(req.vendor) && !req.user;
    const actor = isVendor ? req.vendor : req.user;

    await ActivityLog.create({
      admin_id: actor?._id || null,
      actor_type: isVendor ? "Vendor" : "Admin",
      admin_name: actor?.name || (isVendor ? "Vendor" : "Admin"),
      action,
      resource,
      resource_id,
      details,
      ip_address: req.ip || req.headers["x-forwarded-for"] || null,
    });
  } catch (err) {
    // Logging must never break the primary action it's attached to.
    console.error("Failed to record activity log:", err.message);
  }
};

export default logActivity;
