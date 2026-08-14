/**
 * fix_ad_images.mjs
 *
 * Same thing as fix_ad_images.js, but runs as a plain Node.js script using
 * the `mongodb` driver directly - no mongosh install needed, since
 * `mongodb` is already a dependency of your `mongoose` package and should
 * already be sitting in this project's node_modules.
 *
 * Run it from inside your backend project folder (where node_modules
 * lives):
 *
 *   node fix_ad_images.mjs "mongodb+srv://Nightlifedb:807496%40Bb@hiiapplife.8suffwe.mongodb.net/nightlifeDB?retryWrites=true&w=majority&appName=HiiAppLife"
 *
 * (pass your connection string as the one argument - kept out of the file
 * itself so you're not committing credentials into a script)
 *
 * Non-destructive, same as before:
 *   1. Prints every ad currently in the collection.
 *   2. Fills in a placeholder image ONLY for ads with an empty/missing
 *      ad_image - never touches one that's already set.
 *   3. If the collection is completely empty, inserts 6 sample ads.
 */

import { MongoClient } from "mongodb";

const ADS_COLLECTION = "ads";

const PLACEHOLDER_IMAGES = [
  "https://picsum.photos/seed/nightlife-ad-1/800/1200",
  "https://picsum.photos/seed/nightlife-ad-2/800/1200",
  "https://picsum.photos/seed/nightlife-ad-3/800/1200",
  "https://picsum.photos/seed/nightlife-ad-4/800/1200",
  "https://picsum.photos/seed/nightlife-ad-5/800/1200",
  "https://picsum.photos/seed/nightlife-ad-6/800/1200",
];

const connectionString = process.argv[2];
if (!connectionString) {
  console.error(
    "Usage: node fix_ad_images.mjs \"<your-mongodb-connection-string>\""
  );
  process.exit(1);
}

const client = new MongoClient(connectionString);

try {
  await client.connect();
  // Uses whatever database is named in the connection string path
  // (nightlifeDB in your case) - no need to pass a separate db name.
  const db = client.db();
  const col = db.collection(ADS_COLLECTION);

  /* ===== 1. SHOW CURRENT STATE ===== */
  const existingAds = await col.find({ is_deleted: { $ne: true } }).toArray();
  console.log(`Found ${existingAds.length} active ad(s) in '${ADS_COLLECTION}':`);
  for (const ad of existingAds) {
    const hasImage = ad.ad_image && ad.ad_image.trim().length > 0;
    console.log(`  - _id: ${ad._id}  ad_image: ${hasImage ? ad.ad_image : "(EMPTY)"}`);
  }

  /* ===== 2. FIX ANY WITH A MISSING/EMPTY ad_image ===== */
  let fixedCount = 0;
  for (let i = 0; i < existingAds.length; i++) {
    const ad = existingAds[i];
    const hasImage = ad.ad_image && ad.ad_image.trim().length > 0;
    if (!hasImage) {
      const replacement = PLACEHOLDER_IMAGES[i % PLACEHOLDER_IMAGES.length];
      await col.updateOne(
        { _id: ad._id },
        { $set: { ad_image: replacement, updatedAt: new Date() } }
      );
      console.log(`  Fixed _id: ${ad._id} -> ${replacement}`);
      fixedCount++;
    }
  }

  if (fixedCount > 0) {
    console.log(`\nFilled in ${fixedCount} ad(s) that had no image.`);
  }

  /* ===== 3. IF COLLECTION IS COMPLETELY EMPTY, SEED SAMPLES ===== */
  if (existingAds.length === 0) {
    const now = new Date();
    const sampleAds = PLACEHOLDER_IMAGES.map((url) => ({
      ad_image: url,
      is_deleted: false,
      createdAt: now,
      updatedAt: now,
    }));

    const result = await col.insertMany(sampleAds);
    console.log(
      `Collection was empty - inserted ${Object.keys(result.insertedIds).length} sample ads.`
    );
  }

  console.log("\nDone. Restart the app / pull-to-refresh the feed and ad cards should now show real images.");
} finally {
  await client.close();
}
