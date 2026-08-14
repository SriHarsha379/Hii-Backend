/**
 * patch_test_users.mjs
 *
 * Patches the 5 existing qa-seed-* test users (created by
 * seed_test_users_v2.mjs) to fill in the fields that script left blank:
 *   - weight
 *   - country_code
 *   - interests
 *   - phone_number (fake but realistic-looking, non-dialable range)
 *
 * Does NOT touch password / login_type - these stay browse-only test
 * accounts on purpose, per your call.
 *
 * ============================ HOW TO RUN ============================
 *   node patch_test_users.mjs "<your-mongodb-connection-string>"
 *
 * Run from inside "Hii Backend" (same place the other scripts ran from).
 * Safe to re-run - it just overwrites the same 4 fields each time.
 */

import { MongoClient } from "mongodb";

const connectionString = process.argv[2];
if (!connectionString) {
  console.error('Usage: node patch_test_users.mjs "<your-mongodb-connection-string>"');
  process.exit(1);
}

const client = new MongoClient(connectionString);

// Extra fields per persona, matched by username.
const patches = {
  "qa-seed-maya": {
    weight: 58,
    country_code: 91,
    interests: ["Live music", "Street food", "Travel", "Vintage fashion"],
    phone_number: "+919000000001",
  },
  "qa-seed-ravi": {
    weight: 78,
    country_code: 91,
    interests: ["Craft beer", "Comedy shows", "Football", "Cooking shows"],
    phone_number: "+919000000002",
  },
  "qa-seed-zara": {
    weight: 54,
    country_code: 91,
    interests: ["Thrift shopping", "Hiking trails", "Baking", "Indie films"],
    phone_number: "+919000000003",
  },
  "qa-seed-leo": {
    weight: 82,
    country_code: 91,
    interests: ["Mixology", "Chess", "Skateboarding", "Jazz bars"],
    phone_number: "+919000000004",
  },
  "qa-seed-priya": {
    weight: 56,
    country_code: 91,
    interests: ["Salsa dancing", "Journaling", "Rooftop bars", "Thrifting"],
    phone_number: "+919000000005",
  },
};

try {
  await client.connect();
  const db = client.db();
  const usersCol = db.collection("users");

  console.log("Patching qa-seed-* test users with weight, country_code, interests, phone_number...\n");

  for (const [username, fields] of Object.entries(patches)) {
    const result = await usersCol.updateOne(
      { username },
      { $set: { ...fields, updatedAt: new Date() } }
    );

    if (result.matchedCount === 0) {
      console.log(`  (!) No user found with username "${username}" - skipped. Run seed_test_users_v2.mjs first.`);
    } else {
      console.log(`  - ${username}: updated (weight=${fields.weight}, country_code=${fields.country_code}, phone_number=${fields.phone_number}, interests=${fields.interests.length})`);
    }
  }

  console.log("\nDone. weight / country_code / interests / phone_number are now filled for all matched users.");
  console.log("password/login_type left untouched - these remain browse-only test accounts.");
} finally {
  await client.close();
}
