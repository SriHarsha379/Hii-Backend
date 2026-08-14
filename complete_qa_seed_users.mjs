/**
 * complete_qa_seed_users.mjs
 *
 * Scoped ONLY to username matching /^qa-seed-/ - the 5 known-fake test
 * accounts created by seed_test_users_v2.mjs and patched by
 * patch_test_users.mjs. Since these aren't real people, it's fine to
 * fill in every remaining schema field completely.
 *
 * Fills whatever is still missing: login_type, device/player fields,
 * socialkey placeholders, is_another_email_verify/another_email,
 * profile_visibility, notification toggles, referral_code.
 *
 * Deliberately still skips: password/login capability (kept browse-only
 * per earlier decision) and all OTP/auth-internal fields (otp,
 * email_otp, forget_otp, expiry_time_otp) since those are runtime auth
 * state, not "profile questions".
 *
 * NEVER overwrites a field that's already set (e.g. won't touch bio,
 * hobbies, music_genre etc. from seed_test_users_v2.mjs or the weight/
 * country_code/interests/phone_number from patch_test_users.mjs).
 *
 * ============================ HOW TO RUN ============================
 *   node complete_qa_seed_users.mjs "<your-mongodb-connection-string>"
 *
 * Safe to re-run.
 */

import { MongoClient } from "mongodb";

const connectionString = process.argv[2];
if (!connectionString) {
  console.error('Usage: node complete_qa_seed_users.mjs "<your-mongodb-connection-string>"');
  process.exit(1);
}

const client = new MongoClient(connectionString);

const perUserExtras = {
  "qa-seed-maya": {
    another_email: "maya.chen.alt@qa-seed.test",
    socialkey_google: "qa-seed-maya-google-key",
    player_id: "qa-seed-maya-player-id",
    device_type: "android",
  },
  "qa-seed-ravi": {
    another_email: "ravi.kapoor.alt@qa-seed.test",
    socialkey_google: "qa-seed-ravi-google-key",
    player_id: "qa-seed-ravi-player-id",
    device_type: "ios",
  },
  "qa-seed-zara": {
    another_email: "zara.ali.alt@qa-seed.test",
    socialkey_google: "qa-seed-zara-google-key",
    player_id: "qa-seed-zara-player-id",
    device_type: "android",
  },
  "qa-seed-leo": {
    another_email: "leo.fontaine.alt@qa-seed.test",
    socialkey_google: "qa-seed-leo-google-key",
    player_id: "qa-seed-leo-player-id",
    device_type: "ios",
  },
  "qa-seed-priya": {
    another_email: "priya.nair.alt@qa-seed.test",
    socialkey_google: "qa-seed-priya-google-key",
    player_id: "qa-seed-priya-player-id",
    device_type: "android",
  },
};

const sharedDefaults = {
  login_type: "email",
  is_another_email_verify: true,
  notification_push: true,
  notification_payment: true,
  event_reminder_notify: true,
  friend_invites_notify: true,
  msg_chats_notify: true,
  club_organizer_notify: true,
  promotion_offers_notify: true,
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
  referral_code: null,
};

try {
  await client.connect();
  const db = client.db();
  const usersCol = db.collection("users");

  const testUsers = await usersCol.find({ username: { $regex: /^qa-seed-/ } }).toArray();

  if (testUsers.length === 0) {
    console.log("No qa-seed-* users found. Run seed_test_users_v2.mjs first.");
  } else {
    console.log(`Found ${testUsers.length} qa-seed-* user(s). Filling remaining blank fields...\n`);
  }

  for (const user of testUsers) {
    const setFields = {};

    // Shared defaults - only if missing
    for (const [field, value] of Object.entries(sharedDefaults)) {
      if (field === "profile_visibility") {
        if (user.profile_visibility === undefined) {
          setFields.profile_visibility = value;
        } else {
          for (const [k, v] of Object.entries(value)) {
            if (user.profile_visibility[k] === undefined) {
              setFields[`profile_visibility.${k}`] = v;
            }
          }
        }
      } else if (user[field] === undefined) {
        setFields[field] = value;
      }
    }

    // Per-user extras - only if missing
    const extras = perUserExtras[user.username] || {};
    for (const [field, value] of Object.entries(extras)) {
      if (user[field] === undefined) {
        setFields[field] = value;
      }
    }

    if (Object.keys(setFields).length > 0) {
      await usersCol.updateOne({ _id: user._id }, { $set: setFields });
      console.log(`  - ${user.username}: filled ${Object.keys(setFields).length} field(s)`);
    } else {
      console.log(`  - ${user.username}: already complete, nothing to do`);
    }
  }

  console.log("\nDone. password/login_type kept browse-only; OTP/auth-internal fields untouched.");
} finally {
  await client.close();
}
