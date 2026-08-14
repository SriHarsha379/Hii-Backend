/**
 * seedEventsTillDec2026.js
 *
 * Seeds 10 FULLY-POPULATED events spread from Sep 2026 through Dec 2026,
 * across 5 cities (Mumbai, Delhi, Bangalore, Pune, Indore) - 2 per city.
 *
 * WHY THE EXISTING EVENTS SHOW AS EXPIRED:
 * feedController.js filters with `allEvents.filter(e => e.end_date >= today)`
 * where `today` is a "YYYY-MM-DD" string from toLocaleDateString("en-CA").
 * end_date on the Event model is ALSO a plain string, so this is a STRING
 * comparison - it only behaves correctly with zero-padded YYYY-MM-DD. Every
 * date written by this script follows that exact format.
 *
 * WHAT MAKES THIS DIFFERENT FROM seedUpcomingEvents.js:
 * That script left artists, faqs, terms_and_conditions, prohibited_items and
 * event_layout_images as empty arrays. This one fills EVERY field on the
 * Event schema, and additionally creates Ticket documents per event (2-3
 * tiers each) so booking/detail screens have real data to render.
 *
 * IMAGES:
 * Default mode is "auto":
 *   - if real files exist in uploads/, they're reused (venue_image* prefix,
 *     same convention as seedMissingImages.js / fixMismatchedImages.js)
 *   - otherwise falls back to deterministic https://picsum.photos seeded URLs
 * Full https URLs are safe: every getImageUrl() helper in the Flutter app
 * (city_preference.dart, venues_details_controller.dart, home_Screen.dart,
 * event_booking_details_controller.dart, etc.) does
 *     if (path.startsWith('http')) return path;
 * before prefixing the local uploads base URL. Verified by reading them.
 *
 * Force a mode:
 *   IMAGE_MODE=uploads  -> only reuse local uploads (empty string if none)
 *   IMAGE_MODE=remote   -> always use picsum URLs
 *
 * USAGE:
 *   node src/scripts/seedEventsTillDec2026.js
 *   VENDOR_EMAIL=someone@example.com node src/scripts/seedEventsTillDec2026.js
 *   IMAGE_MODE=remote node src/scripts/seedEventsTillDec2026.js
 *   DRY_RUN=1 node src/scripts/seedEventsTillDec2026.js   (log only, write nothing)
 *
 * IDEMPOTENT: before creating, it checks for an existing non-deleted event
 * with the same venue_name + start_date and skips it. Safe to re-run.
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { City, Vendor, Category, Event, Ticket } from "../model/index.js";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.join(__dirname, "..", "..", "uploads");
const IMAGE_EXT = /\.(jpg|jpeg|png|webp)$/i;

const IMAGE_MODE = (process.env.IMAGE_MODE || "auto").toLowerCase();
const DRY_RUN = process.env.DRY_RUN === "1";

/* ============================================================
 * DETERMINISTIC HELPERS
 * ============================================================ */

const hashToIndex = (str, mod) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  return mod > 0 ? hash % mod : 0;
};

const buildImagePool = () => {
  if (IMAGE_MODE === "remote") return [];
  if (!fs.existsSync(UPLOADS_DIR)) return [];
  const files = fs.readdirSync(UPLOADS_DIR).filter((f) => IMAGE_EXT.test(f));
  let pool = files.filter((f) => f.toLowerCase().startsWith("venue_image"));
  if (pool.length === 0) pool = files.filter((f) => f.toLowerCase().startsWith("gallery_images"));
  if (pool.length === 0) pool = files;
  return pool;
};

// picsum seeded URLs are stable forever for a given seed
const remoteImage = (seed, w = 1200, h = 800) =>
  `https://picsum.photos/seed/${encodeURIComponent(seed)}/${w}/${h}`;

const pickImage = (pool, seed, w, h) => {
  if (pool.length) return pool[hashToIndex(seed, pool.length)];
  if (IMAGE_MODE === "uploads") return "";
  return remoteImage(seed, w, h);
};

const pickGalleryImages = (pool, seed, count = 4) => {
  const out = [];
  for (let i = 0; i < count; i++) out.push(pickImage(pool, `${seed}_g${i}`, 1200, 800));
  return [...new Set(out.filter(Boolean))];
};

const CITY_COORDS = {
  mumbai: { latitude: 19.076, longitude: 72.8777 },
  delhi: { latitude: 28.7041, longitude: 77.1025 },
  bangalore: { latitude: 12.9716, longitude: 77.5946 },
  pune: { latitude: 18.5204, longitude: 73.8567 },
  indore: { latitude: 22.7196, longitude: 75.8577 },
};

const jitter = (value, seed) => {
  const offset = ((hashToIndex(seed, 200) - 100) / 100) * 0.03; // ~ +/- 0.03 deg
  return Number((value + offset).toFixed(6));
};

/* ============================================================
 * SHARED CONTENT (T&C / prohibited / faqs)
 * ============================================================ */

const BASE_TERMS = [
  "Entry strictly for guests aged 21 years and above. Valid government-issued photo ID is mandatory.",
  "Tickets once purchased are non-refundable and non-transferable.",
  "Right of admission reserved by the venue management.",
  "Please carry a digital or printed copy of your ticket QR code for entry.",
  "Management is not responsible for any lost or stolen personal belongings.",
  "Re-entry is not permitted once you exit the venue.",
];

const BASE_PROHIBITED = [
  "Outside food and beverages",
  "Professional cameras and recording equipment",
  "Weapons of any kind",
  "Illegal substances",
  "Fireworks, flares and laser pointers",
  "Pets (service animals permitted)",
];

const baseFaqs = (name, startTime, address) => [
  {
    question: "What time should I arrive?",
    answer: `Doors open at ${startTime}. We recommend arriving within the first hour to avoid queues at the entry gate.`,
  },
  {
    question: "Is there parking available at the venue?",
    answer: "Paid valet and limited self-parking are available on site. Cabs and ride-share drop-offs are recommended on peak nights.",
  },
  {
    question: "Can I get a refund if I can't attend?",
    answer: "Tickets are non-refundable. However, in the rare case the event is cancelled by the organiser, the full amount is refunded to your original payment method within 7 working days.",
  },
  {
    question: "Is there a dress code?",
    answer: "Smart casual. Sportswear, shorts and open footwear may be denied entry at the door.",
  },
  {
    question: "Where exactly is the venue?",
    answer: `${name} is hosted at ${address}. Tap the map on this page for turn-by-turn directions.`,
  },
];

/* ============================================================
 * 10 EVENTS - Sep 2026 through Dec 2026, 2 per city
 * ============================================================ */

const EVENT_TEMPLATES = [
  {
    city: "mumbai",
    venue_name: "Monsoon Rooftop Closing Party",
    about:
      "Say goodbye to the monsoon from 21 floors up. Deep house and melodic techno across two rooms, a wraparound terrace looking over the skyline, and a cocktail menu built around the season. Limited capacity, so the floor stays comfortable all night.",
    address: "Level 21, One BKC, Bandra Kurla Complex, Mumbai, Maharashtra 400051",
    start_date: "2026-09-12",
    end_date: "2026-09-12",
    start_time: "18:30",
    end_time: "01:00",
    artists: [
      { name: "Anish Sood", title: "DJ", subtitle: "Progressive House" },
      { name: "Kohra", title: "DJ", subtitle: "Melodic Techno" },
    ],
    tickets: [
      { title: "Early Bird", ticket_price: 799, total_tickets: 200, sold_tickets: 160, description: "Limited early-bird entry. Includes venue access only." },
      { title: "General Admission", ticket_price: 1299, total_tickets: 400, sold_tickets: 120, description: "Standard entry to all floors and the terrace." },
      { title: "VIP Terrace", ticket_price: 3499, total_tickets: 60, sold_tickets: 22, description: "Reserved terrace seating, priority entry and one welcome cocktail." },
    ],
  },
  {
    city: "mumbai",
    venue_name: "New Year's Eve Warehouse Countdown",
    about:
      "The city's biggest warehouse NYE. A 12,000 sq ft raw industrial floor, a full production stage with LED walls and CO2 cannons, and a back-to-back techno lineup that runs straight through midnight until sunrise.",
    address: "Kamala Mills Compound, Lower Parel, Mumbai, Maharashtra 400013",
    start_date: "2026-12-31",
    end_date: "2027-01-01",
    is_multi_day: true,
    start_time: "21:00",
    end_time: "06:00",
    artists: [
      { name: "BLOT!", title: "Live Act", subtitle: "Electronica" },
      { name: "Arjun Vagale", title: "DJ", subtitle: "Techno" },
      { name: "Zokhuma", title: "DJ", subtitle: "Bass / Breaks" },
    ],
    tickets: [
      { title: "Phase 1 Entry", ticket_price: 2499, total_tickets: 500, sold_tickets: 500, description: "Phase 1 release - sold out." },
      { title: "Phase 2 Entry", ticket_price: 3499, total_tickets: 800, sold_tickets: 310, description: "General admission with access to the main floor and outdoor bar." },
      { title: "VIP Table (4 pax)", ticket_price: 24999, total_tickets: 40, sold_tickets: 11, description: "Elevated table for four, dedicated server, bottle service and separate entry lane." },
    ],
  },
  {
    city: "delhi",
    venue_name: "Bollywood Retro Night: 90s Edition",
    about:
      "Pure 90s Bollywood - the anthems you grew up on, cassette-era decor, and a dance floor that does not sit down. Our resident DJ takes requests all night, and the best-dressed table wins a bottle on the house.",
    address: "2nd Floor, Hauz Khas Village, New Delhi 110016",
    start_date: "2026-09-26",
    end_date: "2026-09-26",
    start_time: "20:00",
    end_time: "01:30",
    artists: [
      { name: "DJ Chetas", title: "DJ", subtitle: "Bollywood" },
      { name: "Sartek", title: "DJ", subtitle: "Bollywood House" },
    ],
    tickets: [
      { title: "Stag Entry", ticket_price: 999, total_tickets: 250, sold_tickets: 90, description: "Single entry. Cover redeemable against food and drinks." },
      { title: "Couple Entry", ticket_price: 1499, total_tickets: 200, sold_tickets: 76, description: "Entry for two. Cover fully redeemable at the bar." },
    ],
  },
  {
    city: "delhi",
    venue_name: "Winter Qawwali & Sufi Evening",
    about:
      "An open-courtyard winter evening of live qawwali and Sufi music, with bukharis keeping the space warm, floor seating on hand-woven durries, and a kahwa and kebab counter running through the night.",
    address: "Sunder Nursery Amphitheatre, Nizamuddin, New Delhi 110013",
    start_date: "2026-12-05",
    end_date: "2026-12-05",
    start_time: "18:00",
    end_time: "22:30",
    artists: [
      { name: "Nizami Bandhu", title: "Qawwals", subtitle: "Sufi Qawwali" },
      { name: "Dhruv Sangari", title: "Vocalist", subtitle: "Sufi" },
    ],
    tickets: [
      { title: "Floor Seating", ticket_price: 899, total_tickets: 300, sold_tickets: 140, description: "Traditional floor seating with bolsters, close to the stage." },
      { title: "Premium Chair Seating", ticket_price: 1899, total_tickets: 120, sold_tickets: 44, description: "Reserved chair seating in the front rows, includes kahwa service." },
    ],
  },
  {
    city: "bangalore",
    venue_name: "Garden Sundowner Sessions",
    about:
      "Golden hour in a lush garden setting. Acoustic and downtempo sets on a low stage under the trees, craft cocktails on tap, and a food truck line-up that stays open till close. Family and pet friendly until 8 PM.",
    address: "The Courtyard, Cubbon Park Road, Bengaluru, Karnataka 560001",
    start_date: "2026-09-19",
    end_date: "2026-09-19",
    start_time: "16:30",
    end_time: "21:30",
    artists: [
      { name: "Parvaaz", title: "Live Band", subtitle: "Alt Rock" },
      { name: "Sanjeeta Bhattacharya", title: "Singer", subtitle: "Neo Soul" },
    ],
    tickets: [
      { title: "Early Bird", ticket_price: 599, total_tickets: 300, sold_tickets: 300, description: "Early-bird release - sold out." },
      { title: "General Admission", ticket_price: 999, total_tickets: 500, sold_tickets: 180, description: "Lawn access with standing and open seating areas." },
    ],
  },
  {
    city: "bangalore",
    venue_name: "Christmas Silent Disco",
    about:
      "Three DJs, three colour-coded channels, one dance floor - switch your headphones between Bollywood, retro and house whenever you like. Festive decor, a hot chocolate bar, and a secret-santa corner for groups.",
    address: "100 Feet Road, Indiranagar, Bengaluru, Karnataka 560038",
    start_date: "2026-12-24",
    end_date: "2026-12-25",
    is_multi_day: true,
    start_time: "20:00",
    end_time: "02:00",
    artists: [
      { name: "DJ Ivan", title: "DJ", subtitle: "Commercial / Retro" },
      { name: "Rhea Dsouza", title: "DJ", subtitle: "House" },
      { name: "DJ Lloyd", title: "DJ", subtitle: "Bollywood" },
    ],
    tickets: [
      { title: "General Admission", ticket_price: 1199, total_tickets: 400, sold_tickets: 210, description: "Entry with wireless headphones (refundable deposit at the counter)." },
      { title: "Group of 4", ticket_price: 3999, total_tickets: 80, sold_tickets: 26, description: "Entry for four with headphones and a reserved high-table." },
    ],
  },
  {
    city: "pune",
    venue_name: "Jazz & Whiskey Evening",
    about:
      "An intimate, low-lit room with a live jazz quartet and a guided whiskey flight of five single malts led by a resident brand ambassador. Seating is limited to 90 covers to keep the room close.",
    address: "Lane 5, Koregaon Park, Pune, Maharashtra 411001",
    start_date: "2026-10-10",
    end_date: "2026-10-10",
    start_time: "19:30",
    end_time: "23:30",
    artists: [
      { name: "Rhythm & Blues Collective", title: "Live Band", subtitle: "Jazz" },
      { name: "Aditi Ramesh", title: "Vocalist", subtitle: "Jazz / Blues" },
    ],
    tickets: [
      { title: "Standard Seating", ticket_price: 1499, total_tickets: 60, sold_tickets: 33, description: "Table seating with the live set. Whiskey flight billed separately." },
      { title: "Tasting Experience", ticket_price: 3999, total_tickets: 30, sold_tickets: 14, description: "Front-row table with the guided five-malt flight and a paired snack menu." },
    ],
  },
  {
    city: "pune",
    venue_name: "Diwali Afterglow Rooftop",
    about:
      "A rooftop Diwali gathering with a diya-lit terrace, an all-vegetarian festive thali counter, live sitar-electronica fusion in the early evening and a house set after 10 PM. Fireworks are not permitted on site.",
    address: "Phoenix Marketcity Terrace, Viman Nagar, Pune, Maharashtra 411014",
    start_date: "2026-11-07",
    end_date: "2026-11-07",
    start_time: "18:00",
    end_time: "00:30",
    artists: [
      { name: "Ritviz", title: "Live Act", subtitle: "Indie Electronic" },
      { name: "Nucleya", title: "DJ", subtitle: "Bass" },
    ],
    tickets: [
      { title: "Festive Entry", ticket_price: 1299, total_tickets: 350, sold_tickets: 150, description: "Entry with access to the terrace and the festive thali counter." },
      { title: "Cabana for 6", ticket_price: 17999, total_tickets: 20, sold_tickets: 7, description: "Private rooftop cabana for six with dedicated service and bottle package." },
    ],
  },
  {
    city: "indore",
    venue_name: "Acoustic Open Mic Night",
    about:
      "Local singer-songwriters take a five-song slot each on an unplugged stage. Sign-ups open at the door from 7 PM on a first-come basis, and the house guitar and cajon are available if you turn up empty-handed.",
    address: "Scheme No. 54, Vijay Nagar, Indore, Madhya Pradesh 452010",
    start_date: "2026-10-24",
    end_date: "2026-10-24",
    start_time: "19:30",
    end_time: "22:30",
    artists: [
      { name: "Open Mic Collective", title: "Various Artists", subtitle: "Acoustic" },
      { name: "Shubham Trivedi", title: "Host", subtitle: "Singer-Songwriter" },
    ],
    tickets: [
      { title: "Listener Entry", ticket_price: 299, total_tickets: 120, sold_tickets: 48, description: "Audience entry. Cover redeemable against the cafe menu." },
      { title: "Performer Slot", ticket_price: 149, total_tickets: 20, sold_tickets: 12, description: "Reserves a five-song performance slot plus one free beverage." },
    ],
  },
  {
    city: "indore",
    venue_name: "Salsa & Sangria Winter Social",
    about:
      "A beginner-friendly salsa lesson at 8 PM sharp, then a live Latin band and social dancing until close. No partner needed - the social rotates every few songs, and sangria is on tap all evening.",
    address: "Sapna Sangeeta Road, Indore, Madhya Pradesh 452001",
    start_date: "2026-11-28",
    end_date: "2026-11-28",
    start_time: "20:00",
    end_time: "00:30",
    artists: [
      { name: "Latin Fire Band", title: "Live Band", subtitle: "Salsa / Latin" },
      { name: "Maria Fernandes", title: "Instructor", subtitle: "Salsa" },
    ],
    tickets: [
      { title: "Social Entry", ticket_price: 699, total_tickets: 150, sold_tickets: 62, description: "Entry with the beginner lesson and the full social night." },
      { title: "Couple Pass", ticket_price: 1199, total_tickets: 80, sold_tickets: 31, description: "Entry for two with the lesson and one sangria pitcher." },
    ],
  },
];

/* ============================================================
 * MAIN
 * ============================================================ */

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connected");
    if (DRY_RUN) console.log("🧪 DRY_RUN=1 - nothing will be written\n");

    /* ---------- CITIES ---------- */
    const cityNames = ["mumbai", "delhi", "bangalore", "pune", "indore"];
    const cityDocs = {};
    for (const name of cityNames) {
      const doc = await City.findOne({
        city_name: { $regex: new RegExp(`^${name}$`, "i") },
        is_deleted: false,
      });
      if (doc) {
        cityDocs[name] = doc;
        console.log(`✅ City "${doc.city_name}" (${doc._id})`);
      } else {
        console.warn(`⚠️  City "${name}" not found - its events will be skipped.`);
      }
    }

    /* ---------- VENDOR ---------- */
    let vendor = null;
    if (process.env.VENDOR_EMAIL) {
      vendor = await Vendor.findOne({
        email: process.env.VENDOR_EMAIL.toLowerCase(),
        is_deleted: false,
      });
      if (!vendor) {
        console.error(`❌ No vendor with email ${process.env.VENDOR_EMAIL}. Aborting.`);
        process.exit(1);
      }
    } else {
      vendor =
        (await Vendor.findOne({ vendor_type: "event_organizer", is_deleted: false, is_active: true })) ||
        (await Vendor.findOne({ is_deleted: false, is_active: true }));
    }
    if (!vendor) {
      console.error("❌ No active vendor found - one must exist to own these events. Aborting.");
      process.exit(1);
    }
    console.log(`✅ Vendor "${vendor.name}" (${vendor._id})`);

    /* ---------- CATEGORIES ---------- */
    const categories = await Category.find({
      category_type: 1, // 1 = Event
      is_deleted: false,
      is_active: true,
    });
    if (categories.length === 0) {
      console.error("❌ No active Event categories (category_type: 1). Aborting.");
      process.exit(1);
    }
    console.log(`✅ ${categories.length} event category(ies) available`);

    /* ---------- IMAGES ---------- */
    const imagePool = buildImagePool();
    console.log(
      imagePool.length
        ? `✅ Reusing ${imagePool.length} local image(s) from uploads/`
        : `ℹ️  No local uploads found - using picsum.photos seeded URLs (mode: ${IMAGE_MODE})`
    );

    /* ---------- CREATE ---------- */
    const created = [];
    const skipped = [];
    let ticketCount = 0;

    for (const t of EVENT_TEMPLATES) {
      const cityDoc = cityDocs[t.city];
      if (!cityDoc) {
        skipped.push(`${t.venue_name} (city missing)`);
        continue;
      }

      const existing = await Event.findOne({
        venue_name: t.venue_name,
        start_date: t.start_date,
        is_deleted: false,
      });
      if (existing) {
        skipped.push(`${t.venue_name} (already exists)`);
        console.log(`↩️  Skipping "${t.venue_name}" - already seeded (${existing._id})`);
        continue;
      }

      const seedKey = `${t.city}_${t.venue_name}`;
      const coords = CITY_COORDS[t.city];

      // 2 categories per event, rotating
      const ci = hashToIndex(seedKey, categories.length);
      const category_ids = [categories[ci]._id];
      if (categories.length > 1) category_ids.push(categories[(ci + 1) % categories.length]._id);

      const payload = {
        vendor_id: vendor._id,
        venue_name: t.venue_name,
        venue_image: pickImage(imagePool, seedKey, 1200, 800),
        city_id: cityDoc._id,
        category_ids,
        start_time: t.start_time,
        end_time: t.end_time,
        address: t.address,
        latitude: jitter(coords.latitude, seedKey),
        longitude: jitter(coords.longitude, `${seedKey}_lng`),
        start_date: t.start_date,
        end_date: t.end_date,
        is_multi_day: Boolean(t.is_multi_day),
        about: t.about,
        gallery_images: pickGalleryImages(imagePool, seedKey, 4),
        artists: t.artists.map((a, i) => ({
          ...a,
          image: pickImage(imagePool, `${seedKey}_artist${i}`, 600, 600),
        })),
        event_layout_images: [
          { image_url: pickImage(imagePool, `${seedKey}_layout0`, 1000, 700) },
          { image_url: pickImage(imagePool, `${seedKey}_layout1`, 1000, 700) },
        ].filter((l) => l.image_url),
        terms_and_conditions: BASE_TERMS.map((item) => ({ item })),
        faqs: baseFaqs(t.venue_name, t.start_time, t.address),
        prohibited_items: BASE_PROHIBITED.map((item) => ({ item })),
        is_active: true,
        is_deleted: false,
      };

      if (DRY_RUN) {
        console.log(`🧪 Would create "${t.venue_name}" (${cityDoc.city_name}, ${t.start_date}) + ${t.tickets.length} ticket tier(s)`);
        created.push({ venue_name: t.venue_name });
        ticketCount += t.tickets.length;
        continue;
      }

      const event = await Event.create(payload);

      for (const tk of t.tickets) {
        await Ticket.create({
          vendor_id: vendor._id,
          event_id: event._id,
          ticket_type: payload.is_multi_day ? "Multi Day Pass" : "One Day Pass",
          title: tk.title,
          ticket_price: tk.ticket_price,
          total_tickets: tk.total_tickets,
          sold_tickets: tk.sold_tickets,
          available_tickets: tk.total_tickets - tk.sold_tickets,
          description: tk.description,
          is_active: true,
          is_deleted: false,
        });
        ticketCount++;
      }

      created.push(event);
      console.log(
        `✅ "${event.venue_name}" - ${cityDoc.city_name}, ${event.start_date} → ${event.end_date} (${t.tickets.length} tiers) [${event._id}]`
      );
    }

    console.log("\n──────────── SUMMARY ────────────");
    console.log(`Events created : ${created.length}`);
    console.log(`Tickets created: ${ticketCount}`);
    if (skipped.length) console.log(`Skipped        : ${skipped.length}\n  - ${skipped.join("\n  - ")}`);
    console.log("──────────────────────────────────\n");

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error("❌ Error seeding events:", err);
    process.exit(1);
  }
};

seed();