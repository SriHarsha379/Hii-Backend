import mongoose from "mongoose";

// Contact Schema
const ContactSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["user", "vendor"],
      default: "user",
    },

    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    vendor_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      default: null,
    },

    email: {
      type: String,
      required: true,
      trim: true,
    },

    message: {
      type: String,
      required: true,
    },

    admin_reply: {
      type: String,
      default: "",
    },

    is_reply: {
      type: Boolean,
      default: false,
    },

    reply_date: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

const Contact = mongoose.model("Contact", ContactSchema);
export default Contact;
