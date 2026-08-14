/**
 * addCityPlaceholderImages.js
 *
 * One-off script to add a placeholder image URL to every City document
 * that doesn't already have one (city_image is null/empty) - covers the
 * ~142 cities seeded by seedIndianStatesAndCities.js, which didn't set
 * any image.
 *
 * WHY PICSUM (not Unsplash Source):
 * Unsplash's old "source.unsplash.com" random-image redirect service has
 * been shut down, and hand-picking a specific real Unsplash photo ID per
 * city risks pointing at photos that get taken down or changed later.
 * https://picsum.photos is a well-established, still-actively-maintained
 * public placeholder image service (real photos, not AI-generated) with
 * DETERMINISTIC seeded URLs - the same seed always returns the same
 * photo, forever, so each city gets a distinct, stable-looking image
 * rather than a random one changing on every request.
 *
 * FLUTTER COMPATIBILITY - VERIFIED, NO APP CHANGES NEEDED:
 * getCityImageUrl() in city_preference.dart already does:
 *     if (imagePath.startsWith('http')) return imagePath;
 * so a full https:// URL here is passed straight through to Image.network
 * - only bare filenames get the local-upload base URL prefix. Confirmed
 * by reading that function directly before writing this script.
 *
 * SAFE TO RE-RUN:
 * Only touches cities where city_image is currently null/empty - any
 * city that already has a real uploaded image (via the admin panel) is
 * left untouched.
 *
 * USAGE:
 *   node src/scripts/addCityPlaceholderImages.js
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import { City } from "../model/index.js";

dotenv.config();

const slugify = (name) =>
  name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const addCityPlaceholderImages = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connected");

    const cities = await City.find({
      is_deleted: false,
      $or: [
        { city_image: null },
        { city_image: "" },
        { city_image: { $exists: false } },
      ],
    });

    if (cities.length === 0) {
      console.log("✅ Every city already has an image - nothing to do.");
      process.exit(0);
    }

    console.log(`Found ${cities.length} city(ies) without an image. Adding placeholders...\n`);

    let updated = 0;
    for (const city of cities) {
      const seed = slugify(city.city_name);
      const placeholderUrl = `https://picsum.photos/seed/${seed}/800/600`;

      await City.updateOne(
        { _id: city._id },
        { $set: { city_image: placeholderUrl } }
      );
      updated++;
      console.log(`✅ ${city.city_name} -> ${placeholderUrl}`);
    }

    console.log("\n──────────── SUMMARY ────────────");
    console.log(`Updated: ${updated} city(ies)`);
    console.log("──────────────────────────────────\n");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error adding city placeholder images:", error);
    process.exit(1);
  }
};

addCityPlaceholderImages();