/**
 * seedDummyData.js
 *
 * Master dummy-data seeder for local/staging testing. Creates a complete,
 * internally-consistent dataset in dependency order:
 *
 *   States -> Cities -> Categories -> Genres -> Amenities
 *          -> Vendors -> Venues (clubs) -> Events -> Tickets
 *          -> Users
 *
 * Every document is fully populated - no empty arrays where the schema
 * expects content - so admin list/detail screens and the Flutter app both
 * have real data to render.
 *
 * ─────────────────────────────────────────────────────────────────────
 * IMPORTANT CONVENTIONS THIS SCRIPT FOLLOWS (verified against the code):
 *
 * 1. DATES ARE STRINGS. Event.start_date / end_date are plain Strings, and
 *    feedController.js filters with `e.end_date >= today` - a STRING
 *    comparison against a "YYYY-MM-DD" value. Every date written here is
 *    zero-padded YYYY-MM-DD or the feed silently drops the event.
 *
 * 2. TIMES ARE STRINGS ("21:00"), not Dates - matching the model.
 *    (Note: validation/admin/eventValidation.js declares these as
 *    Joi.date() and expects a single `date` field. That file is dead code -
 *    it is never imported by routes/admin/eventRoute.js - so it does not
 *    affect this script, but do not use it as a reference.)
 *
 * 3. IMAGES. Full https URLs are safe: every getImageUrl() helper in the
 *    Flutter app (city_preference.dart, venues_details_controller.dart,
 *    home_Screen.dart, event_booking_details_controller.dart, ...) does
 *    `if (path.startsWith('http')) return path;` before prefixing the
 *    local uploads base URL. Default mode reuses real files from uploads/
 *    if present, else falls back to deterministic picsum.photos URLs.
 *
 * 4. PASSWORDS. User and Vendor both have a pre('save') bcrypt hook, so
 *    this script uses .save() / Model.create() (NOT insertMany, which
 *    bypasses hooks and would store plaintext passwords).
 *
 * 5. Venue.open_days is an enum of full day names ('Monday'...'Sunday').
 * 6. Category.category_type: 1 = Event, 2 = Venue.
 * 7. Vendor.vendor_type enum: 'owner' | 'event_organizer'.
 * 8. User.gender enum: Male|Female|Other. interested_in: Men|Women|Everyone.
 *    login_type: apple|google|email.
 *
 * ─────────────────────────────────────────────────────────────────────
 * SEEDED LOGIN CREDENTIALS (all share one password):
 *   Vendors: vendor1@test.com ... vendor5@test.com
 *   Users:   user1@test.com  ... user12@test.com
 *   Password: Test@1234   (override with SEED_PASSWORD env var)
 *
 * USAGE:
 *   node src/scripts/seedDummyData.js
 *   DRY_RUN=1 node src/scripts/seedDummyData.js     # log only, write nothing
 *   IMAGE_MODE=remote node src/scripts/seedDummyData.js
 *   ONLY=users,venues node src/scripts/seedDummyData.js
 *   SEED_PASSWORD=MyPass123 node src/scripts/seedDummyData.js
 *
 * IDEMPOTENT: every entity is matched on a natural key (email, city_name,
 * venue_name+start_date, etc.) and skipped if it already exists. Safe to
 * re-run. It NEVER deletes anything.
 *
 * ⚠️  Point this at a dev/staging database, not production.
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  State, City, Category, Genre, Amenity,
  Vendor, Venue, Event, Ticket, User,
} from "../model/index.js";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.join(__dirname, "..", "..", "uploads");
const IMAGE_EXT = /\.(jpg|jpeg|png|webp)$/i;

const IMAGE_MODE = (process.env.IMAGE_MODE || "auto").toLowerCase();
const DRY_RUN = process.env.DRY_RUN === "1";
const PASSWORD = process.env.SEED_PASSWORD || "Test@1234";
const ONLY = (process.env.ONLY || "").split(",").map((s) => s.trim()).filter(Boolean);

const wants = (step) => ONLY.length === 0 || ONLY.includes(step);

/* ============================================================
 * HELPERS
 * ============================================================ */

const hashToIndex = (str, mod) => {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return mod > 0 ? h % mod : 0;
};

const buildImagePool = () => {
  if (IMAGE_MODE === "remote" || !fs.existsSync(UPLOADS_DIR)) return [];
  const files = fs.readdirSync(UPLOADS_DIR).filter((f) => IMAGE_EXT.test(f));
  let pool = files.filter((f) => f.toLowerCase().startsWith("venue_image"));
  if (!pool.length) pool = files.filter((f) => f.toLowerCase().startsWith("gallery_images"));
  return pool.length ? pool : files;
};

let IMAGE_POOL = [];
const img = (seed, w = 1200, h = 800) => {
  if (IMAGE_POOL.length) return IMAGE_POOL[hashToIndex(seed, IMAGE_POOL.length)];
  if (IMAGE_MODE === "uploads") return "";
  return `https://picsum.photos/seed/${encodeURIComponent(seed)}/${w}/${h}`;
};
const imgs = (seed, n = 4, w = 1200, h = 800) =>
  [...new Set(Array.from({ length: n }, (_, i) => img(`${seed}_${i}`, w, h)).filter(Boolean))];

// Never returns NaN: a pre-existing City row in the DB may be missing
// latitude/longitude entirely, and Venue/Event/User all declare those as
// Numbers - `undefined + x` would yield NaN and fail the cast.
const jitter = (v, seed, fallback = 0) => {
  const base = Number.isFinite(Number(v)) ? Number(v) : fallback;
  if (!Number.isFinite(base)) return 0;
  return Number((base + ((hashToIndex(seed, 200) - 100) / 100) * 0.03).toFixed(6));
};

const stats = {};
const bump = (k, created) => {
  stats[k] = stats[k] || { created: 0, skipped: 0 };
  stats[k][created ? "created" : "skipped"]++;
};

/**
 * Find-or-create. Uses .create() (not insertMany) so pre('save') hooks -
 * notably bcrypt password hashing on User and Vendor - actually run.
 */
const upsert = async (Model, key, label, doc, bucket) => {
  const existing = await Model.findOne(key);
  if (existing) { bump(bucket, false); return existing; }
  if (DRY_RUN) { bump(bucket, true); console.log(`🧪 would create ${bucket}: ${label}`); return { _id: new mongoose.Types.ObjectId(), ...doc }; }
  const created = await Model.create(doc);
  bump(bucket, true);
  console.log(`✅ ${bucket}: ${label}`);
  return created;
};

/* ============================================================
 * REFERENCE DATA
 * ============================================================ */

const STATES_CITIES = [
  { state: "Maharashtra", cities: [
    { name: "Mumbai", lat: 19.076,  lng: 72.8777, preferred: true },
    { name: "Pune",   lat: 18.5204, lng: 73.8567, preferred: false } ] },
  { state: "Delhi", cities: [
    { name: "Delhi",  lat: 28.7041, lng: 77.1025, preferred: true } ] },
  { state: "Karnataka", cities: [
    { name: "Bangalore", lat: 12.9716, lng: 77.5946, preferred: true } ] },
  { state: "Madhya Pradesh", cities: [
    { name: "Indore", lat: 22.7196, lng: 75.8577, preferred: false } ] },
  { state: "Goa", cities: [
    { name: "Panaji", lat: 15.4909, lng: 73.8278, preferred: true } ] },
];

const EVENT_CATEGORIES = ["Nightlife", "Live Music", "Techno", "Bollywood Night", "Comedy", "Festival"];
const VENUE_CATEGORIES = ["Nightclub", "Rooftop Bar", "Lounge", "Brewery", "Live Music Venue"];

const GENRES = [
  { name: "Techno", category: "Electronic", description: "Driving four-on-the-floor with hypnotic, machine-led loops.", is_top_pick: true },
  { name: "Deep House", category: "Electronic", description: "Warm basslines, soulful chords and an unhurried groove.", is_top_pick: true },
  { name: "Bollywood", category: "Desi", description: "Hindi film anthems old and new, built for a packed dance floor.", is_top_pick: true },
  { name: "Hip Hop", category: "Urban", description: "Boom-bap through to modern trap and desi hip hop.", is_top_pick: false },
  { name: "Afro House", category: "Electronic", description: "Percussive, tribal-leaning house with heavy live drums.", is_top_pick: false },
  { name: "Jazz", category: "Live", description: "Standards, bebop and fusion played by live ensembles.", is_top_pick: false },
  { name: "Indie Rock", category: "Live", description: "Guitar-driven independent bands, local and touring.", is_top_pick: false },
  { name: "Punjabi", category: "Desi", description: "Bhangra and modern Punjabi pop.", is_top_pick: true },
];

const AMENITIES = [
  "Valet Parking", "Rooftop Seating", "Live Music Stage", "Craft Cocktail Bar",
  "Smoking Zone", "Wheelchair Accessible", "Private Booths", "Coat Check",
  "Outdoor Terrace", "VIP Lounge",
];

const BASE_TERMS = [
  "Entry strictly for guests aged 21 years and above. Valid government-issued photo ID is mandatory.",
  "Tickets once purchased are non-refundable and non-transferable.",
  "Right of admission reserved by the venue management.",
  "Please carry a digital or printed copy of your booking QR code for entry.",
  "Management is not responsible for lost or stolen personal belongings.",
  "Re-entry is not permitted once you exit the venue.",
];

const BASE_PROHIBITED = [
  "Outside food and beverages", "Professional cameras and recording equipment",
  "Weapons of any kind", "Illegal substances", "Fireworks, flares and laser pointers",
  "Pets (service animals permitted)",
];

const faqsFor = (name, time, address) => [
  { question: "What time should I arrive?", answer: `Doors open at ${time}. We recommend arriving within the first hour to avoid queues.` },
  { question: "Is parking available?", answer: "Paid valet and limited self-parking are available on site. Ride-share drop-off is recommended on weekends." },
  { question: "What is the refund policy?", answer: "Bookings are non-refundable. If the organiser cancels, the full amount is refunded to your original payment method within 7 working days." },
  { question: "Is there a dress code?", answer: "Smart casual. Sportswear, shorts and open footwear may be denied entry." },
  { question: "Where exactly is it?", answer: `${name} is at ${address}. Tap the map on this page for directions.` },
];

/* ============================================================
 * VENDORS
 * ============================================================ */

const VENDORS = [
  { name: "Skyline Hospitality",    email: "vendor1@test.com", phone_number: "9800000001", vendor_type: "owner",           city: "Mumbai",    address: "Level 21, One BKC, Bandra Kurla Complex", landmark: "Opposite Trident Hotel" },
  { name: "Capital Nights Pvt Ltd", email: "vendor2@test.com", phone_number: "9800000002", vendor_type: "owner",           city: "Delhi",     address: "M-Block Market, Greater Kailash II", landmark: "Near GK-II Metro" },
  { name: "Namma Social Group",     email: "vendor3@test.com", phone_number: "9800000003", vendor_type: "owner",           city: "Bangalore", address: "100 Feet Road, Indiranagar", landmark: "Above Toit" },
  { name: "Pulse Event Co.",        email: "vendor4@test.com", phone_number: "9800000004", vendor_type: "event_organizer", city: "Pune",      address: "Lane 5, Koregaon Park", landmark: "Near Osho Garden" },
  { name: "Midland Entertainment",  email: "vendor5@test.com", phone_number: "9800000005", vendor_type: "event_organizer", city: "Indore",    address: "Scheme No. 54, Vijay Nagar", landmark: "Near C21 Mall" },
];

/* ============================================================
 * VENUES (CLUBS)
 * ============================================================ */

const VENUES = [
  { vendor: "vendor1@test.com", city: "Mumbai", venue_name: "Aurora Rooftop & Club",
    about: "A 21st-floor rooftop club with a wraparound terrace, a resident house programme through the week and a glass-walled main room that opens up after midnight. Skyline views on every side.",
    address: "Level 21, One BKC, Bandra Kurla Complex, Mumbai, Maharashtra 400051",
    open_days: ["Wednesday","Thursday","Friday","Saturday","Sunday"], start_time: "18:00", end_time: "01:30",
    table_reservation_fee: 5000, reservation_fee: 1000, tax_percentage: 18, bill_discount_percentage: 10 },

  { vendor: "vendor1@test.com", city: "Mumbai", venue_name: "The Basement Warehouse",
    about: "Raw concrete, a Funktion-One rig and a strict no-phones-on-the-floor policy. Underground techno and bass bookings only, running late every weekend.",
    address: "Kamala Mills Compound, Lower Parel, Mumbai, Maharashtra 400013",
    open_days: ["Friday","Saturday"], start_time: "22:00", end_time: "04:00",
    table_reservation_fee: 3000, reservation_fee: 750, tax_percentage: 18, bill_discount_percentage: 5 },

  { vendor: "vendor2@test.com", city: "Delhi", venue_name: "Neon Bazaar",
    about: "A two-floor nightclub in GK-II with Bollywood upstairs and house downstairs, plus a courtyard for when you need a break from the bass.",
    address: "M-Block Market, Greater Kailash II, New Delhi 110048",
    open_days: ["Thursday","Friday","Saturday","Sunday"], start_time: "20:00", end_time: "01:00",
    table_reservation_fee: 4000, reservation_fee: 800, tax_percentage: 18, bill_discount_percentage: 12 },

  { vendor: "vendor3@test.com", city: "Bangalore", venue_name: "Copper & Vine",
    about: "An in-house microbrewery and live music venue over three levels, with a rotating tap list and gigs from Thursday through Sunday.",
    address: "100 Feet Road, Indiranagar, Bengaluru, Karnataka 560038",
    open_days: ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"], start_time: "12:00", end_time: "23:30",
    table_reservation_fee: 2000, reservation_fee: 500, tax_percentage: 18, bill_discount_percentage: 15 },

  { vendor: "vendor3@test.com", city: "Bangalore", venue_name: "The Velvet Room",
    about: "An intimate 90-cover jazz and cocktail lounge with a listening-room policy - low lighting, live quartets and a bartender-led menu.",
    address: "Lavelle Road, Bengaluru, Karnataka 560001",
    open_days: ["Wednesday","Thursday","Friday","Saturday"], start_time: "19:00", end_time: "00:00",
    table_reservation_fee: 2500, reservation_fee: 600, tax_percentage: 18, bill_discount_percentage: 8 },

  { vendor: "vendor4@test.com", city: "Pune", venue_name: "Terrace 47",
    about: "An open-air terrace lounge in Koregaon Park with sundowner sets, a wood-fired kitchen and heaters through the winter months.",
    address: "Lane 5, Koregaon Park, Pune, Maharashtra 411001",
    open_days: ["Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"], start_time: "17:00", end_time: "00:30",
    table_reservation_fee: 3500, reservation_fee: 700, tax_percentage: 18, bill_discount_percentage: 10 },

  { vendor: "vendor5@test.com", city: "Indore", venue_name: "Sapna Social House",
    about: "A relaxed all-day cafe that turns into a live music room after 8 PM - open mics midweek, full bands on weekends.",
    address: "Sapna Sangeeta Road, Indore, Madhya Pradesh 452001",
    open_days: ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"], start_time: "11:00", end_time: "23:00",
    table_reservation_fee: 1500, reservation_fee: 300, tax_percentage: 12, bill_discount_percentage: 20 },

  { vendor: "vendor2@test.com", city: "Panaji", venue_name: "Sunset Shack Panaji",
    about: "A beachfront shack-turned-club on the Mandovi with sunset sessions, seafood grills and Goan trance heritage nights.",
    address: "Miramar Beach Road, Panaji, Goa 403001",
    open_days: ["Thursday","Friday","Saturday","Sunday"], start_time: "16:00", end_time: "02:00",
    table_reservation_fee: 2500, reservation_fee: 500, tax_percentage: 18, bill_discount_percentage: 10 },
];

/* ============================================================
 * EVENTS (Sep 2026 -> Dec 2026)
 * ============================================================ */

const EVENTS = [
  { vendor: "vendor1@test.com", city: "Mumbai", venue_name: "Monsoon Rooftop Closing Party",
    about: "Say goodbye to the monsoon from 21 floors up. Deep house and melodic techno across two rooms, a wraparound terrace over the skyline, and a seasonal cocktail menu.",
    address: "Level 21, One BKC, Bandra Kurla Complex, Mumbai, Maharashtra 400051",
    start_date: "2026-09-12", end_date: "2026-09-12", start_time: "18:30", end_time: "01:00",
    artists: [ { name: "Anish Sood", title: "DJ", subtitle: "Progressive House" }, { name: "Kohra", title: "DJ", subtitle: "Melodic Techno" } ],
    tickets: [ { title: "Early Bird", ticket_price: 799, total_tickets: 200, sold_tickets: 160, description: "Limited early-bird entry, venue access only." },
               { title: "General Admission", ticket_price: 1299, total_tickets: 400, sold_tickets: 120, description: "Standard entry to all floors and the terrace." },
               { title: "VIP Terrace", ticket_price: 3499, total_tickets: 60, sold_tickets: 22, description: "Reserved terrace seating, priority entry, welcome cocktail." } ] },

  { vendor: "vendor1@test.com", city: "Mumbai", venue_name: "New Year's Eve Warehouse Countdown",
    about: "The city's biggest warehouse NYE. 12,000 sq ft of raw industrial floor, LED walls, CO2 cannons and a back-to-back techno lineup straight through midnight until sunrise.",
    address: "Kamala Mills Compound, Lower Parel, Mumbai, Maharashtra 400013",
    start_date: "2026-12-31", end_date: "2027-01-01", is_multi_day: true, start_time: "21:00", end_time: "06:00",
    artists: [ { name: "BLOT!", title: "Live Act", subtitle: "Electronica" }, { name: "Arjun Vagale", title: "DJ", subtitle: "Techno" }, { name: "Zokhuma", title: "DJ", subtitle: "Bass / Breaks" } ],
    tickets: [ { title: "Phase 1 Entry", ticket_price: 2499, total_tickets: 500, sold_tickets: 500, description: "Phase 1 release - sold out." },
               { title: "Phase 2 Entry", ticket_price: 3499, total_tickets: 800, sold_tickets: 310, description: "General admission, main floor and outdoor bar." },
               { title: "VIP Table (4 pax)", ticket_price: 24999, total_tickets: 40, sold_tickets: 11, description: "Elevated table for four, dedicated server, bottle service, separate entry lane." } ] },

  { vendor: "vendor2@test.com", city: "Delhi", venue_name: "Bollywood Retro Night: 90s Edition",
    about: "Pure 90s Bollywood - the anthems you grew up on, cassette-era decor and a floor that does not sit down. Requests taken all night; best-dressed table wins a bottle.",
    address: "M-Block Market, Greater Kailash II, New Delhi 110048",
    start_date: "2026-09-26", end_date: "2026-09-26", start_time: "20:00", end_time: "01:30",
    artists: [ { name: "DJ Chetas", title: "DJ", subtitle: "Bollywood" }, { name: "Sartek", title: "DJ", subtitle: "Bollywood House" } ],
    tickets: [ { title: "Stag Entry", ticket_price: 999, total_tickets: 250, sold_tickets: 90, description: "Single entry. Cover redeemable against food and drinks." },
               { title: "Couple Entry", ticket_price: 1499, total_tickets: 200, sold_tickets: 76, description: "Entry for two. Cover fully redeemable at the bar." } ] },

  { vendor: "vendor2@test.com", city: "Delhi", venue_name: "Winter Qawwali & Sufi Evening",
    about: "An open-courtyard winter evening of live qawwali and Sufi music, bukharis keeping the space warm, floor seating on hand-woven durries, and a kahwa and kebab counter all night.",
    address: "Sunder Nursery Amphitheatre, Nizamuddin, New Delhi 110013",
    start_date: "2026-12-05", end_date: "2026-12-05", start_time: "18:00", end_time: "22:30",
    artists: [ { name: "Nizami Bandhu", title: "Qawwals", subtitle: "Sufi Qawwali" }, { name: "Dhruv Sangari", title: "Vocalist", subtitle: "Sufi" } ],
    tickets: [ { title: "Floor Seating", ticket_price: 899, total_tickets: 300, sold_tickets: 140, description: "Traditional floor seating with bolsters, close to the stage." },
               { title: "Premium Chair Seating", ticket_price: 1899, total_tickets: 120, sold_tickets: 44, description: "Reserved chairs in the front rows, includes kahwa service." } ] },

  { vendor: "vendor3@test.com", city: "Bangalore", venue_name: "Garden Sundowner Sessions",
    about: "Golden hour in a lush garden setting. Acoustic and downtempo sets on a low stage under the trees, craft cocktails on tap and food trucks open till close. Pet friendly until 8 PM.",
    address: "The Courtyard, Cubbon Park Road, Bengaluru, Karnataka 560001",
    start_date: "2026-09-19", end_date: "2026-09-19", start_time: "16:30", end_time: "21:30",
    artists: [ { name: "Parvaaz", title: "Live Band", subtitle: "Alt Rock" }, { name: "Sanjeeta Bhattacharya", title: "Singer", subtitle: "Neo Soul" } ],
    tickets: [ { title: "Early Bird", ticket_price: 599, total_tickets: 300, sold_tickets: 300, description: "Early-bird release - sold out." },
               { title: "General Admission", ticket_price: 999, total_tickets: 500, sold_tickets: 180, description: "Lawn access with standing and open seating." } ] },

  { vendor: "vendor3@test.com", city: "Bangalore", venue_name: "Christmas Silent Disco",
    about: "Three DJs, three colour-coded channels, one floor - switch between Bollywood, retro and house whenever you like. Festive decor, a hot chocolate bar and a secret-santa corner.",
    address: "100 Feet Road, Indiranagar, Bengaluru, Karnataka 560038",
    start_date: "2026-12-24", end_date: "2026-12-25", is_multi_day: true, start_time: "20:00", end_time: "02:00",
    artists: [ { name: "DJ Ivan", title: "DJ", subtitle: "Commercial / Retro" }, { name: "Rhea Dsouza", title: "DJ", subtitle: "House" }, { name: "DJ Lloyd", title: "DJ", subtitle: "Bollywood" } ],
    tickets: [ { title: "General Admission", ticket_price: 1199, total_tickets: 400, sold_tickets: 210, description: "Entry with wireless headphones (refundable deposit at the counter)." },
               { title: "Group of 4", ticket_price: 3999, total_tickets: 80, sold_tickets: 26, description: "Entry for four with headphones and a reserved high-table." } ] },

  { vendor: "vendor4@test.com", city: "Pune", venue_name: "Jazz & Whiskey Evening",
    about: "A low-lit room with a live jazz quartet and a guided flight of five single malts led by a resident brand ambassador. Limited to 90 covers to keep the room close.",
    address: "Lane 5, Koregaon Park, Pune, Maharashtra 411001",
    start_date: "2026-10-10", end_date: "2026-10-10", start_time: "19:30", end_time: "23:30",
    artists: [ { name: "Rhythm & Blues Collective", title: "Live Band", subtitle: "Jazz" }, { name: "Aditi Ramesh", title: "Vocalist", subtitle: "Jazz / Blues" } ],
    tickets: [ { title: "Standard Seating", ticket_price: 1499, total_tickets: 60, sold_tickets: 33, description: "Table seating with the live set. Whiskey flight billed separately." },
               { title: "Tasting Experience", ticket_price: 3999, total_tickets: 30, sold_tickets: 14, description: "Front-row table, guided five-malt flight and paired snack menu." } ] },

  { vendor: "vendor4@test.com", city: "Pune", venue_name: "Diwali Afterglow Rooftop",
    about: "A rooftop Diwali gathering with a diya-lit terrace, an all-vegetarian festive thali counter, sitar-electronica fusion early and a house set after 10 PM. No fireworks on site.",
    address: "Phoenix Marketcity Terrace, Viman Nagar, Pune, Maharashtra 411014",
    start_date: "2026-11-07", end_date: "2026-11-07", start_time: "18:00", end_time: "00:30",
    artists: [ { name: "Ritviz", title: "Live Act", subtitle: "Indie Electronic" }, { name: "Nucleya", title: "DJ", subtitle: "Bass" } ],
    tickets: [ { title: "Festive Entry", ticket_price: 1299, total_tickets: 350, sold_tickets: 150, description: "Terrace access and the festive thali counter." },
               { title: "Cabana for 6", ticket_price: 17999, total_tickets: 20, sold_tickets: 7, description: "Private rooftop cabana for six, dedicated service and bottle package." } ] },

  { vendor: "vendor5@test.com", city: "Indore", venue_name: "Acoustic Open Mic Night",
    about: "Local singer-songwriters take a five-song slot each on an unplugged stage. Sign-ups at the door from 7 PM, first-come. House guitar and cajon available.",
    address: "Scheme No. 54, Vijay Nagar, Indore, Madhya Pradesh 452010",
    start_date: "2026-10-24", end_date: "2026-10-24", start_time: "19:30", end_time: "22:30",
    artists: [ { name: "Open Mic Collective", title: "Various Artists", subtitle: "Acoustic" }, { name: "Shubham Trivedi", title: "Host", subtitle: "Singer-Songwriter" } ],
    tickets: [ { title: "Listener Entry", ticket_price: 299, total_tickets: 120, sold_tickets: 48, description: "Audience entry. Cover redeemable against the cafe menu." },
               { title: "Performer Slot", ticket_price: 149, total_tickets: 20, sold_tickets: 12, description: "Reserves a five-song slot plus one free beverage." } ] },

  { vendor: "vendor5@test.com", city: "Indore", venue_name: "Salsa & Sangria Winter Social",
    about: "A beginner-friendly salsa lesson at 8 PM sharp, then a live Latin band and social dancing until close. No partner needed - the social rotates every few songs.",
    address: "Sapna Sangeeta Road, Indore, Madhya Pradesh 452001",
    start_date: "2026-11-28", end_date: "2026-11-28", start_time: "20:00", end_time: "00:30",
    artists: [ { name: "Latin Fire Band", title: "Live Band", subtitle: "Salsa / Latin" }, { name: "Maria Fernandes", title: "Instructor", subtitle: "Salsa" } ],
    tickets: [ { title: "Social Entry", ticket_price: 699, total_tickets: 150, sold_tickets: 62, description: "Entry with the beginner lesson and the full social night." },
               { title: "Couple Pass", ticket_price: 1199, total_tickets: 80, sold_tickets: 31, description: "Entry for two with the lesson and one sangria pitcher." } ] },

  { vendor: "vendor2@test.com", city: "Panaji", venue_name: "Goa Sunset Trance Sessions",
    about: "A three-day beachfront gathering tracing Goa's trance lineage - sunset sets on the sand, a psychedelic art installation trail and after-hours in the palm grove.",
    address: "Miramar Beach Road, Panaji, Goa 403001",
    start_date: "2026-12-18", end_date: "2026-12-20", is_multi_day: true, start_time: "16:00", end_time: "04:00",
    artists: [ { name: "Ash Roy", title: "DJ", subtitle: "Psytrance" }, { name: "Hamza Rahimtula", title: "DJ", subtitle: "Afro House" }, { name: "Sandunes", title: "Live Act", subtitle: "Electronica" } ],
    tickets: [ { title: "Day Pass", ticket_price: 1999, total_tickets: 600, sold_tickets: 240, description: "Single-day entry, valid for any one of the three days." },
               { title: "3-Day Festival Pass", ticket_price: 4999, total_tickets: 400, sold_tickets: 175, description: "Full access across all three days plus the art trail." },
               { title: "Palm Grove VIP", ticket_price: 12999, total_tickets: 50, sold_tickets: 18, description: "Three-day VIP with shaded deck access, private bar and fast-track entry." } ] },
];

/* ============================================================
 * USERS
 * ============================================================ */

const USERS = [
  { first_name: "Aarav",  last_name: "Sharma",   username: "aarav_s",    gender: "Male",   city: "Mumbai",    birthdate: "1996-04-12", interested_in: "Women",    pronouns: "he/him",   bio: "Techno on weekends, filter coffee on weekdays. Always up for a rooftop." },
  { first_name: "Diya",   last_name: "Nair",     username: "diya.nair",  gender: "Female", city: "Mumbai",    birthdate: "1998-09-03", interested_in: "Everyone", pronouns: "she/her",  bio: "Architect by day. I will drag you to every sundowner in the city." },
  { first_name: "Kabir",  last_name: "Mehta",    username: "kabirm",     gender: "Male",   city: "Delhi",     birthdate: "1994-01-27", interested_in: "Women",    pronouns: "he/him",   bio: "Vinyl collector, mediocre cook, decent dancer after 1 AM." },
  { first_name: "Ananya", last_name: "Iyer",     username: "ananya_i",   gender: "Female", city: "Delhi",     birthdate: "1999-11-15", interested_in: "Men",      pronouns: "she/her",  bio: "Qawwali and deep house are the same feeling at different tempos." },
  { first_name: "Rohan",  last_name: "Desai",    username: "rohan.d",    gender: "Male",   city: "Bangalore", birthdate: "1995-06-08", interested_in: "Everyone", pronouns: "he/him",   bio: "Brewery hopping in Indiranagar. Recommend me a sour." },
  { first_name: "Meera",  last_name: "Krishnan", username: "meerak",     gender: "Female", city: "Bangalore", birthdate: "1997-02-19", interested_in: "Women",    pronouns: "she/her",  bio: "Jazz nights, long drives, and finding the quiet table at loud places." },
  { first_name: "Vihaan", last_name: "Reddy",    username: "vihaan_r",   gender: "Male",   city: "Bangalore", birthdate: "1993-08-30", interested_in: "Women",    pronouns: "he/him",   bio: "Startup guy who is genuinely just here for the live music." },
  { first_name: "Ishita", last_name: "Bose",     username: "ishita.b",   gender: "Female", city: "Pune",      birthdate: "2000-03-22", interested_in: "Everyone", pronouns: "she/her",  bio: "Final-year student. Open mics, cheap sangria, good company." },
  { first_name: "Arjun",  last_name: "Kulkarni", username: "arjunk",     gender: "Male",   city: "Pune",      birthdate: "1992-12-05", interested_in: "Women",    pronouns: "he/him",   bio: "Been going to KP gigs since college. Somebody has to keep the scene alive." },
  { first_name: "Sanya",  last_name: "Jain",     username: "sanya_j",    gender: "Female", city: "Indore",    birthdate: "1998-07-14", interested_in: "Men",      pronouns: "she/her",  bio: "Salsa on Saturdays. Two left feet, zero shame." },
  { first_name: "Aditya", last_name: "Verma",    username: "adityav",    gender: "Male",   city: "Indore",    birthdate: "1996-10-09", interested_in: "Everyone", pronouns: "he/him",   bio: "I bring the guitar to the open mic and then get nervous." },
  { first_name: "Riya",   last_name: "Fernandes",username: "riya.f",     gender: "Female", city: "Panaji",    birthdate: "1995-05-01", interested_in: "Everyone", pronouns: "she/her",  bio: "Grew up on this beach. Sunset sets are non-negotiable." },
];

const HOBBIES = ["Photography", "Trekking", "Vinyl collecting", "Cooking", "Cycling", "Reading", "Football", "Painting", "Yoga", "Film"];
const INTERESTS = ["Live gigs", "Rooftops", "Street food", "Road trips", "Stand-up comedy", "Art shows", "Board games", "Coffee"];
const CUSTOM_VIBES = ["Chill pill", "High energy", "Late night", "Golden hour", "Front of the crowd", "Corner booth"];

/* ============================================================
 * MAIN
 * ============================================================ */

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("✅ MongoDB connected");
  if (DRY_RUN) console.log("🧪 DRY_RUN=1 - nothing will be written");
  if (ONLY.length) console.log(`ℹ️  ONLY=${ONLY.join(",")}`);

  IMAGE_POOL = buildImagePool();
  console.log(IMAGE_POOL.length
    ? `✅ Reusing ${IMAGE_POOL.length} local image(s) from uploads/`
    : `ℹ️  No local uploads - using picsum.photos seeded URLs (mode: ${IMAGE_MODE})`);
  console.log("");

  /* ---------- STATES + CITIES ---------- */
  const cityMap = {};
  const stateOfCity = {};   // cityName -> State _id (authoritative, from this run)
  const coordsOfCity = {};  // cityName -> {lat,lng} from STATES_CITIES, never from the DB
  for (const s of STATES_CITIES) {
    const state = await upsert(State, { state_name: s.state, is_deleted: false }, s.state,
      { state_name: s.state, is_active: true, is_deleted: false }, "states");

    for (const c of s.cities) {
      const city = await upsert(City,
        { city_name: { $regex: new RegExp(`^${c.name}$`, "i") }, is_deleted: false },
        `${c.name} (${s.state})`,
        { state_id: state._id, city_name: c.name, city_image: img(`city_${c.name}`, 800, 600),
          latitude: c.lat, longitude: c.lng, is_active: true, is_preferred: c.preferred, is_deleted: false },
        "cities");
      cityMap[c.name] = city;
      stateOfCity[c.name] = state._id;
      coordsOfCity[c.name] = { lat: c.lat, lng: c.lng };

      // A pre-existing city is skipped by upsert() and returned as-is, so it
      // may be missing fields this script depends on:
      //   - no state_id  -> Vendor.state is `required` -> validation error
      //   - no lat/lng   -> jitter() yields NaN -> Number cast error on
      //                     Venue/Event/User latitude+longitude
      // Backfill both from the authoritative STATES_CITIES table above.
      if (!DRY_RUN) {
        const fix = {};
        if (city.state_id?.toString() !== state._id.toString()) fix.state_id = state._id;
        if (!Number.isFinite(city.latitude))  fix.latitude  = c.lat;
        if (!Number.isFinite(city.longitude)) fix.longitude = c.lng;
        if (Object.keys(fix).length) {
          await City.updateOne({ _id: city._id }, { $set: fix });
          Object.assign(city, fix);
          console.log(`\u{1F527} backfilled ${Object.keys(fix).join(", ")} on city "${c.name}"`);
        }
      }
    }
  }

  /* ---------- CATEGORIES ---------- */
  const eventCats = [], venueCats = [];
  for (const n of EVENT_CATEGORIES) {
    eventCats.push(await upsert(Category, { category_name: n, category_type: 1, is_deleted: false }, `${n} (event)`,
      { category_name: n, category_type: 1, is_active: true, is_deleted: false }, "categories"));
  }
  for (const n of VENUE_CATEGORIES) {
    venueCats.push(await upsert(Category, { category_name: n, category_type: 2, is_deleted: false }, `${n} (venue)`,
      { category_name: n, category_type: 2, is_active: true, is_deleted: false }, "categories"));
  }

  /* ---------- GENRES ---------- */
  const genres = [];
  for (const g of GENRES) {
    genres.push(await upsert(Genre, { name: g.name, is_deleted: false }, g.name,
      { ...g, image: img(`genre_${g.name}`, 600, 600), is_active: true, is_deleted: false }, "genres"));
  }

  /* ---------- AMENITIES ---------- */
  for (const a of AMENITIES) {
    await upsert(Amenity, { amenity_name: a, is_deleted: false }, a,
      { amenity_name: a, amenity_icon: img(`amenity_${a}`, 128, 128), is_active: true, is_deleted: false }, "amenities");
  }

  /* ---------- VENDORS ---------- */
  const vendorMap = {};
  for (const v of VENDORS) {
    const city = cityMap[v.city];
    if (!city) { console.warn(`⚠️  vendor ${v.email}: city ${v.city} missing, skipped`); continue; }
    const doc = await upsert(Vendor, { email: v.email }, `${v.name} <${v.email}>`,
      { name: v.name, email: v.email, phone_number: v.phone_number, vendor_type: v.vendor_type,
        city: city._id, state: stateOfCity[v.city] || city.state_id, address: v.address, landmark: v.landmark,
        password: PASSWORD, business_image: img(`vendor_${v.email}`, 800, 600),
        bank_details: { account_holder_name: v.name, bank_name: "HDFC Bank",
          account_number: `5010${hashToIndex(v.email, 100000000).toString().padStart(8, "0")}`,
          ifsc_code: "HDFC0001234", account_type: "current", is_verified: true, verified_at: new Date() },
        is_verified: true, is_active: true, is_deleted: false },
      "vendors");
    vendorMap[v.email] = doc;
  }

  /* ---------- VENUES ---------- */
  if (wants("venues")) {
    for (const v of VENUES) {
      const vendor = vendorMap[v.vendor], city = cityMap[v.city];
      if (!vendor || !city) { console.warn(`⚠️  venue "${v.venue_name}": vendor/city missing, skipped`); continue; }
      const seed = `venue_${v.venue_name}`;
      const ci = hashToIndex(seed, venueCats.length);
      await upsert(Venue, { venue_name: v.venue_name, is_deleted: false }, `${v.venue_name} (${v.city})`,
        { vendor_id: vendor._id, venue_name: v.venue_name, venue_image: img(seed),
          city_id: city._id,
          category_ids: [venueCats[ci]._id, venueCats[(ci + 1) % venueCats.length]._id],
          open_days: v.open_days, start_time: v.start_time, end_time: v.end_time,
          address: v.address,
          latitude: jitter(city.latitude, seed, coordsOfCity[v.city]?.lat),
          longitude: jitter(city.longitude, `${seed}_lng`, coordsOfCity[v.city]?.lng),
          about: v.about, gallery_images: imgs(seed, 5),
          table_reservation_fee: v.table_reservation_fee, reservation_fee: v.reservation_fee,
          tax_percentage: v.tax_percentage, bill_discount_percentage: v.bill_discount_percentage,
          terms_and_conditions: BASE_TERMS.map((item) => ({ item })),
          faqs: faqsFor(v.venue_name, v.start_time, v.address),
          prohibited_items: BASE_PROHIBITED.map((item) => ({ item })),
          is_active: true, is_deleted: false },
        "venues");
    }
  }

  /* ---------- EVENTS + TICKETS ---------- */
  if (wants("events")) {
    for (const e of EVENTS) {
      const vendor = vendorMap[e.vendor], city = cityMap[e.city];
      if (!vendor || !city) { console.warn(`⚠️  event "${e.venue_name}": vendor/city missing, skipped`); continue; }

      const existing = await Event.findOne({ venue_name: e.venue_name, start_date: e.start_date, is_deleted: false });
      if (existing) { bump("events", false); bump("tickets", false); continue; }

      const seed = `event_${e.venue_name}`;
      const ci = hashToIndex(seed, eventCats.length);
      const isMulti = Boolean(e.is_multi_day);

      const payload = {
        vendor_id: vendor._id, venue_name: e.venue_name, venue_image: img(seed),
        city_id: city._id,
        category_ids: [eventCats[ci]._id, eventCats[(ci + 1) % eventCats.length]._id],
        start_time: e.start_time, end_time: e.end_time, address: e.address,
        latitude: jitter(city.latitude, seed, coordsOfCity[e.city]?.lat),
        longitude: jitter(city.longitude, `${seed}_lng`, coordsOfCity[e.city]?.lng),
        start_date: e.start_date, end_date: e.end_date, is_multi_day: isMulti,
        about: e.about, gallery_images: imgs(seed, 4),
        artists: e.artists.map((a, i) => ({ ...a, image: img(`${seed}_artist${i}`, 600, 600) })),
        event_layout_images: [
          { image_url: img(`${seed}_layout0`, 1000, 700) },
          { image_url: img(`${seed}_layout1`, 1000, 700) },
        ].filter((l) => l.image_url),
        terms_and_conditions: BASE_TERMS.map((item) => ({ item })),
        faqs: faqsFor(e.venue_name, e.start_time, e.address),
        prohibited_items: BASE_PROHIBITED.map((item) => ({ item })),
        is_active: true, is_deleted: false,
      };

      if (DRY_RUN) {
        console.log(`🧪 would create event: ${e.venue_name} (${e.city}, ${e.start_date}) + ${e.tickets.length} tiers`);
        bump("events", true); e.tickets.forEach(() => bump("tickets", true));
        continue;
      }

      const ev = await Event.create(payload);
      bump("events", true);
      console.log(`✅ events: ${ev.venue_name} - ${e.city}, ${ev.start_date} → ${ev.end_date}`);

      for (const t of e.tickets) {
        await Ticket.create({
          vendor_id: vendor._id, event_id: ev._id,
          ticket_type: isMulti ? "Multi Day Pass" : "One Day Pass",
          title: t.title, ticket_price: t.ticket_price,
          total_tickets: t.total_tickets, sold_tickets: t.sold_tickets,
          available_tickets: t.total_tickets - t.sold_tickets,
          description: t.description, is_active: true, is_deleted: false,
        });
        bump("tickets", true);
      }
    }
  }

  /* ---------- USERS ---------- */
  if (wants("users")) {
    for (let i = 0; i < USERS.length; i++) {
      const u = USERS[i];
      const email = `user${i + 1}@test.com`;
      const city = cityMap[u.city];
      if (!city) { console.warn(`⚠️  user ${email}: city ${u.city} missing, skipped`); continue; }
      const seed = `user_${u.username}`;

      const pick = (arr, n, s) => {
        const out = [];
        for (let k = 0; k < n; k++) out.push(arr[hashToIndex(`${s}_${k}`, arr.length)]);
        return [...new Set(out)];
      };

      await upsert(User, { email }, `${u.first_name} ${u.last_name} <${email}>`,
        { email, phone_number: `98111000${String(i + 10).padStart(2, "0")}`, country_code: 91,
          password: PASSWORD, login_type: "email",
          first_name: u.first_name, last_name: u.last_name,
          name: `${u.first_name} ${u.last_name}`, username: u.username,
          birthdate: new Date(u.birthdate),   // age auto-computed by pre('save')
          gender: u.gender, bio: u.bio, pronouns: u.pronouns,
          interested_in: u.interested_in, sexuality: "Prefer not to say",
          height: `${160 + hashToIndex(seed, 30)} cm`, weight: 55 + hashToIndex(`${seed}_w`, 30),
          profile_image: img(seed, 600, 600),
          user_gallery: imgs(seed, 3, 800, 1000).map((url) => ({ url, type: "image", thumbnail_url: null, is_visible: true })),
          city_id: city._id,
          latitude: jitter(city.latitude, seed, coordsOfCity[u.city]?.lat),
          longitude: jitter(city.longitude, `${seed}_lng`, coordsOfCity[u.city]?.lng), radius: 25,
          preferred_cities: [{ city_id: city._id,
            latitude: Number.isFinite(city.latitude) ? city.latitude : coordsOfCity[u.city].lat,
            longitude: Number.isFinite(city.longitude) ? city.longitude : coordsOfCity[u.city].lng,
            radius: 25 }],
          hobbies: pick(HOBBIES, 3, seed),
          interests: pick(INTERESTS, 3, `${seed}_int`),
          custom_vibes: pick(CUSTOM_VIBES, 2, `${seed}_vibe`),
          music_genre: pick(genres, 3, `${seed}_g`).map((g) => g._id),
          custom_music_genres: ["Lo-fi"],
          event_preferences: pick(eventCats, 2, `${seed}_ep`).map((c) => c._id),
          custom_event_preferences: ["Warehouse parties"],
          instagram_account: `https://instagram.com/${u.username}`,
          spotify_account: `https://open.spotify.com/user/${u.username}`,
          snapchat_account: "",
          my_referral_code: `${u.username.replace(/[^a-z0-9]/gi, "").toUpperCase().slice(0, 6)}${100 + i}`,
          is_verified: true, is_profile_completed: true, signup_step: 5,
          accepted_terms: true, accepted_privacy_policy: true,
          my_visibility: true, is_active: true, is_deleted: false,
          device_type: i % 2 === 0 ? "android" : "ios" },
        "users");
    }
  }

  /* ---------- SUMMARY ---------- */
  console.log("\n──────────────── SUMMARY ────────────────");
  for (const [k, v] of Object.entries(stats)) {
    console.log(`${k.padEnd(12)} created: ${String(v.created).padStart(3)}   skipped: ${String(v.skipped).padStart(3)}`);
  }
  console.log("─────────────────────────────────────────");
  console.log(`Login password for all seeded accounts: ${PASSWORD}`);
  console.log("Vendors: vendor1@test.com … vendor5@test.com");
  console.log("Users:   user1@test.com  … user12@test.com\n");

  await mongoose.disconnect();
  process.exit(0);
};

run().catch(async (err) => {
  console.error("❌ Seed failed:", err);
  try { await mongoose.disconnect(); } catch {}
  process.exit(1);
});