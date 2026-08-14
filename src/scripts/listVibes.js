import mongoose from "mongoose";
import dotenv from "dotenv";
import Vibe from "../model/vibeModel.js";

dotenv.config();

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI || process.env.DB_URI);
  const vibes = await Vibe.find({ is_deleted: false }).lean();
  console.log(JSON.stringify(vibes, null, 2));
  await mongoose.disconnect();
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
