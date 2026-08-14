/**
 * seedEventTypeCategories.js
 *
 * One-off script to ensure a specific list of Event-type categories
 * (category_type: 1) exist, without creating duplicates. Checks each
 * name case-insensitively against what's already in the database before
 * creating anything - existing categories are left untouched.
 *
 * USAGE:
 *   node src/scripts/seedEventTypeCategories.js
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import { Category } from "../model/index.js";

dotenv.config();

const EVENT_TYPES = [
  "DJ Night",
  "Live Music",
  "Ladies Night",
  "Guest DJ",
  "Techno",
  "House Music",
  "Bollywood",
  "Hip-Hop",
  "Commercial",
  "Sundowner",
  "Rooftop Party",
  "Beach Party",
  "Pool Party",
  "Brunch Party",
  "Happy Hours",
  "Karaoke",
  "Stand-up Comedy",
  "Sports Screening",
  "Music Festival",
  "After Party",
  "Trance",
];

const seedEventTypeCategories = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connected");

    let created = 0;
    let alreadyExisted = 0;
    const alreadyExistedNames = [];

    for (const name of EVENT_TYPES) {
      const existing = await Category.findOne({
        category_name: { $regex: new RegExp(`^${name}$`, "i") },
        category_type: 1,
      });

      if (existing) {
        alreadyExisted++;
        alreadyExistedNames.push(name);
        continue;
      }

      await Category.create({
        category_name: name,
        category_type: 1,
        is_active: true,
        is_deleted: false,
      });
      created++;
      console.log(`✅ Created event type "${name}"`);
    }

    console.log("\n──────────── SUMMARY ────────────");
    console.log(`Created: ${created}`);
    console.log(`Already existed: ${alreadyExisted}${alreadyExistedNames.length ? " (" + alreadyExistedNames.join(", ") + ")" : ""}`);
    console.log("──────────────────────────────────\n");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding event type categories:", error);
    process.exit(1);
  }
};

seedEventTypeCategories();