import mongoose from "mongoose";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";
import { City } from "../model/index.js";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.join(__dirname, "..", "..", "uploads");

const IMAGE_EXT = /\.(jpg|jpeg|png|webp)$/i;

const md5OfFile = (filePath) => {
  const buffer = fs.readFileSync(filePath);
  return crypto.createHash("md5").update(buffer).digest("hex");
};

const hashToIndex = (str, mod) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  return hash % mod;
};

const fixCityImages = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connected");

    // ---------------- Build a trustworthy city image pool ----------------
    // A file is only trusted if its CONTENT hash is unique among
    // city_image-* files. Files that are byte-identical to another
    // city_image-* file (like the car photo uploaded 8 separate times
    // under different filenames) are almost certainly a repeated test/
    // mistake upload, not 8 distinct real city photos - so they're
    // excluded entirely, regardless of filename.
    const cityFiles = fs
      .readdirSync(UPLOADS_DIR)
      .filter((f) => IMAGE_EXT.test(f) && f.toLowerCase().startsWith("city_image"));

    const hashCounts = {};
    const fileHashes = {};
    for (const file of cityFiles) {
      const hash = md5OfFile(path.join(UPLOADS_DIR, file));
      fileHashes[file] = hash;
      hashCounts[hash] = (hashCounts[hash] || 0) + 1;
    }

    const trustedPool = cityFiles.filter((f) => hashCounts[fileHashes[f]] === 1);
    const excludedPool = cityFiles.filter((f) => hashCounts[fileHashes[f]] > 1);

    console.log(`\nTotal city_image files found: ${cityFiles.length}`);
    console.log(`Trusted (content-unique) pool: ${trustedPool.length}`);
    console.log(`Excluded (duplicate content, likely test uploads): ${excludedPool.length}`);
    if (excludedPool.length > 0) {
      console.log("Excluded files:");
      excludedPool.forEach((f) => console.log(`   - ${f} (hash: ${fileHashes[f].slice(0, 8)}...)`));
    }

    if (trustedPool.length === 0) {
      console.warn("\n⚠️  No trustworthy city images found at all - nothing to assign. Upload some real, distinct city photos first.");
      process.exit(0);
    }

    const pickImage = (seed) => trustedPool[hashToIndex(seed, trustedPool.length)];

    // ---------------- Reassign every city currently pointing at an excluded file ----------------
    const allCities = await City.find({});
    const citiesToFix = allCities.filter((c) => {
      const current = (c.city_image || "").trim();
      if (!current) return true;
      // Needs fixing if it's not even a real city_image file we know about,
      // OR if it IS one but that file is in the excluded (duplicate) set.
      const hash = fileHashes[current];
      return hash === undefined || hashCounts[hash] > 1;
    });

    console.log(`\n📍 Cities needing a trustworthy image: ${citiesToFix.length} / ${allCities.length}`);
    for (const city of citiesToFix) {
      const newImage = pickImage(city.city_name || String(city._id));
      await City.updateOne({ _id: city._id }, { $set: { city_image: newImage } });
      console.log(`   🖼  ${city.city_name} (was: "${city.city_image}") -> ${newImage}`);
    }

    console.log("\n✅ Done. Every city image now comes from a content-verified, non-duplicated real photo.");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error fixing city images:", err.message);
    process.exit(1);
  }
};

fixCityImages();
