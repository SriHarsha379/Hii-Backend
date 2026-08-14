import mongoose from "mongoose";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { City, Genre, Event } from "../model/index.js";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.join(__dirname, "..", "..", "uploads");

const isMissing = (val) => {
  if (val === null || val === undefined) return true;
  const normalized = String(val).trim().toLowerCase();
  if (normalized === "") return true;
  // Catch known placeholder values sitting in legacy data that aren't
  // real files on the server (these all 404 in the app).
  const placeholders = ["default.png", "default.jpg", "default.jpeg", "na", "n/a", "null", "undefined"];
  if (placeholders.includes(normalized)) return true;
  if (normalized.includes("default") || normalized.includes("dummy") || normalized.includes("placeholder")) return true;
  // Cleanup: an earlier attempt wrote picsum.photos placeholder URLs into
  // some records before we switched strategies. Treat those as "missing"
  // too so this run replaces them with real, locally-hosted files.
  if (normalized.includes("picsum.photos")) return true;
  return false;
};

// Simple deterministic hash so the same name always picks the same image
// (stable across re-runs instead of shuffling on every execution).
const hashToIndex = (str, mod) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  return hash % mod;
};

const IMAGE_EXT = /\.(jpg|jpeg|png|webp)$/i;

const buildImagePool = (prefix, fallbackPrefixes = []) => {
  const files = fs.readdirSync(UPLOADS_DIR).filter((f) => IMAGE_EXT.test(f));
  let pool = files.filter((f) => f.toLowerCase().startsWith(prefix));
  if (pool.length === 0) {
    for (const fp of fallbackPrefixes) {
      pool = files.filter((f) => f.toLowerCase().startsWith(fp));
      if (pool.length > 0) break;
    }
  }
  if (pool.length === 0) pool = files; // last resort: any real uploaded image
  return pool;
};

const pickImage = (pool, seed) => pool[hashToIndex(seed, pool.length)];

const seedMissingImages = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connected");

    const cityPool = buildImagePool("city_image", ["image", "images"]);
    const venuePool = buildImagePool("venue_image", ["gallery_images", "image"]);
    const genrePool = buildImagePool("image", ["images", "gallery_images"]);

    console.log(`\nUsing ${cityPool.length} real city images, ${venuePool.length} real venue images, ${genrePool.length} real generic images as the reuse pool.`);

    // ---------------- 1) Cities missing/placeholder city_image ----------------
    const allCities = await City.find({});
    const citiesMissing = allCities.filter((c) => isMissing(c.city_image));
    console.log(`\n📍 Cities without a real image: ${citiesMissing.length} / ${allCities.length}`);
    for (const city of citiesMissing) {
      const newImage = pickImage(cityPool, city.city_name || String(city._id));
      await City.updateOne({ _id: city._id }, { $set: { city_image: newImage } });
      console.log(`   🖼  ${city.city_name} (was: "${city.city_image}") -> ${newImage}`);
    }

    // ---------------- 2) Genres missing/placeholder image ----------------
    const allGenres = await Genre.find({});
    const genresMissing = allGenres.filter((g) => isMissing(g.image));
    console.log(`\n🎵 Genres without a real image: ${genresMissing.length} / ${allGenres.length}`);
    for (const genre of genresMissing) {
      const newImage = pickImage(genrePool, genre.name || String(genre._id));
      await Genre.updateOne({ _id: genre._id }, { $set: { image: newImage } });
      console.log(`   🖼  ${genre.name} (was: "${genre.image}") -> ${newImage}`);
    }

    // ---------------- 3) Events missing/placeholder venue_image / gallery_images ----------------
    const allEvents = await Event.find({});
    const eventsMissing = allEvents.filter(
      (e) =>
        isMissing(e.venue_image) ||
        !e.gallery_images ||
        e.gallery_images.length === 0 ||
        e.gallery_images.every((g) => isMissing(g))
    );
    console.log(`\n🎉 Events without a real image: ${eventsMissing.length} / ${allEvents.length}`);
    for (const event of eventsMissing) {
      const newVenueImage = isMissing(event.venue_image)
        ? pickImage(venuePool, event.venue_name || String(event._id))
        : event.venue_image;
      const newGallery =
        !event.gallery_images ||
        event.gallery_images.length === 0 ||
        event.gallery_images.every((g) => isMissing(g))
          ? [newVenueImage]
          : event.gallery_images;

      await Event.updateOne(
        { _id: event._id },
        { $set: { venue_image: newVenueImage, gallery_images: newGallery } }
      );
      console.log(`   🖼  ${event.venue_name} (was: "${event.venue_image}") -> ${newVenueImage}`);
    }

    console.log("\n✅ Done. All missing images now point to real files already on your server.");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error seeding images:", err.message);
    process.exit(1);
  }
};

seedMissingImages();