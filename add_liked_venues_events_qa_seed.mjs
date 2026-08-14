/**
 * add_liked_venues_events_qa_seed.mjs
 *
 * Adds "liked" venues and events for the 5 qa-seed-* test users, using
 * the real VenueLike / EventLike collections (not fields on User) per
 * src/model/venueLikeModel.js and src/model/eventLikeModel.js:
 *
 *   VenueLike: { user_id, venue_id, is_liked, is_active }
 *   EventLike: { user_id, event_id, is_liked, is_active }
 *
 * Both have a unique index on (user_id, venue_id) / (user_id, event_id),
 * so this script uses upsert - safe to re-run, never creates duplicates.
 *
 * Picks a random handful of REAL venues/events straight from your
 * `venues` / `events` collections rather than fabricating ObjectIds.
 *
 * Scoped ONLY to username matching /^qa-seed-/, so it can't touch a
 * real user's likes even by accident.
 *
 * ============================ HOW TO RUN ============================
 *   node add_liked_venues_events_qa_seed.mjs "<your-mongodb-connection-string>"
 */

import { MongoClient } from "mongodb";

const connectionString = process.argv[2];
if (!connectionString) {
  console.error('Usage: node add_liked_venues_events_qa_seed.mjs "<your-mongodb-connection-string>"');
  process.exit(1);
}

const client = new MongoClient(connectionString);

const LIKES_PER_USER_MIN = 3;
const LIKES_PER_USER_MAX = 6;

function pickN(arr, n) {
  if (arr.length === 0) return [];
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(n, arr.length));
}

function randomCount() {
  return LIKES_PER_USER_MIN + Math.floor(Math.random() * (LIKES_PER_USER_MAX - LIKES_PER_USER_MIN + 1));
}

try {
  await client.connect();
  const db = client.db();

  const usersCol = db.collection("users");
  const venuesCol = db.collection("venues");
  const eventsCol = db.collection("events");
  const venueLikesCol = db.collection("venuelikes");
  const eventLikesCol = db.collection("eventlikes");

  const testUsers = await usersCol
    .find({ username: { $regex: /^qa-seed-/ } })
    .toArray();

  if (testUsers.length === 0) {
    console.log("No qa-seed-* users found. Run seed_test_users_v2.mjs first.");
    process.exit(0);
  }

  const [venues, events] = await Promise.all([
    venuesCol.find({ is_deleted: { $ne: true } }).toArray(),
    eventsCol.find({ is_deleted: { $ne: true } }).toArray(),
  ]);

  console.log(`Found ${testUsers.length} qa-seed-* user(s), ${venues.length} venues, ${events.length} events.\n`);

  if (venues.length === 0) console.log("  (!) No venues found - skipping venue likes for everyone.");
  if (events.length === 0) console.log("  (!) No events found - skipping event likes for everyone.");

  for (const user of testUsers) {
    const chosenVenues = pickN(venues, randomCount());
    const chosenEvents = pickN(events, randomCount());

    let venueLikesWritten = 0;
    for (const venue of chosenVenues) {
      const result = await venueLikesCol.updateOne(
        { user_id: user._id, venue_id: venue._id },
        { $set: { is_liked: true, is_active: true, updatedAt: new Date() },
          $setOnInsert: { createdAt: new Date() } },
        { upsert: true }
      );
      if (result.upsertedCount > 0 || result.modifiedCount > 0) venueLikesWritten++;
    }

    let eventLikesWritten = 0;
    for (const event of chosenEvents) {
      const result = await eventLikesCol.updateOne(
        { user_id: user._id, event_id: event._id },
        { $set: { is_liked: true, is_active: true, updatedAt: new Date() },
          $setOnInsert: { createdAt: new Date() } },
        { upsert: true }
      );
      if (result.upsertedCount > 0 || result.modifiedCount > 0) eventLikesWritten++;
    }

    console.log(`  - ${user.username}: liked ${chosenVenues.length} venue(s), ${chosenEvents.length} event(s)`);
  }

  console.log("\nDone. VenueLike/EventLike documents created (or refreshed) for all 5 test users.");
} finally {
  await client.close();
}
