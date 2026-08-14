import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../model/userModel.js";

dotenv.config();

const TEST_PHONE = "8499003646";
const TEST_EMAIL = "8499003646@test.local"; // placeholder — email is required+unique
const TEST_USERNAME = "8499003646";
const TEST_PASSWORD = "807496@Bb";

async function run() {
  const mongoUri =
    process.env.MONGODB_URI ||
    process.env.MONGO_URI ||
    process.env.DB_URI ||
    process.env.DATABASE_URL;

  if (!mongoUri) {
    console.error("No Mongo connection string found in .env — check the variable name.");
    process.exit(1);
  }

  await mongoose.connect(mongoUri);
  console.log("Connected to MongoDB");

  let user = await User.findOne({
    $or: [{ email: TEST_EMAIL }, { phone_number: TEST_PHONE }, { username: TEST_USERNAME }],
  });

  if (user) {
    console.log("Test user already exists, updating password + flags...");
    user.password = TEST_PASSWORD; // pre-save hook re-hashes
    user.is_verified = true;
    user.is_profile_completed = true;
    user.signup_step = 3;
    await user.save();
  } else {
    user = new User({
      phone_number: TEST_PHONE,
      email: TEST_EMAIL,
      username: TEST_USERNAME,
      first_name: "Test",
      last_name: "User",
      name: "Test User",
      password: TEST_PASSWORD, // pre-save hook hashes automatically
      is_verified: true,
      is_profile_completed: true,
      signup_step: 3,
      login_type: "email",
      accepted_terms: true,
      accepted_privacy_policy: true,
    });
    await user.save();
    console.log("Created test user:", user._id.toString());
  }

  console.log("\nLogin with any of these as 'email' field:");
  console.log("  phone:", TEST_PHONE);
  console.log("  username:", TEST_USERNAME);
  console.log("  email:", TEST_EMAIL);
  console.log("  password:", TEST_PASSWORD);

  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error("Error creating test user:", err);
  process.exit(1);
});
