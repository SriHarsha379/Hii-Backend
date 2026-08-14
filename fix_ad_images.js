/**
 * fix_ad_images.js
 *
 * Your feed already injects ad cards (see injectAds() in feedController.js -
 * it pulls from the `ads` collection and inserts one every 2-4 cards using
 * the `ad_image` field). If ad cards are showing up but blank/placeholder,
 * it's almost always because `ad_image` is empty or points to a file that
 * was never actually uploaded to your server.
 *
 * This script is non-destructive:
 *   1. Prints every ad currently in the collection so you can see which
 *      ones have a real ad_image and which don't.
 *   2. Fills in a working placeholder image ONLY for ads whose ad_image is
 *      empty/missing - it never overwrites an ad_image that's already set,
 *      so any real ad creative you've already uploaded is left alone.
 *   3. If the collection is completely empty, inserts 6 fresh sample ads
 *      so you have something to test the swipe-feed injection with.
 *
 * Field name matches your actual schema (model/adsModel.js):
 *   { ad_image: String (required), expiry_date: Date, is_deleted: Boolean }
 *
 * Images are full https:// URLs (picsum.photos), which your app's
 * _adImage() helper in home_Screen.dart already passes through unchanged
 * via isNetworkUrl() - no upload/hosting needed for these to render.
 *
 * ============================ HOW TO RUN ============================
 *   mongosh "<your-connection-string>" fix_ad_images.js
 *
 * COLLECTION NAME: assumes `ads` (default pluralization of your `Ads`
 * mongoose model). Change ADS_COLLECTION below if it's named differently.
 */

const ADS_COLLECTION = "ads";

// Placeholder ad creatives - swap these for your real ad images whenever
// you have them; these just get things visibly working in the meantime.
const PLACEHOLDER_IMAGES = [
  "https://picsum.photos/seed/nightlife-ad-1/800/1200",
  "https://picsum.photos/seed/nightlife-ad-2/800/1200",
  "https://picsum.photos/seed/nightlife-ad-3/800/1200",
  "https://picsum.photos/seed/nightlife-ad-4/800/1200",
  "https://picsum.photos/seed/nightlife-ad-5/800/1200",
  "https://picsum.photos/seed/nightlife-ad-6/800/1200",
];

const col = db.getCollection(ADS_COLLECTION);

/* ===== 1. SHOW CURRENT STATE ===== */
const existingAds = col.find({ is_deleted: { $ne: true } }).toArray();
print(`Found ${existingAds.length} active ad(s) in '${ADS_COLLECTION}':`);
existingAds.forEach((ad) => {
  const hasImage = ad.ad_image && ad.ad_image.trim().length > 0;
  print(`  - _id: ${ad._id}  ad_image: ${hasImage ? ad.ad_image : "(EMPTY)"}`);
});

/* ===== 2. FIX ANY WITH A MISSING/EMPTY ad_image ===== */
let fixedCount = 0;
existingAds.forEach((ad, index) => {
  const hasImage = ad.ad_image && ad.ad_image.trim().length > 0;
  if (!hasImage) {
    const replacement = PLACEHOLDER_IMAGES[index % PLACEHOLDER_IMAGES.length];
    col.updateOne(
      { _id: ad._id },
      { $set: { ad_image: replacement, updatedAt: new Date() } }
    );
    print(`  Fixed _id: ${ad._id} -> ${replacement}`);
    fixedCount++;
  }
});

if (fixedCount > 0) {
  print(`\nFilled in ${fixedCount} ad(s) that had no image.`);
}

/* ===== 3. IF COLLECTION IS COMPLETELY EMPTY, SEED SAMPLES ===== */
if (existingAds.length === 0) {
  const now = new Date();
  const sampleAds = PLACEHOLDER_IMAGES.map((url) => ({
    ad_image: url,
    is_deleted: false,
    createdAt: now,
    updatedAt: now,
    // No expiry_date - injectAds' query treats a missing expiry_date as
    // "never expires" ($exists: false branch).
  }));

  const result = col.insertMany(sampleAds);
  print(`Collection was empty - inserted ${Object.keys(result.insertedIds).length} sample ads.`);
}

print("\nDone. Restart the app / pull-to-refresh the feed and ad cards should now show real images.");