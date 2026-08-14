/**
 * patch_social_links_qa_seed.mjs
 *
 * Sets Instagram / Spotify / Snapchat as FULL clickable URLs (not just
 * bare handles) for the 5 qa-seed-* test users, since bare handles
 * (e.g. "maya.afterdark") were showing up blank in the app - likely
 * because the UI expects a full URL to display/launch, not a handle it
 * has to build a URL from itself.
 *
 * Overwrites instagram_account / spotify_account / snapchat_account
 * unconditionally for these 5 accounts (they're fake test users, so
 * there's nothing real to preserve here) - scoped ONLY to username
 * matching /^qa-seed-/, so it can never touch a real user.
 *
 * ============================ HOW TO RUN ============================
 *   node patch_social_links_qa_seed.mjs "<your-mongodb-connection-string>"
 *
 * Safe to re-run.
 */

import { MongoClient } from "mongodb";

const connectionString = process.argv[2];
if (!connectionString) {
  console.error('Usage: node patch_social_links_qa_seed.mjs "<your-mongodb-connection-string>"');
  process.exit(1);
}

const client = new MongoClient(connectionString);

// Full URL versions, built from the handles originally used in
// seed_test_users_v2.mjs so they stay consistent with each persona.
const socialLinks = {
  "qa-seed-maya": {
    instagram_account: "https://www.instagram.com/maya.afterdark",
    spotify_account: "https://open.spotify.com/user/mayachen_beats",
    snapchat_account: "https://www.snapchat.com/add/mayac.snaps",
  },
  "qa-seed-ravi": {
    instagram_account: "https://www.instagram.com/ravi.eats",
    spotify_account: "https://open.spotify.com/user/ravikapoor",
    snapchat_account: "https://www.snapchat.com/add/ravik.snap",
  },
  "qa-seed-zara": {
    instagram_account: "https://www.instagram.com/zara.thrifts",
    spotify_account: "https://open.spotify.com/user/zaraali_",
    snapchat_account: "https://www.snapchat.com/add/zaraa.snap",
  },
  "qa-seed-leo": {
    instagram_account: "https://www.instagram.com/leo.pours",
    spotify_account: "https://open.spotify.com/user/leofontaine",
    snapchat_account: "https://www.snapchat.com/add/leof.snap",
  },
  "qa-seed-priya": {
    instagram_account: "https://www.instagram.com/priya.thrifts",
    spotify_account: "https://open.spotify.com/user/priyanair_",
    snapchat_account: "https://www.snapchat.com/add/priyan.snap",
  },
};

try {
  await client.connect();
  const db = client.db();
  const usersCol = db.collection("users");

  console.log("Setting full Instagram/Spotify/Snapchat URLs for qa-seed-* test users...\n");

  for (const [username, links] of Object.entries(socialLinks)) {
    const result = await usersCol.updateOne(
      { username },
      { $set: { ...links, updatedAt: new Date() } }
    );

    if (result.matchedCount === 0) {
      console.log(`  (!) No user found with username "${username}" - skipped.`);
    } else {
      console.log(`  - ${username}: set instagram, spotify, snapchat URLs`);
    }
  }

  console.log("\nDone. If these still show blank in the app after this, the issue is likely on the");
  console.log("Flutter display side (e.g. a field-name mismatch between what the API returns and");
  console.log("what the profile screen widget reads) rather than missing data in the DB.");
} finally {
  await client.close();
}
