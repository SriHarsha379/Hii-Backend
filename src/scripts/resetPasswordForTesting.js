// One-off script: reset a user's password directly for testing, since OTP
// login is currently broken (SMS delivery/DLT issue). Run once, then delete
// or leave unused — not wired into any route.
//
// Usage:
//   node src/scripts/resetPasswordForTesting.js <phone_number> <new_password>
//
// Example:
//   node src/scripts/resetPasswordForTesting.js 8499003646 Test@1234

import mongoose from "mongoose";
import dotenv from "dotenv";
import { User } from "../model/index.js";

dotenv.config();

const [, , phoneArg, newPasswordArg] = process.argv;

if (!phoneArg || !newPasswordArg) {
  console.error("Usage: node src/scripts/resetPasswordForTesting.js <phone_number> <new_password>");
  process.exit(1);
}

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to DB");

  const user = await User.findOne({ phone_number: phoneArg });

  if (!user) {
    console.error(`No user found with phone_number: ${phoneArg}`);
    await mongoose.disconnect();
    process.exit(1);
  }

  // NOTE: set the PLAIN password here, not a pre-hashed value — the
  // User schema already has a pre-save hook that hashes `password`
  // automatically whenever it's modified. Pre-hashing here would cause
  // the hook to hash it a second time, breaking login entirely.
  user.password = newPasswordArg;
  await user.save();

  console.log(`Password reset for user ${user._id} (${phoneArg}).`);
  console.log(`New password: ${newPasswordArg}`);

  await mongoose.disconnect();
  process.exit(0);
}

run().catch(async (err) => {
  console.error("Error:", err);
  await mongoose.disconnect();
  process.exit(1);
});