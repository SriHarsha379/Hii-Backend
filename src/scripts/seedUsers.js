/**
 * seedUsers.js
 * ---------------------------------------------------------------
 * Seeds 5 FULLY-COMPLETED user profiles into the nightlifeDB cluster.
 *
 * WHY IT'S WRITTEN THIS WAY:
 * - music_genre / event_preferences / vibes are ObjectId refs to
 *   Genre / Category / Vibe. Fake/random ObjectIds would NOT resolve
 *   on populate(), so this script fetches REAL documents from those
 *   collections at runtime and uses their actual _id values.
 * - city_id / preferred_cities need a real City document too. If no
 *   City exists yet, this script creates one minimal fallback city
 *   so the reference isn't dangling (flagged clearly in the log).
 * - vibe_checks needs real VibeCheckQuestion _ids. If that collection
 *   is empty, vibe_checks is left as [] for that run (a fake answer
 *   with no matching question is worse than no answer) — a warning
 *   is printed so you know to seed VibeCheckQuestion separately.
 *
 * HOW TO RUN:
 *   1. Place this file anywhere inside your "Hii Backend" project
 *      (e.g. Hii-Backend/scripts/seedUsers.js) so relative imports
 *      of your User model work — OR just adjust USER_MODEL_PATH below.
 *   2. npm install mongoose bcryptjs dotenv   (if not already present)
 *   3. Set MONGO_URI env var to the WRITE-ACCESS user connection string
 *      (harshas379_db_user, NOT client_readonly) — either export it,
 *      or put it in a .env file at project root.
 *   4. node scripts/seedUsers.js
 *
 * SAFE TO RE-RUN: uses upsert-by-email, so running it twice updates
 * the same 5 users instead of creating duplicates.
 * ---------------------------------------------------------------
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

// ---- ADJUST THIS if your User model lives somewhere else ----
import User from "../model/userModel.js";
// ---------------------------------------------------------------

const MONGO_URI =
  process.env.MONGO_URI ||
  "mongodb+srv://harshas379_db_user:test1234@cluster0.auiuvqn.mongodb.net/nightlifeDB";

// Collection names assume default mongoose pluralization
// (Genre -> genres, Category -> categories, Vibe -> vibes,
//  VibeCheckQuestion -> vibecheckquestions, City -> cities).
// If your models set an explicit `collection:` name that differs,
// update the strings below to match.
const COLLECTIONS = {
  genres: "genres",
  categories: "categories",
  vibes: "vibes",
  vibeCheckQuestions: "vibecheckquestions",
  cities: "cities",
};

const SAMPLE_USERS = [
  {
    first_name: "Aarav",
    last_name: "Sharma",
    username: "aarav_sharma",
    email: "aarav.sharma.seed@hii.life",
    phone_number: "+919876543210",
    gender: "Male",
    interested_in: "Women",
    sexuality: "Straight",
    pronouns: "he/him",
    bio: "Techno head, weekend explorer, always down for a rooftop set.",
    weight: 72,
    height: "5'10\"",
    country_code: 91,
    instagram_account: "@aarav.beats",
    spotify_account: "aaravsharma",
    snapchat_account: "aarav_snaps",
    hobbies: ["DJing", "Hiking", "Photography"],
    interests: ["Live music", "Street food", "Travel"],
    custom_music_genres: ["Melodic Techno"],
    custom_event_preferences: ["Warehouse parties"],
    custom_vibes: ["High energy"],
    latitude: 12.9716,
    longitude: 77.5946,
    radius: 25,
  },
  {
    first_name: "Priya",
    last_name: "Menon",
    username: "priya_menon",
    email: "priya.menon.seed@hii.life",
    phone_number: "+919876543211",
    gender: "Female",
    interested_in: "Men",
    sexuality: "Straight",
    pronouns: "she/her",
    bio: "Cocktail enthusiast and karaoke champion. Let's dance.",
    weight: 58,
    height: "5'4\"",
    country_code: 91,
    instagram_account: "@priya.vibes",
    spotify_account: "priyamenon",
    snapchat_account: "priya_snap",
    hobbies: ["Karaoke", "Mixology", "Salsa dancing"],
    interests: ["Live bands", "Wine tasting", "Comedy shows"],
    custom_music_genres: ["Bollywood Remix"],
    custom_event_preferences: ["Ladies night"],
    custom_vibes: ["Chill lounge"],
    latitude: 19.076,
    longitude: 72.8777,
    radius: 20,
  },
  {
    first_name: "Kabir",
    last_name: "Khan",
    username: "kabir_khan",
    email: "kabir.khan.seed@hii.life",
    phone_number: "+919876543212",
    gender: "Male",
    interested_in: "Everyone",
    sexuality: "Bisexual",
    pronouns: "he/him",
    bio: "Bartender by night, gym rat by day. Ask me for a good playlist.",
    weight: 80,
    height: "6'0\"",
    country_code: 91,
    instagram_account: "@kabir.pours",
    spotify_account: "kabirkhan",
    snapchat_account: "kabir_snaps",
    hobbies: ["Weightlifting", "Bartending", "Gaming"],
    interests: ["Craft beer", "EDM festivals", "Motorbikes"],
    custom_music_genres: ["Progressive House"],
    custom_event_preferences: ["Pool parties"],
    custom_vibes: ["Rooftop"],
    latitude: 28.7041,
    longitude: 77.1025,
    radius: 30,
  },
  {
    first_name: "Ananya",
    last_name: "Iyer",
    username: "ananya_iyer",
    email: "ananya.iyer.seed@hii.life",
    phone_number: "+919876543213",
    gender: "Female",
    interested_in: "Women",
    sexuality: "Lesbian",
    pronouns: "she/her",
    bio: "Indie music junkie. I collect vinyl and bad puns.",
    weight: 55,
    height: "5'3\"",
    country_code: 91,
    instagram_account: "@ananya.tunes",
    spotify_account: "ananyaiyer",
    snapchat_account: "ananya_snap",
    hobbies: ["Vinyl collecting", "Painting", "Journaling"],
    interests: ["Indie gigs", "Art walks", "Poetry slams"],
    custom_music_genres: ["Indie Folk"],
    custom_event_preferences: ["Open mic nights"],
    custom_vibes: ["Cozy acoustic"],
    latitude: 13.0827,
    longitude: 80.2707,
    radius: 22,
  },
  {
    first_name: "Rohan",
    last_name: "Verma",
    username: "rohan_verma",
    email: "rohan.verma.seed@hii.life",
    phone_number: "+919876543214",
    gender: "Male",
    interested_in: "Women",
    sexuality: "Straight",
    pronouns: "he/him",
    bio: "Startup founder who lives for Friday night house parties.",
    weight: 75,
    height: "5'11\"",
    country_code: 91,
    instagram_account: "@rohan.hustles",
    spotify_account: "rohanverma",
    snapchat_account: "rohan_snap",
    hobbies: ["Networking", "Golf", "Cycling"],
    interests: ["Whiskey tasting", "Live DJs", "Networking mixers"],
    custom_music_genres: ["Deep House"],
    custom_event_preferences: ["VIP lounge nights"],
    custom_vibes: ["Upscale"],
    latitude: 17.385,
    longitude: 78.4867,
    radius: 28,
  },
];

function randomReferralCode(seed) {
  return `HII${seed}${Math.floor(1000 + Math.random() * 9000)}`;
}

function pickRandom(arr, count) {
  if (!arr || arr.length === 0) return [];
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.min(count, shuffled.length)).map((d) => d._id);
}

async function ensureFallbackCity(db) {
  const cities = await db.collection(COLLECTIONS.cities).find({}).limit(5).toArray();
  if (cities.length > 0) return cities;

  console.warn(
    "⚠️  No City documents found — inserting one minimal fallback city ('Bengaluru'). " +
      "If your City schema requires more fields than {name}, edit this manually afterward."
  );
  const result = await db.collection(COLLECTIONS.cities).insertOne({
    name: "Bengaluru",
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  return [{ _id: result.insertedId, name: "Bengaluru" }];
}

async function run() {
  console.log("Connecting to MongoDB...");
  await mongoose.connect(MONGO_URI);
  const db = mongoose.connection.db;
  console.log("Connected. Fetching reference collections...");

  const genres = await db.collection(COLLECTIONS.genres).find({}).toArray();
  const categories = await db
    .collection(COLLECTIONS.categories)
    .find({ category_type: 1 }) // event types only, per getEventPreferences fix
    .toArray();
  const vibes = await db.collection(COLLECTIONS.vibes).find({}).toArray();
  const vibeCheckQuestions = await db
    .collection(COLLECTIONS.vibeCheckQuestions)
    .find({})
    .toArray();
  const cities = await ensureFallbackCity(db);

  console.log(
    `Found: ${genres.length} genres, ${categories.length} event-type categories, ` +
      `${vibes.length} vibes, ${vibeCheckQuestions.length} vibe check questions, ${cities.length} cities.`
  );

  if (genres.length === 0 || categories.length === 0 || vibes.length === 0) {
    console.warn(
      "⚠️  One or more of Genre/Category/Vibe is empty. Those fields will be left as [] " +
        "for the affected users. Seed those collections first for a truly 'every question answered' profile."
    );
  }
  if (vibeCheckQuestions.length === 0) {
    console.warn(
      "⚠️  VibeCheckQuestion collection is empty — vibe_checks will be left as [] for all 5 users."
    );
  }

  for (let i = 0; i < SAMPLE_USERS.length; i++) {
    const u = SAMPLE_USERS[i];
    const city = cities[i % cities.length];

    const vibeChecksForUser = vibeCheckQuestions.map((q) => ({
      question_id: q._id,
      answer: "Yes", // placeholder answer — adjust per question type if needed
    }));

    const userDoc = {
      email: u.email,
      phone_number: u.phone_number,
      password: "SeedPass@123", // pre-save hook hashes this automatically
      first_name: u.first_name,
      last_name: u.last_name,
      name: `${u.first_name} ${u.last_name}`,
      username: u.username,
      birthdate: new Date(1995 + i, i, 10 + i), // varied DOBs, age auto-computed on save
      weight: u.weight,
      height: u.height,
      bio: u.bio,
      country_code: u.country_code,
      gender: u.gender,
      profile_image: `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.username}`,

      is_verified: true,
      is_profile_completed: true,
      last_notified_profile_completion: 100,

      notification_push: true,
      notification_payment: true,
      event_reminder_notify: true,
      friend_invites_notify: true,
      msg_chats_notify: true,
      club_organizer_notify: true,
      promotion_offers_notify: true,

      login_type: "email",

      user_gallery: [
        {
          url: `https://picsum.photos/seed/${u.username}1/600/800`,
          type: "image",
          thumbnail_url: null,
          is_visible: true,
        },
        {
          url: `https://picsum.photos/seed/${u.username}2/600/800`,
          type: "image",
          thumbnail_url: null,
          is_visible: true,
        },
      ],

      city_id: city._id,
      preferred_cities: [
        {
          city_id: city._id,
          latitude: u.latitude,
          longitude: u.longitude,
          radius: u.radius,
        },
      ],

      referral_code: null,
      my_referral_code: randomReferralCode(u.username),

      latitude: u.latitude,
      longitude: u.longitude,
      radius: u.radius,

      instagram_account: u.instagram_account,
      spotify_account: u.spotify_account,
      snapchat_account: u.snapchat_account,

      hobbies: u.hobbies,

      music_genre: pickRandom(genres, 4),
      custom_music_genres: u.custom_music_genres,

      event_preferences: pickRandom(categories, 3),
      custom_event_preferences: u.custom_event_preferences,

      vibes: pickRandom(vibes, 3),
      custom_vibes: u.custom_vibes,
      vibe_checks: vibeChecksForUser,

      sexuality: u.sexuality,
      interested_in: u.interested_in,
      interests: u.interests,
      pronouns: u.pronouns,

      profile_visibility: {
        age: true,
        height: true,
        pronouns: true,
        location: true,
        hobbies: true,
        vibes: true,
        gallery: true,
        recent_events: true,
        recent_venues: true,
        instagram: true,
        spotify: true,
      },

      accepted_terms: true,
      accepted_privacy_policy: true,

      is_active: true,
      is_deleted: false,
      my_visibility: true,

      signup_step: 5, // fully through onboarding
      player_id: `seed-player-${u.username}`,
      device_type: i % 2 === 0 ? "android" : "ios",
    };

    const existing = await User.findOne({ email: u.email });
    if (existing) {
      Object.assign(existing, userDoc);
      // avoid re-hashing an unchanged password on every re-run
      existing.password = existing.password.startsWith("$2")
        ? existing.password
        : userDoc.password;
      await existing.save();
      console.log(`Updated existing user: ${u.email}`);
    } else {
      const newUser = new User(userDoc);
      await newUser.save();
      console.log(`Created user: ${u.email}`);
    }
  }

  console.log("Done seeding 5 users.");
  await mongoose.disconnect();
}

run().catch(async (err) => {
  console.error("Seed script failed:", err);
  await mongoose.disconnect();
  process.exit(1);
});