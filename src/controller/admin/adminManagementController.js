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

// PATCH /admins/:id/status — toggle active/inactive
const toggleAdminStatus = async (req, res) => {
  try {
    if (req.user?.role !== "SUPER_ADMIN") {
      return apiResponse.forbidden(res, "Not authorized");
    }
    const { id } = req.params;
    const admin = await Admin.findOne({ _id: id, is_deleted: { $ne: true } });
    if (!admin) return apiResponse.notFoundResponse(res, "Admin not found");

    if (String(admin._id) === String(req.user._id)) {
      return apiResponse.badRequest(res, "You can't deactivate your own account");
    }

    const nextActive = !admin.is_active;
    const updated = await Admin.findOneAndUpdate(
      { _id: id },
      { is_active: nextActive, status: nextActive ? "ACTIVE" : "INACTIVE" },
      { new: true, runValidators: false }
    ).select("-password");

    return apiResponse.ok(res, updated, nextActive ? "Admin activated" : "Admin deactivated");
  } catch (err) {
    console.error(err);
    return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
  }
};

// DELETE /admins/:id — soft delete
const deleteAdmin = async (req, res) => {
  try {
    if (req.user?.role !== "SUPER_ADMIN") {
      return apiResponse.forbidden(res, "Not authorized");
    }
    const { id } = req.params;
    const admin = await Admin.findOne({ _id: id, is_deleted: { $ne: true } });
    if (!admin) return apiResponse.notFoundResponse(res, "Admin not found");

    if (String(admin._id) === String(req.user._id)) {
      return apiResponse.badRequest(res, "You can't delete your own account");
    }

    await Admin.findOneAndUpdate(
      { _id: id },
      { is_deleted: true, is_active: false, status: "INACTIVE" },
      { runValidators: false }
    );

    return apiResponse.ok(res, null, "Admin removed");
  } catch (err) {
    console.error(err);
    return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
  }
};

// PATCH /admins/me/avatar — update the logged-in admin's own profile photo
const updateOwnAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return apiResponse.badRequest(res, "No image file provided");
    }
    const updated = await Admin.findOneAndUpdate(
      { _id: req.user._id, is_deleted: { $ne: true } },
      { profile_image: req.file.filename },
      { new: true, runValidators: false }
    ).select("-password");
    if (!updated) return apiResponse.notFoundResponse(res, "Admin not found");
    return apiResponse.ok(res, updated, "Profile photo updated");
  } catch (err) {
    console.error(err);
    return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
  }
};

export default { getAllAdmins, createAdmin, toggleAdminStatus, deleteAdmin, updateOwnAvatar };