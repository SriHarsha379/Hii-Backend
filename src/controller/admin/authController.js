/** @format */

import bcrypt from "bcryptjs";
import jwtt from "../../utility/generateToken.js";
import apiResponse from "../../utility/apiResponse.js";
import messages from "../../utility/messages.js";
import helper from "../../utility/helper.js";
import sendmail from "../../utility/sendmail.js";
import jwt from "jsonwebtoken";
import totp from "../../utility/totp.js";

import dotenv from "dotenv";
dotenv.config();
import { Admin, Booking, Faq, Contact, User, Vendor, Earning, withdraw, Service, Event, Coupon } from "../../model/index.js";



// Admin Login
const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1️⃣ Validate fields
    if (!email || !password) {
      return apiResponse.badRequest(res, "Email and password are required");
    }

    // 2️⃣ Check if admin exists
    const admin = await Admin.findOne({ email });
    if (!admin) {
      return apiResponse.unauthorized(res, "Invalid email or password");
    }

    // 3️⃣ Compare hashed password
    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return apiResponse.unauthorized(res, "Invalid email or password");
    }

    // NEW: if this admin has 2FA enabled, don't issue the real session
    // token yet — issue a short-lived "pending" token instead (5 minute
    // expiry, distinct purpose from the real session token so it can't
    // be used to access anything else) and ask the frontend to collect a
    // TOTP code, which gets submitted to verifyTwoFactorLogin below.
    if (admin.two_factor_enabled) {
      const pendingToken = jwt.sign(
        { adminId: admin._id, purpose: "2fa_pending" },
        process.env.JWT_SECRET,
        { expiresIn: "5m" }
      );
      return apiResponse.ok(
        res,
        { requires_2fa: true, pending_token: pendingToken },
        "Enter your two-factor authentication code"
      );
    }

    // 4️⃣ Generate JWT
    const token = jwtt.generateToken(admin._id, "admin");

return apiResponse.ok(
  res,
  {
    token,
    email: admin.email,
    _id: admin._id,
    name: admin.name,
    role: admin.role,
    organisation: admin.organisation
  },
  "Login successful"
);

  } catch (err) {
    return apiResponse.serverError(res, "Server error", err.message);
  }
};

// NEW: public self-serve registration for prospective Club/Event
// organisers. Unlike createAdmin (Super Admin only, in
// adminManagementController.js), this has no adminauth requirement —
// it's the entry point for someone who doesn't have an account yet at
// all. Deliberately restricted to CLUB_ADMIN/EVENT_ADMIN only: this
// must never be usable to mint a SUPER_ADMIN or NORMAL_ADMIN account.
// The account this creates has no `organisation` set yet, so after
// logging in with the token returned here, the existing frontend
// ProtectedRoute logic already routes them straight into
// /club-onboarding or /event-onboarding to finish setup — same as the
// Super-Admin-invited path, just without needing an invite first.
const registerOrganiser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password || !role) {
      return apiResponse.badRequest(res, "Name, email, password, and role are required");
    }

    const allowedRoles = ["CLUB_ADMIN", "EVENT_ADMIN"];
    if (!allowedRoles.includes(role)) {
      return apiResponse.badRequest(res, "Role must be CLUB_ADMIN or EVENT_ADMIN");
    }

    if (password.length < 6) {
      return apiResponse.badRequest(res, "Password must be at least 6 characters");
    }

    const cleanEmail = email.toLowerCase().trim();
    const existing = await Admin.findOne({ email: cleanEmail, is_deleted: { $ne: true } });
    if (existing) {
      return apiResponse.badRequest(res, "An account with this email already exists");
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const admin = await Admin.create({
      name: name.trim(),
      email: cleanEmail,
      password: hashedPassword,
      role,
    });

    const token = jwtt.generateToken(admin._id, "admin");

    return apiResponse.ok(
      res,
      {
        token,
        email: admin.email,
        _id: admin._id,
        name: admin.name,
        role: admin.role,
        organisation: admin.organisation,
      },
      "Account created successfully"
    );
  } catch (err) {
    if (err?.code === 11000) {
      return apiResponse.badRequest(res, "An account with this email already exists");
    }
    return apiResponse.serverError(res, "Server error", err.message);
  }
};

// NEW: second step of login when 2FA is enabled — takes the pending
// token from loginAdmin above plus the 6-digit code from the admin's
// authenticator app, and issues the real session token on success.
const verifyTwoFactorLogin = async (req, res) => {
  try {
    const { pending_token, code } = req.body;
    if (!pending_token || !code) {
      return apiResponse.badRequest(res, "Pending token and code are required");
    }

    let decoded;
    try {
      decoded = jwt.verify(pending_token, process.env.JWT_SECRET);
    } catch (err) {
      return apiResponse.badRequest(res, "Session expired, please log in again");
    }
    if (decoded.purpose !== "2fa_pending") {
      return apiResponse.badRequest(res, "Invalid session");
    }

    const admin = await Admin.findById(decoded.adminId);
    if (!admin || !admin.two_factor_enabled || !admin.two_factor_secret) {
      return apiResponse.badRequest(res, "Two-factor authentication is not active on this account");
    }

    const isValidCode = totp.verifyCode(admin.two_factor_secret, code);
    if (!isValidCode) {
      return apiResponse.unauthorized(res, "Invalid or expired code");
    }

    const token = jwtt.generateToken(admin._id, "admin");
    return apiResponse.ok(
      res,
      {
        token,
        email: admin.email,
        _id: admin._id,
        name: admin.name,
        role: admin.role,
        organisation: admin.organisation
      },
      "Login successful"
    );
  } catch (err) {
    return apiResponse.serverError(res, "Server error", err.message);
  }
};

// NEW: begins 2FA setup for the logged-in admin — generates a fresh
// secret and returns it for manual entry into an authenticator app
// (Google Authenticator, Authy, etc. all support typing a secret in
// directly, no QR code needed). Doesn't enable 2FA yet — the secret is
// only saved once confirmSetupTwoFactor verifies the admin can actually
// generate a valid code with it, proving they set it up correctly.
const beginSetupTwoFactor = async (req, res) => {
  try {
    const adminId = req.user.id;
    const admin = await Admin.findById(adminId);
    if (!admin) return apiResponse.notFound(res, messages.NOT_FOUND[0]);

    const secret = totp.generateSecret();
    const otpauthUri = totp.buildOtpAuthUri(secret, admin.email);

    // Stash the pending (not-yet-confirmed) secret so confirmSetupTwoFactor
    // can verify against it. Not marking two_factor_enabled until confirmed.
    admin.two_factor_secret = secret;
    await admin.save();

    return apiResponse.ok(res, { secret, otpauth_uri: otpauthUri }, "Scan or enter this secret in your authenticator app");
  } catch (err) {
    return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
  }
};

// NEW: confirms setup by checking a real code from the authenticator app
// against the pending secret, then flips two_factor_enabled on.
const confirmSetupTwoFactor = async (req, res) => {
  try {
    const adminId = req.user.id;
    const { code } = req.body;
    if (!code) return apiResponse.badRequest(res, "Verification code is required");

    const admin = await Admin.findById(adminId);
    if (!admin) return apiResponse.notFound(res, messages.NOT_FOUND[0]);
    if (!admin.two_factor_secret) {
      return apiResponse.badRequest(res, "Start setup first");
    }

    const isValidCode = totp.verifyCode(admin.two_factor_secret, code);
    if (!isValidCode) {
      return apiResponse.unauthorized(res, "Invalid code — check your authenticator app and try again");
    }

    admin.two_factor_enabled = true;
    await admin.save();

    return apiResponse.ok(res, { two_factor_enabled: true }, "Two-factor authentication enabled");
  } catch (err) {
    return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
  }
};

// NEW: disables 2FA — requires the current password as confirmation,
// same as changing a password, since this is a real security-relevant
// action.
const disableTwoFactor = async (req, res) => {
  try {
    const adminId = req.user.id;
    const { password } = req.body;
    if (!password) return apiResponse.badRequest(res, "Password is required to disable two-factor authentication");

    const admin = await Admin.findById(adminId);
    if (!admin) return apiResponse.notFound(res, messages.NOT_FOUND[0]);

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) return apiResponse.unauthorized(res, "Incorrect password");

    admin.two_factor_enabled = false;
    admin.two_factor_secret = null;
    await admin.save();

    return apiResponse.ok(res, { two_factor_enabled: false }, "Two-factor authentication disabled");
  } catch (err) {
    return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
  }
};


// Get Admin Details
const getAdminDetails = async (req, res) => {
  try {
    const adminId = req.user.id;
    console.log("Admin ID:", adminId); // Debug log
    const admin = await Admin.findById(adminId).select("-password");

    if (!admin) return apiResponse.notFound(res, messages.NOT_FOUND[0]);

    return apiResponse.ok(res, admin, messages.SUCCESS[0]);
  } catch (err) {
    return apiResponse.serverError(res, messages.SERVER_ERROR[0], err.message);
  }
};
// Admin Update Profile
const updateAdminProfile = async (req, res) => {
  try {
    const adminId = req.user.id; // assuming authMiddleware sets req.user
    const { email, name } = req.body;

    const data = await Admin.findById(adminId);
    if (!data) return apiResponse.notFound(res, messages.NOT_FOUND);

    const updateData = {};

    // ✅ Email Validation (strict format only)
    if (email && email !== data.email) {
      const emailRegex = /^[a-zA-Z0-9]+@[a-zA-Z]+\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(email)) {
        return apiResponse.badRequest(res, messages.INVALID_EMAIL[0]);
      }
      updateData.email = email;
    }

    if (name && name !== data.name) updateData.name = name;

    // ✅ Image comparison
    if (req.file) {
      if (data.profile_image !== req.file.filename) {
        if (data.profile_image) {
          helper.removeOldImage(data.profile_image);
        }
        updateData.profile_image = req.file.filename;
      }
    }

    // ✅ Check if nothing to update
    if (Object.keys(updateData).length === 0) {
      return apiResponse.ok(res, data, messages.ALREADY_EXIST[0]);
    }

    const updatedAdmin = await Admin.findByIdAndUpdate(
      adminId,
      { $set: updateData },
      { new: true }
    ).select("-password");

    return apiResponse.ok(res, updatedAdmin, messages.PROFILE_UPDATED);
  } catch (err) {
    return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
  }
};

const changePassword = async (req, res) => {
  try {
    const adminId = req.user.id; // authMiddleware
    const { oldPassword, newPassword } = req.body;
    // Get admin from DB
    const admin = await Admin.findById(adminId);
    if (!admin) return apiResponse.notFound(res, messages.NOT_FOUND);

    const isMatch = await bcrypt.compare(oldPassword, admin.password);
    if (!isMatch) return apiResponse.unauthorized(res, messages.WRONG_PASS);
    // Check if new password is same as old
    const isSame = await bcrypt.compare(newPassword, admin.password);
    if (isSame) {
      return apiResponse.badRequest(res, messages.NEW_PASSWORD_SAME_AS_OLD);
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password in DB
    admin.password = hashedPassword;
    await admin.save();

    return apiResponse.ok(res, messages.PASSWORD_CHANGED);
  } catch (err) {
    return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
  }
};

// ✅ Admin Forget Password
const adminForgetPassword = async (req, res) => {
  try {
    const { email } = req.body;

    // 1. Admin check
    const admin = await Admin.findOne({ email });
    if (!admin) {
      return apiResponse.badRequest(res, messages.ADMIN_NOT_FOUND);
    }

    admin.reset_token_used = false;
    await admin.save();

    // 2. Create JWT Token (15 min expiry)
    const token = jwt.sign({ adminId: admin._id }, process.env.JWT_SECRET, {
      expiresIn: "15m",
    });

    // 3. Reset link
    // const resetLink = `https://hii.life/app/admin/reset-password/${token}`;
    const resetLink = `http://localhost:3000/app/admin/reset-password/${token}`;

    // 4. Prepare email body
    const mailBody = sendmail.mailBodyForgetPassword({
      app_name: "Hii Admin",
      app_logo:
        "https://hii.life/app/server/uploads/hii_dark_logo.png",
      adminName: admin.name,
      adminEmail: admin.email,
      resetLink,
    });

    // 5. Send email
    await sendmail.ForgetPasswordMail(
      admin.email,
      "Reset Your Password",
      mailBody
    );

    return apiResponse.ok(res, messages.FORGET_PASSWORD_MAIL_SUCCESSFYLLY);
  } catch (err) {
    console.error("Forget password error:", err);
    return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
  }
};

// ✅ Admin Forget New Password
const adminForgetNewPassword = async (req, res) => {
  try {
    const { newPassword, token } = req.body;

    // 1️⃣ Verify JWT
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return apiResponse.badRequest(res, "Token expired or invalid");
    }

    // 2️⃣ Find admin
    const admin = await Admin.findById(decoded.adminId);
    if (!admin) {
      return apiResponse.badRequest(res, messages.ADMIN_NOT_FOUND);
    }

    // 3️⃣ Check if link already used
    if (admin.reset_token_used) {
      return apiResponse.badRequest(
        res,
        "This reset link has already been used."
      );
    }

    // 4️⃣ Prevent same password
    const isSamePassword = await bcrypt.compare(
      newPassword,
      admin.password
    );

    if (isSamePassword) {
      return apiResponse.badRequest(
        res,
        "New password cannot be same as old password"
      );
    }

    // 5️⃣ Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    admin.password = hashedPassword;

    // 🔥 Mark link as used (ONE TIME ONLY)
    admin.reset_token_used = true;

    await admin.save();

    return apiResponse.ok(res, null, messages.PASSWORD_CHANGED);

  } catch (err) {
    return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
  }
};


// Dashboard Counts
const dashboardCounts = async (req, res) => {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const [
      totalServices,
      totalUser,
      totalDeleteUser,
      totalFaq,
      totalBooking,
      totalHelpSupport,
      todayBooking,
      totalVendor,
      totalWithdraw,
      totalBroadcast,
      allBookingsForEarning,
      todayBookingsForEarning
    ] = await Promise.all([
      Service.countDocuments({ is_active: true }),

      User.countDocuments({
        is_deleted: false,
        is_profile_completed: true,
        is_verified: true,
      }),

      User.countDocuments({
        is_deleted: true,
        is_profile_completed: true,
        is_verified: true,
      }),

      Faq.countDocuments({ is_active: true }),

      Booking.countDocuments({
        payment_status: "success",
        is_deleted: false
      }),

      Contact.countDocuments({}),

      Booking.countDocuments({
        createdAt: { $gte: startOfDay, $lte: endOfDay },
        payment_status: "success",
        is_deleted: false
      }),

      Vendor.countDocuments({ is_deleted: false }),

      withdraw.countDocuments({}),

      Booking.countDocuments({}), // broadcast proxy

      // ✅ ALL bookings for total earning
      Booking.find({
        payment_status: "success",
        booking_status: { $in: ["confirmed", "completed"] },
        is_deleted: false
      }).select("admin_earning"),

      // ✅ TODAY bookings for today's earning
      Booking.find({
        createdAt: { $gte: startOfDay, $lte: endOfDay },
        payment_status: "success",
        booking_status: { $in: ["confirmed", "completed"] },
        is_deleted: false
      }).select("admin_earning"),
    ]);

    // ✅ Calculate Total Admin Earning
    const totalAdminEarning = allBookingsForEarning.reduce(
      (sum, item) => sum + (item.admin_earning || 0),
      0
    );

    // ✅ Calculate Today Admin Earning
    const todayAdminEarning = todayBookingsForEarning.reduce(
      (sum, item) => sum + (item.admin_earning || 0),
      0
    );

    const data = {
      services: { total: totalServices },

      customers: {
        active: totalUser,
        deleted: totalDeleteUser,
      },

      faqs: { total: totalFaq },

      bookings: {
        total: totalBooking,
        today: todayBooking,
      },

      helpSupport: { total: totalHelpSupport },

      vendors: { total: totalVendor },

      earnings: {
        totalAdminEarning: totalAdminEarning,
        todayAdminEarning: todayAdminEarning, // ✅ NEW KEY
      },

      withdrawals: { total: totalWithdraw },

      broadcasts: { total: totalBroadcast },
    };

    return apiResponse.ok(res, data, messages.SUCCESS[0]);

  } catch (err) {
    console.error("Dashboard error:", err);
    return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
  }
};

const dashboardCountsVendor = async (req, res) => {
  try {
    const vendorId = req.vendor._id;

    // 📅 Today range
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const [
      totalEvents,
      totalBookings,
      todayBookings,
      totalCoupons,
      allVendorBookings,
      todayVendorBookings
    ] = await Promise.all([

      // ✅ Total events
      Event.countDocuments({
        vendor_id: vendorId,
        is_deleted: false,
        is_active: true
      }),

      // ✅ Total bookings
      Booking.countDocuments({
        vendor_id: vendorId,
        is_deleted: false
      }),

      // ✅ Today bookings
      Booking.countDocuments({
        vendor_id: vendorId,
        is_deleted: false,
        createdAt: { $gte: startOfDay, $lte: endOfDay }
      }),

      // ✅ Total coupons
      Coupon.countDocuments({
        vendor_id: vendorId,
        is_deleted: false
      }),

      // ✅ All successful bookings for earning
      Booking.find({
        vendor_id: vendorId,
        payment_status: "success",
        booking_status: { $in: ["confirmed", "completed"] },
        is_deleted: false
      }).select("sub_total admin_earning"),

      // ✅ Today successful bookings for earning
      Booking.find({
        vendor_id: vendorId,
        payment_status: "success",
        booking_status: { $in: ["confirmed", "completed"] },
        is_deleted: false,
        createdAt: { $gte: startOfDay, $lte: endOfDay }
      }).select("sub_total admin_earning")
    ]);

    /* ================= EARNING CALCULATION ================= */

    const totalVendorEarning = allVendorBookings.reduce((sum, item) => {
      return sum + ((item.sub_total || 0) - (item.admin_earning || 0));
    }, 0);

    const todayVendorEarning = todayVendorBookings.reduce((sum, item) => {
      return sum + ((item.sub_total || 0) - (item.admin_earning || 0));
    }, 0);

    const data = {
      events: {
        total: totalEvents
      },
      bookings: {
        total: totalBookings,
        today: todayBookings
      },
      earnings: {
        total_vendor_earning: totalVendorEarning,   // ✅ NEW
        today_vendor_earning: todayVendorEarning    // ✅ NEW
      },
      coupons: {
        total: totalCoupons
      }
    };

    return apiResponse.ok(
      res,
      data,
      "Vendor dashboard data fetched successfully"
    );

  } catch (err) {
    console.error("Vendor dashboard error:", err);
    return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
  }
};

export default {
  loginAdmin,
  registerOrganiser,
  verifyTwoFactorLogin,
  beginSetupTwoFactor,
  confirmSetupTwoFactor,
  disableTwoFactor,
  updateAdminProfile,
  getAdminDetails,
  changePassword,
  adminForgetNewPassword,
  adminForgetPassword,
  dashboardCounts,
  dashboardCountsVendor
};