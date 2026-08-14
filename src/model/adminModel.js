import mongoose from "mongoose";
const adminSchema = new mongoose.Schema(
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
      required: true,
    },

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
  },
  { timestamps: true }
);

const Admin = mongoose.model("Admin", adminSchema);

export default Admin;