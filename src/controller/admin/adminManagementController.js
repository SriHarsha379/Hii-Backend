import bcrypt from "bcryptjs";
import { Admin } from "../../model/index.js";
import apiResponse from "../../utility/apiResponse.js";
import messages from "../../utility/messages.js";

// GET /admins
// FIXED: this endpoint didn't exist at all — the entire Admins.tsx
// management page (list + create) has been calling a route with no
// backend behind it. Confirmed by searching the whole codebase: the only
// place an Admin document was ever created was a standalone script
// (scripts/createAdmin.js) requiring direct server access — there was no
// way for Super Admin to provision a CLUB_ADMIN or EVENT_ADMIN account
// through the dashboard itself, despite the UI presenting a fully
// functional-looking "Add Admin" form.
const getAllAdmins = async (req, res) => {
  try {
    // Only Super Admin should see/manage the list of admin accounts.
    if (req.user?.role !== "SUPER_ADMIN") {
      return apiResponse.forbidden(res, "Not authorized");
    }
    const admins = await Admin.find({ is_deleted: { $ne: true } })
      .select("-password")
      .sort({ createdAt: -1 });
    return apiResponse.ok(res, admins, "Admins fetched successfully");
  } catch (err) {
    console.error(err);
    return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
  }
};

// POST /admins
const createAdmin = async (req, res) => {
  try {
    if (req.user?.role !== "SUPER_ADMIN") {
      return apiResponse.forbidden(res, "Not authorized");
    }
    const { name, email, role, password } = req.body;

    if (!name || !email || !password) {
      return apiResponse.badRequest(res, "Name, email, and password are required");
    }

    const cleanEmail = email.toLowerCase().trim();
    const existing = await Admin.findOne({ email: cleanEmail, is_deleted: { $ne: true } });
    if (existing) {
      return apiResponse.badRequest(res, "An admin with this email already exists");
    }

    const validRoles = ["SUPER_ADMIN", "NORMAL_ADMIN", "CLUB_ADMIN", "EVENT_ADMIN"];
    const finalRole = validRoles.includes(role) ? role : "NORMAL_ADMIN";

    if (password.length < 6) {
      return apiResponse.badRequest(res, "Password must be at least 6 characters");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const admin = await Admin.create({
      name,
      email: cleanEmail,
      password: hashedPassword,
      role: finalRole,
    });

    const { password: _pw, ...adminResponse } = admin.toObject();
    return apiResponse.created(res, adminResponse, "Admin created successfully");
  } catch (err) {
    console.error(err);
    if (err.code === 11000) {
      return apiResponse.badRequest(res, "An admin with this email already exists");
    }
    if (err.name === "ValidationError") {
      return apiResponse.badRequest(res, Object.values(err.errors).map((e) => e.message).join(", "));
    }
    return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
  }
};

export default { getAllAdmins, createAdmin };