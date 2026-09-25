/**
 * setupCityVisibility.js  -  one-time switch to the client's city rule:
 *
 *   APP   : members can pick ANY city  -> every city is "shown in app" (is_active)
 *   ADMIN : dropdowns show ONLY the preferred cities (is_preferred, starred
 *           in Admin > Manage Filters > Cities)
 *
 * Earlier, "Active" was used to limit everything to 4 cities, which also
 * hid the rest from members. This script:
 *   1. shows every (non-deleted) city in the app again,
 *   2. makes sure the preferred cities are set - if none are starred yet it
 *      stars Bangalore, Delhi, Goa and Mumbai,
 *   3. prints a summary.
 * Safe to run more than once.
 *
 * USAGE (on the server, in the Hii-Backend folder):
 *   node src/scripts/setupCityVisibility.js
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
import { City } from "../model/index.js";

dotenv.config();

const DEFAULT_PREFERRED = ["Bangalore", "Bengaluru", "Delhi", "New Delhi", "Goa", "Mumbai"];

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    const total = await City.countDocuments({ is_deleted: false });
    const shown = await City.updateMany(
      { is_deleted: false, is_active: { $ne: true } },
      { $set: { is_active: true } }
    );

    let preferredCount = await City.countDocuments({ is_deleted: false, is_preferred: true });
    if (preferredCount === 0) {
      await City.updateMany(
        { is_deleted: false, city_name: { $in: DEFAULT_PREFERRED.map((n) => new RegExp(`^${n}$`, "i")) } },
        { $set: { is_preferred: true } }
      );
      preferredCount = await City.countDocuments({ is_deleted: false, is_preferred: true });
    }
    const preferred = await City.find({ is_deleted: false, is_preferred: true })
      .select("city_name").sort({ city_name: 1 }).lean();

    console.log(`\nCities in database        : ${total}`);
    console.log(`Now shown in the app       : ${total}  (${shown.modifiedCount} were hidden before)`);
    console.log(`Preferred (admin dropdowns): ${preferredCount} -> ${preferred.map((c) => c.city_name).join(", ") || "none"}`);
    if (total < 20) {
      console.log("\nOnly a few cities exist. To add ~140 Indian cities run:");
      console.log("  node src/scripts/seedIndianStatesAndCities.js   (then run this script again)");
    }
    console.log("\nDone. Change preferred cities any time in Admin > Manage Filters > Cities (star icon).\n");
    process.exit(0);
  } catch (err) {
    console.error("Error:", err.message);
    process.exit(1);
  }
};

run();
