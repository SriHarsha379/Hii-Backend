import mongoose from "mongoose";
import dotenv from "dotenv";
import { City } from "../model/index.js";

dotenv.config();

/**
 * One recognizable, real landmark photo per city, sourced from Wikimedia
 * Commons (public-domain / Creative-Commons licensed - safe to use, unlike
 * random stock photography). Uses Commons' Special:FilePath, a stable,
 * documented direct-link format designed exactly for this kind of reuse.
 *
 * For cities where a real photo already exists locally in /uploads and was
 * confirmed correct (Indore, Jaipur, Mumbai), we keep using that instead of
 * duplicating effort.
 *
 * STILL NEEDED: Goa, Noida, Pune, Uttarkashi, Visakhapatnam - not in this
 * map yet, so this script leaves those untouched. Run again once those are
 * added below.
 */
const wikimediaFilePath = (filename) =>
  `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(filename)}`;

const CITY_IMAGE_MAP = {
  bangalore: wikimediaFilePath("Vidhana Souda , Bangalore.jpg"),
  bhopal: wikimediaFilePath("Taj-ul-masajid.jpg"),
  delhi: wikimediaFilePath("India Gate-Delhi India11.JPG"),
  hyderabad: wikimediaFilePath("Charminar, Hyderabad 01.jpg"),
  // These three already have a confirmed-good real photo sitting locally -
  // keep using that (bare filename, matches existing /uploads convention).
  indore: "city_image-1770198544619-821447227.jpg",
  jaipur: "city_image-1770199288991-515206836.webp",
  mumbai: "city_image-1770199696193-50488703.jpg",
};

const fixCityImages = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connected");

    const allCities = await City.find({ is_active: true, is_deleted: false });
    console.log(`\nActive cities in DB: ${allCities.length}`);

    const stillNeeded = [];
    for (const city of allCities) {
      const key = city.city_name.trim().toLowerCase();
      const newImage = CITY_IMAGE_MAP[key];
      if (!newImage) {
        stillNeeded.push(city.city_name);
        continue;
      }
      await City.updateOne({ _id: city._id }, { $set: { city_image: newImage } });
      console.log(`   🖼  ${city.city_name} -> ${newImage}`);
    }

    if (stillNeeded.length > 0) {
      console.log(`\n⚠️  Still need a landmark photo for: ${stillNeeded.join(", ")}`);
      console.log("   These were left untouched (not reset to anything broken).");
    }

    console.log("\n✅ Done with the cities that have a mapped landmark photo.");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error fixing city images:", err.message);
    process.exit(1);
  }
};

fixCityImages();
