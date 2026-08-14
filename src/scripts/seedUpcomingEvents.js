/**
 * seedUpcomingEvents.js
 *
 * One-off script to seed ~10 sample events dated after 10 Aug 2026, spread
 * across 5 cities (Mumbai, Delhi, Bangalore, Pune, Indore), so city-switching
 * can be tested with fresh, non-expired events in each city.
 *
 * WHY THE OLD EVENTS LOOK "EXPIRED":
 * The app's feed (feedController.js) filters events with:
 *     allEvents.filter(e => e.end_date >= today)
 * where `today` is computed as new Date().toLocaleDateString("en-CA", ...),
 * giving a "YYYY-MM-DD" string, and end_date on the Event model is ALSO a
 * plain "YYYY-MM-DD" string (not a real Date). String comparison only works
 * correctly if both sides use that exact zero-padded format - this script
 * follows that same convention for every date it writes.
 *
 * WHAT THIS SCRIPT DOES:
 * 1. Connects to MongoDB using MONGO_URI from your .env (same as every
 *    other script in src/scripts/).
 * 2. Looks up the City documents for Mumbai, Delhi, Bangalore, Pune, and
 *    Indore by name (case-insensitive). If any of these don't already
 *    exist in your City collection, that city is skipped and logged - this
 *    script does NOT create new cities, only new events under existing ones.
 * 3. Picks an existing Vendor to own these events (prefers an
 *    'event_organizer' vendor if one exists, otherwise falls back to any
 *    active vendor). You can also force a specific vendor via the
 *    VENDOR_EMAIL env var (see USAGE below).
 * 4. Picks existing Event categories (category_type: 1) to attach.
 * 5. Reuses REAL image filenames already sitting in your uploads/ folder
 *    (same "venue_image" prefix convention used by seedMissingImages.js /
 *    fixMismatchedImages.js) - so nothing points at a broken/missing file.
 * 6. Creates 10 events (2 per city), each dated after 10 Aug 2026, with
 *    varied names/times/categories, and prints a summary at the end.
 *
 * USAGE:
 *   node src/scripts/seedUpcomingEvents.js
 *
 * To force a specific vendor to own these events instead of an
 * auto-picked one:
 *   VENDOR_EMAIL=someone@example.com node src/scripts/seedUpcomingEvents.js
 *
 * This script is safe to re-run - re-running it will simply create another
 * batch of 10 events (it does not check for/skip duplicates), so only run
 * it once per batch you actually want.
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { City, Vendor, Category, Event } from "../model/index.js";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.join(__dirname, "..", "..", "uploads");

const IMAGE_EXT = /\.(jpg|jpeg|png|webp)$/i;

const hashToIndex = (str, mod) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  return mod > 0 ? hash % mod : 0;
};

const buildImagePool = () => {
  if (!fs.existsSync(UPLOADS_DIR)) return [];
  const files = fs.readdirSync(UPLOADS_DIR).filter((f) => IMAGE_EXT.test(f));
  let pool = files.filter((f) => f.toLowerCase().startsWith("venue_image"));
  if (pool.length === 0) {
    pool = files.filter((f) => f.toLowerCase().startsWith("gallery_images"));
  }
  if (pool.length === 0) pool = files; // last resort: any real uploaded image
  return pool;
};

const pickImage = (pool, seed) =>
  pool.length ? pool[hashToIndex(seed, pool.length)] : "";

const pickGalleryImages = (pool, seed, count = 3) => {
  if (pool.length === 0) return [];
  const out = [];
  for (let i = 0; i < count; i++) {
    out.push(pool[hashToIndex(`${seed}_${i}`, pool.length)]);
  }
  return [...new Set(out)];
};

// City center coordinates, with a small deterministic jitter per event so
// multiple events in the same city don't sit on the exact same pin.
const CITY_COORDS = {
  mumbai: { latitude: 19.076, longitude: 72.8777 },
  delhi: { latitude: 28.7041, longitude: 77.1025 },
  bangalore: { latitude: 12.9716, longitude: 77.5946 },
  pune: { latitude: 18.5204, longitude: 73.8567 },
  indore: { latitude: 22.7196, longitude: 75.8577 },
};

const jitter = (value, seed) => {
  const offset = ((hashToIndex(seed, 200) - 100) / 100) * 0.03; // +/- ~0.03 deg
  return Number((value + offset).toFixed(6));
};

// 10 events: 2 per city, all dated after 10 Aug 2026.
const EVENT_TEMPLATES = [
  {
    city: "mumbai",
    venue_name: "Rooftop Sundowner Sessions",
    about:
      "Catch the sunset over the city skyline with deep house beats, curated cocktails, and a relaxed rooftop crowd.",
    address: "Bandra Kurla Complex, Mumbai, Maharashtra",
    start_date: "2026-08-12",
    start_time: "18:00",
    end_time: "23:00",
  },
  {
    city: "mumbai",
    venue_name: "Techno Underground Night",
    about:
      "A late-night warehouse rave with underground techno DJs, immersive lighting, and a no-phones-on-the-floor policy.",
    address: "Lower Parel, Mumbai, Maharashtra",
    start_date: "2026-08-22",
    start_time: "22:00",
    end_time: "04:00",
  },
  {
    city: "delhi",
    venue_name: "Bollywood Retro Night",
    about:
      "Old-school Bollywood anthems, retro decor, and a dance floor that doesn't stop moving till the lights come on.",
    address: "Hauz Khas Village, New Delhi",
    start_date: "2026-08-14",
    start_time: "20:00",
    end_time: "01:00",
  },
  {
    city: "delhi",
    venue_name: "Progressive House Sessions",
    about:
      "Deep, melodic progressive house all night, headlined by a rotating lineup of local and touring DJs.",
    address: "Connaught Place, New Delhi",
    start_date: "2026-08-24",
    start_time: "21:00",
    end_time: "02:00",
  },
  {
    city: "bangalore",
    venue_name: "Garden Sundowner Sessions",
    about:
      "Relax in a lush garden setting with acoustic sets, craft cocktails, and golden hour vibes.",
    address: "Cubbon Park Road, Bengaluru, Karnataka",
    start_date: "2026-08-16",
    start_time: "17:00",
    end_time: "21:00",
  },
  {
    city: "bangalore",
    venue_name: "Silent Disco Experience",
    about:
      "Three DJs, three channels, one dance floor - pick your beat on wireless headphones and dance your way.",
    address: "Indiranagar, Bengaluru, Karnataka",
    start_date: "2026-08-26",
    start_time: "20:00",
    end_time: "00:00",
  },
  {
    city: "pune",
    venue_name: "Jazz & Whiskey Evening",
    about:
      "An intimate live jazz set paired with a curated whiskey tasting menu in a low-lit lounge setting.",
    address: "Koregaon Park, Pune, Maharashtra",
    start_date: "2026-08-18",
    start_time: "19:00",
    end_time: "23:00",
  },
  {
    city: "pune",
    venue_name: "EDM Warehouse Rave",
    about:
      "Big-room EDM, a full production stage, and a warehouse crowd that comes ready to lose it.",
    address: "Viman Nagar, Pune, Maharashtra",
    start_date: "2026-08-28",
    start_time: "21:00",
    end_time: "03:00",
  },
  {
    city: "indore",
    venue_name: "Acoustic Open Mic Night",
    about:
      "Local singer-songwriters take the stage for an unplugged evening of original music and covers.",
    address: "Vijay Nagar, Indore, Madhya Pradesh",
    start_date: "2026-08-20",
    start_time: "19:30",
    end_time: "22:30",
  },
  {
    city: "indore",
    venue_name: "Salsa & Sangria Night",
    about:
      "Live salsa band, a quick beginner-friendly lesson at the start, and sangria all night long.",
    address: "Sapna Sangeeta Road, Indore, Madhya Pradesh",
    start_date: "2026-08-30",
    start_time: "20:00",
    end_time: "00:30",
  },
];

const seedUpcomingEvents = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connected");

    /* ============== RESOLVE CITIES ============== */
    const cityNames = ["mumbai", "delhi", "bangalore", "pune", "indore"];
    const cityDocs = {};
    for (const name of cityNames) {
      const doc = await City.findOne({
        city_name: { $regex: new RegExp(`^${name}$`, "i") },
        is_deleted: false,
      });
      if (doc) {
        cityDocs[name] = doc;
        console.log(`✅ Found city "${doc.city_name}" (id: ${doc._id})`);
      } else {
        console.warn(
          `⚠️  City "${name}" not found in City collection - events for this city will be skipped.`
        );
      }
    }

    /* ============== RESOLVE VENDOR ============== */
    let vendor = null;
    if (process.env.VENDOR_EMAIL) {
      vendor = await Vendor.findOne({
        email: process.env.VENDOR_EMAIL.toLowerCase(),
        is_deleted: false,
      });
      if (!vendor) {
        console.error(
          `❌ No vendor found with email ${process.env.VENDOR_EMAIL}. Aborting.`
        );
        process.exit(1);
      }
    } else {
      vendor =
        (await Vendor.findOne({
          vendor_type: "event_organizer",
          is_deleted: false,
          is_active: true,
        })) ||
        (await Vendor.findOne({ is_deleted: false, is_active: true }));
    }

    if (!vendor) {
      console.error(
        "❌ No active vendor found in the Vendor collection - at least one vendor must exist to own these events. Aborting."
      );
      process.exit(1);
    }
    console.log(`✅ Using vendor "${vendor.name}" (id: ${vendor._id}) as event owner`);

    /* ============== RESOLVE CATEGORIES ============== */
    const categories = await Category.find({
      category_type: 1, // 1 = Event
      is_deleted: false,
      is_active: true,
    });

    if (categories.length === 0) {
      console.error(
        "❌ No active Event categories (category_type: 1) found. At least one is required for category_ids. Aborting."
      );
      process.exit(1);
    }
    console.log(`✅ Found ${categories.length} event category(ies) to draw from`);

    /* ============== IMAGE POOL ============== */
    const imagePool = buildImagePool();
    if (imagePool.length === 0) {
      console.warn(
        "⚠️  No existing images found in uploads/ - events will be created with an empty venue_image. You'll want to add images via the admin dashboard afterward."
      );
    } else {
      console.log(`✅ Found ${imagePool.length} reusable image(s) in uploads/`);
    }

    /* ============== CREATE EVENTS ============== */
    const created = [];
    const skipped = [];

    for (const template of EVENT_TEMPLATES) {
      const cityDoc = cityDocs[template.city];
      if (!cityDoc) {
        skipped.push(template.venue_name);
        continue;
      }

      const coords = CITY_COORDS[template.city];
      const seed = `${template.city}_${template.venue_name}`;

      // Rotate through available categories, picking 1-2 per event.
      const catIndex = hashToIndex(seed, categories.length);
      const category_ids = [categories[catIndex]._id];
      if (categories.length > 1) {
        const secondIndex = (catIndex + 1) % categories.length;
        category_ids.push(categories[secondIndex]._id);
      }

      const venue_image = pickImage(imagePool, seed);
      const gallery_images = pickGalleryImages(imagePool, seed, 3);

      const event = await Event.create({
        vendor_id: vendor._id,
        venue_name: template.venue_name,
        venue_image,
        city_id: cityDoc._id,
        category_ids,
        start_time: template.start_time,
        end_time: template.end_time,
        address: template.address,
        latitude: jitter(coords.latitude, seed),
        longitude: jitter(coords.longitude, `${seed}_lng`),
        start_date: template.start_date,
        end_date: template.start_date, // single-day events
        is_multi_day: false,
        about: template.about,
        gallery_images,
        artists: [],
        event_layout_images: [],
        terms_and_conditions: [],
        faqs: [],
        prohibited_items: [],
        is_active: true,
        is_deleted: false,
      });

      created.push(event);
      console.log(
        `✅ Created "${event.venue_name}" in ${cityDoc.city_name} on ${event.start_date} (id: ${event._id})`
      );
    }

    /* ============== SUMMARY ============== */
    console.log("\n──────────── SUMMARY ────────────");
    console.log(`Created: ${created.length} event(s)`);
    if (skipped.length) {
      console.log(
        `Skipped (city not found): ${skipped.length} - ${skipped.join(", ")}`
      );
    }
    console.log("──────────────────────────────────\n");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding events:", error);
    process.exit(1);
  }
};

seedUpcomingEvents();