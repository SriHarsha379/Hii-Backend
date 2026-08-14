/**
 * fix_ad_images_v2.mjs
 *
 * Upgrade on fix_ad_images.mjs: that version only fixed ads.ad_image if it
 * was EMPTY, but your data showed the real problem - 5 of your 6 ads have
 * an ad_image filename that was never actually uploaded (or got deleted),
 * so the URL just 404s and the app shows a blank/placeholder card.
 *
 * This version checks each ad's ad_image against what's actually sitting
 * in your local `uploads` folder and only replaces the ones that are
 * genuinely missing a file - it leaves the one that's already correct
 * (ad_image-1774428448745-164298378.webp) completely alone.
 *
 * Run this from your backend project root, where the `uploads` folder
 * lives (same place you ran `ls uploads/ad_image*` from):
 *
 *   node fix_ad_images_v2.mjs "<your-mongodb-connection-string>"
 *
 * By default it checks ./uploads - pass a second argument if your uploads
 * folder is somewhere else, e.g.:
 *
 *   node fix_ad_images_v2.mjs "<connection-string>" ./some/other/uploads
 */

import { MongoClient } from "mongodb";
import fs from "fs";
import path from "path";

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
const uploadsDir = process.argv[3] || "./uploads";

if (!connectionString) {
  console.error(
    'Usage: node fix_ad_images_v2.mjs "<your-mongodb-connection-string>" [uploads-folder-path]'
  );
  process.exit(1);
}

if (!fs.existsSync(uploadsDir)) {
  console.error(`Uploads folder not found at: ${path.resolve(uploadsDir)}`);
  console.error("Pass the correct path as a second argument if it's elsewhere.");
  process.exit(1);
}

const filesOnDisk = new Set(fs.readdirSync(uploadsDir));
console.log(`Found ${filesOnDisk.size} file(s) in ${path.resolve(uploadsDir)}`);

const client = new MongoClient(connectionString);

try {
  await client.connect();
  const db = client.db();
  const col = db.collection(ADS_COLLECTION);

  const existingAds = await col.find({ is_deleted: { $ne: true } }).toArray();
  console.log(`\nFound ${existingAds.length} active ad(s) in '${ADS_COLLECTION}':`);

  let fixedCount = 0;
  let okCount = 0;

  for (let i = 0; i < existingAds.length; i++) {
    const ad = existingAds[i];
    const filename = (ad.ad_image || "").trim();
    const hasValue = filename.length > 0;
    // A value that's already a full URL (starts with http) is assumed
    // fine as-is - only bare filenames get checked against the uploads
    // folder.
    const isBareFilename = hasValue && !filename.startsWith("http");
    const fileExists = isBareFilename && filesOnDisk.has(filename);

    if (!hasValue || (isBareFilename && !fileExists)) {
      const replacement = PLACEHOLDER_IMAGES[i % PLACEHOLDER_IMAGES.length];
      await col.updateOne(
        { _id: ad._id },
        { $set: { ad_image: replacement, updatedAt: new Date() } }
      );
      console.log(
        `  BROKEN  _id: ${ad._id}  "${filename || "(empty)"}" -> not found on disk -> replaced with ${replacement}`
      );
      fixedCount++;
    } else {
      console.log(`  OK      _id: ${ad._id}  "${filename}"`);
      okCount++;
    }
  }

  console.log(`\n${okCount} ad(s) already pointed to a real file - left untouched.`);
  console.log(`${fixedCount} ad(s) had a missing/broken file - replaced with a working placeholder.`);
  console.log(
    "\nDone. Restart the app / pull-to-refresh the feed and every ad card should now show an image."
  );
} finally {
  await client.close();
}
