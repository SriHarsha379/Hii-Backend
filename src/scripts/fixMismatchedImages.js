import mongoose from "mongoose";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { City, Genre } from "../model/index.js";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.join(__dirname, "..", "..", "uploads");

const IMAGE_EXT = /\.(jpg|jpeg|png|webp)$/i;

const hashToIndex = (str, mod) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  return hash % mod;
};

const listByPrefix = (prefix) =>
  fs.readdirSync(UPLOADS_DIR).filter(
    (f) => IMAGE_EXT.test(f) && f.toLowerCase().startsWith(prefix)
  );

// Strictly scoped, thematically-correct pools only - NO generic "image-"/
// "images-" fallback this time, since that generic pool is what let an
// unrelated car photo slip onto a music genre / city card.
const cityPool = listByPrefix("city_image");
// Genres get pulled from real venue/nightlife photography (gallery shots
// from actual venues), which is at least thematically in the right universe
// - unlike a random car photo. Still not a perfect per-genre match, but
// nothing here can be wildly out of place the way the generic pool was.
const genrePool = [...listByPrefix("venue_image"), ...listByPrefix("gallery_images")];

const pickImage = (pool, seed) => pool[hashToIndex(seed, pool.length)];

// Anything NOT matching these prefixes is suspect - it came from somewhere
// outside the properly-categorized pools (e.g. the generic upload bucket
// that includes profile pics, ads, chat attachments, or in this case, a car
// photo) and should be replaced regardless of whether it "looks like an
// image" - it's the wrong category of image.
const isProperlyScoped = (value, allowedPrefixes) => {
  if (!value) return false;
  const lower = String(value).trim().toLowerCase();
  return allowedPrefixes.some((p) => lower.startsWith(p));
};

const fixMismatchedImages = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connected");
    console.log(`City pool: ${cityPool.length} real city photos`);
    console.log(`Genre pool: ${genrePool.length} real venue/gallery photos`);

    // ---------------- Cities ----------------
    const allCities = await City.find({});
    const citiesToFix = allCities.filter(
      (c) => !isProperlyScoped(c.city_image, ["city_image"])
    );
    console.log(`\n📍 Cities with a mismatched image: ${citiesToFix.length} / ${allCities.length}`);
    for (const city of citiesToFix) {
      const newImage = pickImage(cityPool, city.city_name || String(city._id));
      await City.updateOne({ _id: city._id }, { $set: { city_image: newImage } });
      console.log(`   🖼  ${city.city_name} (was: "${city.city_image}") -> ${newImage}`);
    }

    // ---------------- Genres ----------------
    const allGenres = await Genre.find({});
    const genresToFix = allGenres.filter(
      (g) => !isProperlyScoped(g.image, ["venue_image", "gallery_images"])
    );
    console.log(`\n🎵 Genres with a mismatched image: ${genresToFix.length} / ${allGenres.length}`);
    for (const genre of genresToFix) {
      const newImage = pickImage(genrePool, genre.name || String(genre._id));
      await Genre.updateOne({ _id: genre._id }, { $set: { image: newImage } });
      console.log(`   🖼  ${genre.name} (was: "${genre.image}") -> ${newImage}`);
    }

    console.log("\n✅ Done. Every city/genre image now comes strictly from its correct category.");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error fixing images:", err.message);
    process.exit(1);
  }
};

fixMismatchedImages();
