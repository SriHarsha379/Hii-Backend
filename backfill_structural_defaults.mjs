/**
 * backfill_structural_defaults.mjs
 *
 * Applies to EVERY user in the collection (real signups + test accounts).
 *
 * Deliberately limited to STRUCTURAL / TECHNICAL fields only - things
 * that are schema plumbing, not personal facts about a real person:
 *   - notification toggles (default true)
 *   - profile_visibility sub-fields (default true)
 *   - is_active, is_deleted, my_visibility (sane defaults)
 *   - login_type (default "email")
 *   - signup_step, referral_code, my_referral_code
 *   - initializing array fields (hobbies, interests, music_genre,
 *     event_preferences, vibes, vibe_checks, custom_*, user_gallery,
 *     preferred_cities) to [] ONLY if the field is entirely missing -
 *     this does not fabricate content, it just makes the field exist
 *     as an empty array instead of undefined.
 *
 * Deliberately DOES NOT touch: bio, gender, sexuality, interested_in,
 * pronouns, weight, height, phone_number, profile_image, social handles,
 * hobbies/interests CONTENT, taste preference CONTENT, is_verified,
 * is_profile_completed, or anything OTP/auth-related. Those represent
 * real facts about real people or real security state and must only
 * ever be set by the actual user or actual auth flow.
 *
 * NEVER overwrites a field that already has a value - only fills in
 * where a field is completely undefined/missing on the document.
 *
 * ============================ HOW TO RUN ============================
 *   node backfill_structural_defaults.mjs "<your-mongodb-connection-string>"
 *
 * Safe to re-run - every update is guarded by "field does not exist".
 */

import { MongoClient } from "mongodb";

const connectionString = process.argv[2];
if (!connectionString) {
  console.error('Usage: node backfill_structural_defaults.mjs "<your-mongodb-connection-string>"');
  process.exit(1);
}

const client = new MongoClient(connectionString);

// Simple scalar/object defaults - applied via $set with $ifNull-style
// guard (field must not already exist).
const scalarDefaults = {
  notification_push: true,
  notification_payment: true,
  event_reminder_notify: true,
  friend_invites_notify: true,
  msg_chats_notify: true,
  club_organizer_notify: true,
  promotion_offers_notify: true,
  is_active: true,
  is_deleted: false,
  my_visibility: true,
  login_type: "email",
  signup_step: 0,
  referral_code: null,
};

const profileVisibilityDefaults = {
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
};

// Array fields to initialize as [] only if entirely missing.
const arrayFieldDefaults = [
  "hobbies",
  "interests",
  "music_genre",
  "custom_music_genres",
  "event_preferences",
  "custom_event_preferences",
  "vibes",
  "custom_vibes",
  "vibe_checks",
  "user_gallery",
  "preferred_cities",
];

function genReferralCode(user) {
  const base = (user.username || user.email || user._id.toString()).replace(/[^a-zA-Z0-9]/g, "");
  return `HII${base.slice(0, 6).toUpperCase()}${Math.floor(1000 + Math.random() * 9000)}`;
}

try {
  await client.connect();
  const db = client.db();
  const usersCol = db.collection("users");

  const cursor = usersCol.find({});
  let total = 0;
  let updated = 0;

  for await (const user of cursor) {
    total++;
    const setFields = {};

    // Scalars - only if missing
    for (const [field, value] of Object.entries(scalarDefaults)) {
      if (user[field] === undefined) {
        setFields[field] = value;
      }
    }

    // my_referral_code - generate only if missing/blank
    if (!user.my_referral_code) {
      setFields.my_referral_code = genReferralCode(user);
    }

    // profile_visibility - fill missing sub-fields only, keep any existing ones
    if (user.profile_visibility === undefined) {
      setFields.profile_visibility = profileVisibilityDefaults;
    } else {
      for (const [key, value] of Object.entries(profileVisibilityDefaults)) {
        if (user.profile_visibility[key] === undefined) {
          setFields[`profile_visibility.${key}`] = value;
        }
      }
    }

    // Array fields - only if the field is entirely absent
    for (const field of arrayFieldDefaults) {
      if (user[field] === undefined) {
        setFields[field] = [];
      }
    }

    if (Object.keys(setFields).length > 0) {
      await usersCol.updateOne({ _id: user._id }, { $set: setFields });
      updated++;
    }
  }

  console.log(`Scanned ${total} users. Backfilled structural defaults on ${updated} user(s).`);
  console.log("No personal fields (bio, gender, sexuality, interests content, photos, etc.) were touched.");
} finally {
  await client.close();
}
