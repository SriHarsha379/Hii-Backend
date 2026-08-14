/**
 * seedVenues.js
 * ---------------------------------------------------------------
 * Seeds 10 fully-completed Venue documents into the nightlifeDB cluster.
 *
 * WHY THIS WAS MISSING:
 * - The app's Venues tab reads from the `Venue` collection (not
 *   `Vendor` - those are different models; a Venue has a vendor_id
 *   pointing at the Vendor that owns it).
 * - There was no seed script for either Venue or Vendor. Worse,
 *   seedUpcomingEvents.js *requires* an existing Vendor to already be
 *   in the DB and aborts if none is found - so without a vendor seed,
 *   nothing venue-related could ever be seeded at all.
 * - This script fixes that at the root: it finds an existing Vendor,
 *   or creates one minimal "owner" vendor if none exists, then seeds
 *   10 real venues under it.
 * - category_ids need real Category docs (category_type: 2 = Venue).
 *   Fake/random ObjectIds would not resolve on populate().
 * - city_id needs a real City doc, which itself needs a real State doc
 *   (City.state_id is required). If neither exists yet, this script
 *   creates one minimal fallback city+state, clearly flagged in the log.
 *
 * HOW TO RUN:
 *   1. Place this file inside your "Hii Backend" project's scripts
 *      folder (e.g. Hii-Backend/src/scripts/seedVenues.js) so the
 *      relative model imports below resolve - or adjust the import
 *      paths if your project layout differs.
 *   2. npm install mongoose bcryptjs dotenv   (if not already present)
 *   3. Set MONGO_URI env var to the WRITE-ACCESS connection string,
 *      either exported or in a .env file at the project root.
 *   4. node src/scripts/seedVenues.js
 *
 * SAFE TO RE-RUN: uses upsert-by-venue_name, so running it twice
 * updates the same 10 venues instead of creating duplicates.
 * ---------------------------------------------------------------
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

// ---- ADJUST THESE if your models live somewhere else ----
import Venue from "../model/venueModel.js";
import Vendor from "../model/VendorModel.js";
// -----------------------------------------------------------

const MONGO_URI =
  process.env.MONGO_URI ||
  "mongodb+srv://harshas379_db_user:test1234@cluster0.auiuvqn.mongodb.net/nightlifeDB";

const COLLECTIONS = {
  categories: "categories",
  cities: "cities",
  states: "states",
};

const SAMPLE_VENUES = [
  {
    venue_name: "Skyline Rooftop Lounge",
    about: "A neon-lit rooftop bar with panoramic city views, craft cocktails, and a live DJ every weekend.",
    address: "14th Floor, Horizon Tower, MG Road",
    open_days: ["Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
    start_time: "17:00",
    end_time: "01:00",
    latitude: 12.9716,
    longitude: 77.5946,
  },
  {
    venue_name: "The Velvet Underground",
    about: "An intimate speakeasy-style basement club known for its jazz nights and handcrafted bourbon menu.",
    address: "22 Church Street, Behind Cafe Coffee Day",
    open_days: ["Thursday", "Friday", "Saturday"],
    start_time: "19:00",
    end_time: "02:00",
    latitude: 19.076,
    longitude: 72.8777,
  },
  {
    venue_name: "Warehouse 9",
    about: "A converted industrial warehouse turned techno venue with a massive dance floor and a killer sound system.",
    address: "Plot 9, Industrial Estate, Whitefield",
    open_days: ["Friday", "Saturday"],
    start_time: "22:00",
    end_time: "05:00",
    latitude: 28.7041,
    longitude: 77.1025,
  },
  {
    venue_name: "Coast & Co.",
    about: "A beachside lounge with sunset sundowners, seafood platters, and acoustic sets by local artists.",
    address: "Beach Road, Near Fisherman's Cove",
    open_days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
    start_time: "16:00",
    end_time: "23:30",
    latitude: 13.0827,
    longitude: 80.2707,
  },
  {
    venue_name: "The Copper Still",
    about: "A whiskey-forward gastropub with a vinyl jukebox, pool tables, and a legendary Friday happy hour.",
    address: "5th Avenue, Banjara Hills",
    open_days: ["Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    start_time: "17:30",
    end_time: "00:30",
    latitude: 17.385,
    longitude: 78.4867,
  },
  {
    venue_name: "Neon Garden",
    about: "An open-air garden club strung with neon lights, hosting silent discos and pop-up food stalls.",
    address: "Garden City Complex, Indiranagar",
    open_days: ["Wednesday", "Friday", "Saturday"],
    start_time: "18:00",
    end_time: "01:30",
    latitude: 12.9784,
    longitude: 77.6408,
  },
  {
    venue_name: "Salt & Smoke",
    about: "A rooftop BBQ bar famous for its smoked cocktails, live blues, and skyline views at golden hour.",
    address: "Rooftop, Merchant Plaza, Camp Area",
    open_days: ["Thursday", "Friday", "Saturday", "Sunday"],
    start_time: "17:00",
    end_time: "00:00",
    latitude: 18.5204,
    longitude: 73.8567,
  },
  {
    venue_name: "The Basement Collective",
    about: "An underground venue for indie gigs, open mics, and late-night vinyl listening sessions.",
    address: "B1, Heritage Arcade, Fort Area",
    open_days: ["Monday", "Wednesday", "Friday"],
    start_time: "19:00",
    end_time: "23:59",
    latitude: 22.5726,
    longitude: 88.3639,
  },
  {
    venue_name: "Aurora Nightclub",
    about: "A high-energy nightclub with a light-up dance floor, resident EDM DJs, and VIP bottle service.",
    address: "Nightlife District, Sector 29",
    open_days: ["Friday", "Saturday"],
    start_time: "22:30",
    end_time: "04:00",
    latitude: 28.4595,
    longitude: 77.0266,
  },
  {
    venue_name: "The Wine Cellar",
    about: "A candlelit wine bar in a converted cellar, pairing curated wine flights with live acoustic sets.",
    address: "Old Town Square, Koregaon Park",
    open_days: ["Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    start_time: "18:30",
    end_time: "23:30",
    latitude: 18.5362,
    longitude: 73.8939,
  },
];

async function ensureFallbackVendor(db) {
  const existing = await Vendor.findOne({ is_deleted: false });
  if (existing) return existing;

  console.warn(
    "⚠️  No Vendor found — creating one minimal fallback vendor " +
      "('Hii Venues Group') to own the seeded venues."
  );

  const { cities } = await ensureCityAndState(db);
  const fallbackCity = cities[0];

  const vendor = new Vendor({
    name: "Hii Venues Group",
    email: "venues.seed@hii.life",
    phone_number: "+919999999999",
    vendor_type: "owner",
    city: fallbackCity._id,
    state: fallbackCity.state_id,
    address: "Seed Address, Placeholder Street",
    password: "SeedPass@123", // pre-save hook hashes this automatically
    business_image: "",
    is_verified: true,
    is_active: true,
    is_deleted: false,
  });
  await vendor.save();
  console.log(`Created fallback vendor: ${vendor.email}`);
  return vendor;
}

async function ensureCityAndState(db) {
  const cities = await db.collection(COLLECTIONS.cities).find({}).limit(5).toArray();
  if (cities.length > 0) return { cities };

  console.warn(
    "⚠️  No City documents found — inserting one minimal fallback " +
      "state ('Karnataka') and city ('Bengaluru'). Edit manually " +
      "afterward if your schema needs more fields."
  );

  const stateResult = await db.collection(COLLECTIONS.states).insertOne({
    state_name: "Karnataka",
    is_active: true,
    is_deleted: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const cityResult = await db.collection(COLLECTIONS.cities).insertOne({
    state_id: stateResult.insertedId,
    city_name: "Bengaluru",
    is_active: true,
    is_deleted: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  return {
    cities: [
      { _id: cityResult.insertedId, city_name: "Bengaluru", state_id: stateResult.insertedId },
    ],
  };
}

function pickRandom(arr, count) {
  if (!arr || arr.length === 0) return [];
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.min(count, shuffled.length)).map((d) => d._id);
}

async function run() {
  console.log("Connecting to MongoDB...");
  await mongoose.connect(MONGO_URI);
  const db = mongoose.connection.db;
  console.log("Connected. Fetching reference collections...");

  const venueCategories = await db
    .collection(COLLECTIONS.categories)
    .find({ category_type: 2 }) // venue-type categories only
    .toArray();
  const { cities } = await ensureCityAndState(db);
  const vendor = await ensureFallbackVendor(db);

  console.log(
    `Found: ${venueCategories.length} venue categories, ${cities.length} cities. ` +
      `Owning vendor: ${vendor.email}`
  );

  if (venueCategories.length === 0) {
    console.warn(
      "⚠️  No Category documents with category_type: 2 (Venue) found. " +
        "category_ids will be left as [] for all 10 venues - seed venue " +
        "categories first if you want them populated."
    );
  }

  for (let i = 0; i < SAMPLE_VENUES.length; i++) {
    const v = SAMPLE_VENUES[i];
    const city = cities[i % cities.length];
    const slug = v.venue_name.toLowerCase().replace(/[^a-z0-9]+/g, "-");

    const venueDoc = {
      vendor_id: vendor._id,
      venue_name: v.venue_name,
      venue_image: `https://picsum.photos/seed/${slug}-main/900/1200`,
      city_id: city._id,
      category_ids: venueCategories.length > 0 ? pickRandom(venueCategories, 2) : [],
      open_days: v.open_days,
      start_time: v.start_time,
      end_time: v.end_time,
      address: v.address,
      latitude: v.latitude,
      longitude: v.longitude,
      about: v.about,
      gallery_images: [
        `https://picsum.photos/seed/${slug}-1/800/1000`,
        `https://picsum.photos/seed/${slug}-2/800/1000`,
        `https://picsum.photos/seed/${slug}-3/800/1000`,
      ],
      table_reservation_fee: 500,
      reservation_fee: 200,
      tax_percentage: 18,
      bill_discount_percentage: 0,
      is_active: true,
      is_deleted: false,
    };

    const existing = await Venue.findOne({ venue_name: v.venue_name });
    if (existing) {
      Object.assign(existing, venueDoc);
      await existing.save();
      console.log(`Updated existing venue: ${v.venue_name}`);
    } else {
      const newVenue = new Venue(venueDoc);
      await newVenue.save();
      console.log(`Created venue: ${v.venue_name}`);
    }
  }

  console.log("Done seeding 10 venues.");
  await mongoose.disconnect();
}

run().catch(async (err) => {
  console.error("Seed script failed:", err);
  await mongoose.disconnect();
  process.exit(1);
});