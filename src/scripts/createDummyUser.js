// One-off script: create a dummy test user with username/password login,
// fully profile-completed, so you can log in and test the app while OTP
// delivery is broken. Not wired into any route — run manually.
//
// Usage:
//   node src/scripts/createDummyUser.js <username> <password> [phone_number] [email]
//
// Example:
//   node src/scripts/createDummyUser.js testuser1 Test@1234
//   node src/scripts/createDummyUser.js testuser1 Test@1234 9999999999 testuser1@example.com

import mongoose from "mongoose";
import dotenv from "dotenv";
import { User, City } from "../model/index.js";

dotenv.config();

const [, , usernameArg, passwordArg, phoneArg, emailArg] = process.argv;

if (!usernameArg || !passwordArg) {
  console.error("Usage: node src/scripts/createDummyUser.js <username> <password> [phone_number] [email]");
  process.exit(1);
}

const phone_number = phoneArg || `9${Math.floor(100000000 + Math.random() * 899999999)}`;
const email = emailArg || `${usernameArg.toLowerCase()}@dummytest.local`;

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to DB");

  const existingByEmail = await User.findOne({ email });
  const existingByUsername = await User.findOne({ username: usernameArg });
  const existingByPhone = await User.findOne({ phone_number });

  if (existingByEmail || existingByUsername || existingByPhone) {
    console.error("A user already exists with this email, username, or phone number:");
    if (existingByEmail) console.error(`  email: ${email}`);
    if (existingByUsername) console.error(`  username: ${usernameArg}`);
    if (existingByPhone) console.error(`  phone_number: ${phone_number}`);
    console.error("Pick different values, or pass explicit phone_number/email as extra args.");
    await mongoose.disconnect();
    process.exit(1);
  }

  const anyCity = await City.findOne({});
  if (!anyCity) {
    console.error("No cities found in the City collection — can't assign a city_id. Add at least one city first.");
    await mongoose.disconnect();
    process.exit(1);
  }

  // Set birthdate to 25 years ago so it clears the 18+ check comfortably.
  const birthdate = new Date();
  birthdate.setFullYear(birthdate.getFullYear() - 25);

  const user = new User({
    email,
    phone_number,
    username: usernameArg,
    password: passwordArg, // pre-save hook hashes this automatically
    first_name: "Test",
    last_name: "User",
    name: "Test User",
    birthdate,
    gender: "Other",
    city_id: anyCity._id,
    profile_image: "",
    is_verified: true,
    is_profile_completed: true,
    is_active: true,
    is_deleted: false,
    accepted_terms: true,
    accepted_privacy_policy: true,
    login_type: "email",
    signup_step: 3,
  });

  await user.save();

  console.log("Dummy user created successfully:");
  console.log(`  _id: ${user._id}`);
  console.log(`  username: ${usernameArg}`);
  console.log(`  email: ${email}`);
  console.log(`  phone_number: ${phone_number}`);
  console.log(`  password: ${passwordArg}`);
  console.log(`  city: ${anyCity.city_name}`);
  console.log("");
  console.log("Log in with the identifier/password screens using either the username, email, or phone_number as the identifier, and the password above.");

  await mongoose.disconnect();
  process.exit(0);
}

run().catch(async (err) => {
  console.error("Error:", err);
  await mongoose.disconnect();
  process.exit(1);
});