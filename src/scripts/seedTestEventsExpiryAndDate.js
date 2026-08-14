/**
 * seedTestEventsExpiryAndDate.js
 *
 * Seeds 10 fresh test events specifically to verify TWO things at once:
 *
 * 1. DATE DISPLAY: 8 of these events are clearly upcoming (after today,
 *    30 Jul 2026), each with a valid start_date/start_time/end_time, so
 *    you can confirm the "22nd Aug, Saturday"-style calendar row now
 *    actually appears on fresh events - ruling out "stale old test data
 *    never had start_date set" as the explanation if it still doesn't show.
 *
 * 2. EXPIRY HIDING: 2 of these events are deliberately dated in the PAST
 *    (before today), to verify the feed's expiry filter actually hides
 *    them:
 *        allEvents.filter(e => e.end_date >= today)
 *    in getHomeData (feedController.js). If these 2 show up in the app's
 *    Events feed, the filter isn't working. If they're invisible, it is.
 *    (They also won't show in the *admin* dashboard's event list either
 *    way, since that endpoint - getAllEvents - doesn't filter by expiry
 *    at all, a separate gap flagged earlier in this project.)
 *
 * Every event is clearly named "[TEST]" so they're easy to find and
 * delete afterward once you're done verifying.
 *
 * USAGE:
 *   node src/scripts/seedTestEventsExpiryAndDate.js
 *
 * To force a specific vendor to own these events:
 *   VENDOR_EMAIL=someone@example.com node src/scripts/seedTestEventsExpiryAndDate.js
 *
 * Safe to re-run - creates another batch each time (no dedup), so only
 * run it once per batch you actually want, and clean up test events when done:
 *   In mongosh: db.events.deleteMany({ venue_name: /^\[TEST\]/ })
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
  if (pool.length === 0) pool = files.filter((f) => f.toLowerCase().startsWith("gallery_images"));
  if (pool.length === 0) pool = files;
  return pool;
};

const pickImage = (pool, seed) => (pool.length ? pool[hashToIndex(seed, pool.length)] : "");
const pickGalleryImages = (pool, seed, count = 3) => {
  if (pool.length === 0) return [];
  const out = [];
  for (let i = 0; i < count; i++) out.push(pool[hashToIndex(`${seed}_${i}`, pool.length)]);
  return [...new Set(out)];
};

// Today is 30 Jul 2026 in this project's context.
const EVENT_TEMPLATES = [
  // ── EXPIRED (should be HIDDEN from the app feed) ──────────────────
  {
    venue_name: "[TEST] Expired - Rooftop Wrap Party",
    about: "This event's dates are in the past - it should NOT appear in the app's Events feed if expiry filtering is working correctly.",
    address: "Bandra, Mumbai, Maharashtra",
    start_date: "2026-07-15",
    end_date: "2026-07-15",
    start_time: "20:00",
    end_time: "23:00",
  },
  {
    venue_name: "[TEST] Expired - Midweek Karaoke",
    about: "Also in the past - a second expired test case for the same expiry check.",
    address: "Koramangala, Bangalore, Karnataka",
    start_date: "2026-07-22",
    end_date: "2026-07-22",
    start_time: "19:00",
    end_time: "22:00",
  },

  // ── UPCOMING (should show, WITH the calendar-icon date row) ───────
  {
    venue_name: "[TEST] Upcoming - Techno Warehouse",
    about: "Dated after today - should show up normally, with the new date row (e.g. '10th Aug, Monday').",
    address: "Lower Parel, Mumbai, Maharashtra",
    start_date: "2026-08-10",
    end_date: "2026-08-10",
    start_time: "22:00",
    end_time: "04:00",
  },
  {
    venue_name: "[TEST] Upcoming - Sunset Sundowner",
    about: "Another clean upcoming test event.",
    address: "Worli Sea Face, Mumbai, Maharashtra",
    start_date: "2026-08-12",
    end_date: "2026-08-12",
    start_time: "18:00",
    end_time: "22:00",
  },
  {
    venue_name: "[TEST] Upcoming - Ladies Night Live",
    about: "Upcoming test event in Bangalore.",
    address: "Indiranagar, Bangalore, Karnataka",
    start_date: "2026-08-14",
    end_date: "2026-08-14",
    start_time: "20:00",
    end_time: "01:00",
  },
  {
    venue_name: "[TEST] Upcoming - Beach Party",
    about: "Upcoming test event in Goa.",
    address: "Anjuna, Goa",
    start_date: "2026-08-16",
    end_date: "2026-08-16",
    start_time: "16:00",
    end_time: "23:00",
  },
  {
    venue_name: "[TEST] Upcoming - Comedy Night",
    about: "Upcoming test event in Delhi.",
    address: "Hauz Khas, New Delhi",
    start_date: "2026-08-18",
    end_date: "2026-08-18",
    start_time: "20:00",
    end_time: "22:30",
  },
  {
    venue_name: "[TEST] Upcoming - Bollywood Retro",
    about: "Upcoming test event, further out.",
    address: "Koregaon Park, Pune, Maharashtra",
    start_date: "2026-08-22",
    end_date: "2026-08-22",
    start_time: "21:00",
    end_time: "02:00",
  },
  {
    venue_name: "[TEST] Upcoming - Music Festival Day 1",
    about: "Multi-day upcoming test event, to also sanity-check is_multi_day handling.",
    address: "Vagator, Goa",
    start_date: "2026-08-28",
    end_date: "2026-08-29",
    start_time: "16:00",
    end_time: "04:00",
    is_multi_day: true,
  },
  {
    venue_name: "[TEST] Upcoming - After Party",
    about: "Furthest-out upcoming test event.",
    address: "Lower Parel, Mumbai, Maharashtra",
    start_date: "2026-09-05",
    end_date: "2026-09-05",
    start_time: "23:00",
    end_time: "05:00",
  },
];

const seedTestEvents = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connected");

    /* ============== RESOLVE VENDOR ============== */
    let vendor = null;
    if (process.env.VENDOR_EMAIL) {
      vendor = await Vendor.findOne({ email: process.env.VENDOR_EMAIL.toLowerCase(), is_deleted: false });
      if (!vendor) {
        console.error(`❌ No vendor found with email ${process.env.VENDOR_EMAIL}. Aborting.`);
        process.exit(1);
      }
    } else {
      vendor =
        (await Vendor.findOne({ vendor_type: "event_organizer", is_deleted: false, is_active: true })) ||
        (await Vendor.findOne({ is_deleted: false, is_active: true }));
    }
    if (!vendor) {
      console.error("❌ No active vendor found - at least one vendor must exist. Aborting.");
      process.exit(1);
    }
    console.log(`✅ Using vendor "${vendor.name}" (id: ${vendor._id})`);

    /* ============== RESOLVE CATEGORIES ============== */
    const categories = await Category.find({ category_type: 1, is_deleted: false, is_active: true });
    if (categories.length === 0) {
      console.error("❌ No active Event categories found. Aborting.");
      process.exit(1);
    }
    console.log(`✅ Found ${categories.length} event category(ies)`);

    /* ============== IMAGE POOL ============== */
    const imagePool = buildImagePool();
    console.log(
      imagePool.length
        ? `✅ Found ${imagePool.length} reusable image(s) in uploads/`
        : "⚠️  No images found in uploads/ - events will have empty venue_image"
    );

    /* ============== CREATE EVENTS ============== */
    const created = [];
    for (const t of EVENT_TEMPLATES) {
      const seed = t.venue_name;
      const catIndex = hashToIndex(seed, categories.length);
      const category_ids = [categories[catIndex]._id];
      if (categories.length > 1) category_ids.push(categories[(catIndex + 1) % categories.length]._id);

      const event = await Event.create({
        vendor_id: vendor._id,
        venue_name: t.venue_name,
        venue_image: pickImage(imagePool, seed),
        category_ids,
        start_time: t.start_time,
        end_time: t.end_time,
        address: t.address,
        latitude: 19.0760,
        longitude: 72.8777,
        start_date: t.start_date,
        end_date: t.end_date,
        is_multi_day: !!t.is_multi_day,
        about: t.about,
        gallery_images: pickGalleryImages(imagePool, seed, 3),
        artists: [],
        event_layout_images: [],
        terms_and_conditions: [],
        faqs: [],
        prohibited_items: [],
        is_active: true,
        is_deleted: false,
      });

      created.push(event);
      const isExpired = t.end_date < "2026-07-30";
      console.log(
        `✅ Created "${event.venue_name}" - ${t.start_date} to ${t.end_date}  ${isExpired ? "⚠️  EXPIRED (should be hidden)" : "✓ upcoming (should show + have date row)"}`
      );
    }

    console.log("\n──────────── SUMMARY ────────────");
    console.log(`Created: ${created.length} test event(s)`);
    console.log(`  - 2 expired (should NOT appear in app feed)`);
    console.log(`  - 8 upcoming (should appear WITH the calendar date row)`);
    console.log("\nTo clean these up later, in mongosh:");
    console.log(`  db.events.deleteMany({ venue_name: /^\\[TEST\\]/ })`);
    console.log("──────────────────────────────────\n");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding test events:", error);
    process.exit(1);
  }
};

seedTestEvents();