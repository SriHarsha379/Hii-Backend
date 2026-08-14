import mongoose from "mongoose";
import dotenv from "dotenv";
import { City } from "../model/index.js";

dotenv.config();

const fixDelhi = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connected");

    const directUrl =
      "https://upload.wikimedia.org/wikipedia/commons/4/4b/India_Gate-Delhi_India11.JPG";

    const result = await City.updateOne(
      { city_name: "Delhi", is_active: true },
      { $set: { city_image: directUrl } }
    );

    console.log("Matched:", result.matchedCount, "Modified:", result.modifiedCount);
    console.log("New value:", directUrl);
    process.exit(0);
  } catch (err) {
    console.error("❌ Error:", err.message);
    process.exit(1);
  }
};

fixDelhi();
