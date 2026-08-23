import mongoose from "mongoose";const adminSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    profile_image: {
      type: String,
      default: "",
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,    },
    role: {
      type: String,
      enum: [
        "SUPER_ADMIN",
        "NORMAL_ADMIN",
        "CLUB_ADMIN",
        "EVENT_ADMIN"
      ],
      default: "NORMAL_ADMIN",
    },
    organisation: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      default: "ACTIVE",
    },
    is_active: {
      type: Boolean,
      default: true,
    },
    is_deleted: {
      type: Boolean,
      default: false,
    },
    reset_token_used: {
      type: Boolean,
      default: false,
    },
    // NEW: real TOTP-based 2FA support. two_factor_secret only ever gets
    // set once two_factor_enabled is confirmed true (i.e. after the admin
    // has verified they can actually generate a valid code) — a secret
    // existing without the enabled flag means setup was started but never
    // completed, and login should not require a code in that case.
    two_factor_enabled: {
      type: Boolean,
      default: false,
    },
    two_factor_secret: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);
const Admin = mongoose.model("Admin", adminSchema);
export default Admin;