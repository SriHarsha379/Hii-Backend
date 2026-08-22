import mongoose from "mongoose";

// Decoupled from Vendor on purpose — Vendor requires name/phone/address/
// city/state/password etc. as required fields, none of which exist yet at
// the point someone is just verifying their email to start registering.
// This is a short-lived record: created on OTP send, marked verified on
// OTP confirm, consumed (deleted) once registration actually completes.
const PendingVendorOtpSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      unique: true,
    },
    otp_code: {
      type: String,
      required: true,
    },
    expires_at: {
      type: Date,
      required: true,
    },
    verified: {
      type: Boolean,
      default: false,
    },
    // Verification itself expires too, separate from the OTP's own expiry —
    // a verified-but-unused email shouldn't stay claimable forever.
    verified_at: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

const PendingVendorOtp = mongoose.model("PendingVendorOtp", PendingVendorOtpSchema);
export default PendingVendorOtp;