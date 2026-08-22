import PendingVendorOtp from "../../model/pendingVendorOtpModel.js";
import { Vendor } from "../../model/index.js";
import apiResponse from "../../utility/apiResponse.js";
import messages from "../../utility/messages.js";
import mailer from "../../utility/sendmail.js";

// POST /vendor/send_registration_otp   body: { email, name }
// Public-facing (no admin auth) since this runs before a full account
// exists yet — but rate-limited to one active OTP per email at a time via
// the upsert below, and the OTP itself expires in 10 minutes.
const sendRegistrationOtp = async (req, res) => {
  try {
    const { email, name } = req.body;
    if (!email) return apiResponse.badRequest(res, "Email is required");

    const cleanEmail = email.toLowerCase().trim();

    const existingVendor = await Vendor.findOne({ email: cleanEmail, is_deleted: false });
    if (existingVendor) {
      return apiResponse.badRequest(res, "An account with this email already exists.");
    }

    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    const expires_at = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await PendingVendorOtp.findOneAndUpdate(
      { email: cleanEmail },
      { otp_code: otp, expires_at, verified: false, verified_at: null },
      { upsert: true, new: true }
    );

    const postData = {
      app_name: process.env.APP_NAME || "Hii",
      app_logo: process.env.APP_LOGO || "https://hii.life/app/server/uploads/hii_dark_logo.png",
      name: name || "there",
      otp,
    };
    const subject = `${postData.app_name} - Email Verification OTP`;
    const mailBody = mailer.mailBodyEmailOtp(postData);
    const mailResult = await mailer.sendMail(cleanEmail, subject, mailBody);

    if (mailResult?.success === false) {
      console.error("Failed to send registration OTP email:", mailResult.error);
      return apiResponse.serverError(res, "Failed to send verification email. Please try again.");
    }

    return apiResponse.ok(res, { email: cleanEmail }, "OTP sent to your email");
  } catch (err) {
    console.error(err);
    return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
  }
};

// POST /vendor/verify_registration_otp   body: { email, otp }
const verifyRegistrationOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return apiResponse.badRequest(res, "Email and OTP are required");

    const cleanEmail = email.toLowerCase().trim();
    const record = await PendingVendorOtp.findOne({ email: cleanEmail });

    if (!record) {
      return apiResponse.badRequest(res, "No OTP was sent to this email. Request a new one.");
    }
    if (new Date() > record.expires_at) {
      return apiResponse.badRequest(res, "This OTP has expired. Request a new one.");
    }
    if (record.otp_code !== String(otp).trim()) {
      return apiResponse.badRequest(res, "Incorrect OTP. Please try again.");
    }

    record.verified = true;
    record.verified_at = new Date();
    await record.save();

    return apiResponse.ok(res, { email: cleanEmail, verified: true }, "Email verified successfully");
  } catch (err) {
    console.error(err);
    return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
  }
};

// Called internally by createVendor (registration) to confirm this email
// was actually verified recently before allowing account creation.
const isEmailVerifiedForRegistration = async (email) => {
  if (!email) return false;
  const cleanEmail = email.toLowerCase().trim();
  const record = await PendingVendorOtp.findOne({ email: cleanEmail });
  if (!record || !record.verified || !record.verified_at) return false;
  // Verification itself is only good for 30 minutes after confirming —
  // long enough to finish the registration wizard, not indefinitely reusable.
  const stillFresh = Date.now() - new Date(record.verified_at).getTime() < 30 * 60 * 1000;
  return stillFresh;
};

// Called internally once registration succeeds, to clean up the now-used
// pending record rather than leaving it around.
const consumeVerifiedOtp = async (email) => {
  if (!email) return;
  await PendingVendorOtp.deleteOne({ email: email.toLowerCase().trim() });
};

export default {
  sendRegistrationOtp,
  verifyRegistrationOtp,
  isEmailVerifiedForRegistration,
  consumeVerifiedOtp,
};