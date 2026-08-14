/**
 * seed_test_users_v2.mjs
 *
 * Creates 5 fully-answered test users, correcting everything the v1 seed
 * script got wrong once we actually had the backend source to check
 * against. The big difference: music_genre, event_preferences, vibes, and
 * vibe_checks are all real ObjectId REFERENCES to other collections
 * (Genre / Category / Vibe / VibeCheckQuestion) - not embedded text - so
 * this script fetches whatever actually exists in your DB for each of
 * those and builds users around real IDs. No more fabricated ObjectIds
 * that reference nothing.
 *
 * Every user gets every question answered: name, age, height, gender,
 * pronouns, sexuality, interested_in, bio, hobbies, 2-3 music genres, 2-3
 * event preferences, 2-3 vibes, an answer to every active vibe check
 * question in your DB, Instagram/Spotify/Snapchat, a city, and a photo
 * gallery.
 *
 * ============================ HOW TO RUN ============================
 *   node seed_test_users_v2.mjs "<your-mongodb-connection-string>"
 *
 * Run it from inside your backend project folder (same place
 * fix_ad_images_v2.mjs worked from), so node_modules/mongodb resolves.
 *
 * Re-running is safe - it deletes any previous users whose username
 * starts with "qa-seed-" before inserting fresh ones.
 *
 * ============================ IF A COLLECTION IS EMPTY ============================
 * If you have zero genres, zero categories, zero vibes, zero vibe check
 * questions, or zero cities set up yet, this script prints a warning and
 * just skips that field for all 5 users (leaving it as an empty array)
 * rather than failing outright. Set those up in your admin panel first if
 * you want fully-populated test users.
 */

import { MongoClient, ObjectId } from "mongodb";

const connectionString = process.argv[2];
if (!connectionString) {
  console.error('Usage: node seed_test_users_v2.mjs "<your-mongodb-connection-string>"');
  process.exit(1);
}

const client = new MongoClient(connectionString);

// Personas - identity/text fields we fully control ourselves.
const personas = [
  {
    username: "qa-seed-maya",
    first_name: "Maya",
    last_name: "Chen",
    name: "Maya Chen",
    birthdate: new Date("1998-04-12"),
    age: 27,
    height: "5'6\"",
    gender: "Female",
    profile_image: "https://i.pravatar.cc/500?img=47",
    bio: "Rooftop bars, vinyl records, and finding the best late-night tacos in town. Say hi if you're into either.",
    pronouns: "She/Her",
    sexuality: "Bisexual",
    interested_in: "Everyone",
    hobbies: ["Dancing", "Photography", "Vinyl collecting", "Hiking"],
    instagram_account: "maya.afterdark",
    spotify_account: "mayachen_beats",
    snapchat_account: "mayac_snaps",
    galleryUrls: [
      "https://picsum.photos/seed/maya1/800/1000",
      "https://picsum.photos/seed/maya2/800/1000",
      "https://picsum.photos/seed/maya3/800/1000",
      "https://picsum.photos/seed/maya4/800/1000",
    ],
    answerBank: [
      "Rooftop bar at golden hour, then dancing till 2am.",
      "Loud laugh, louder playlists, always down for one more song.",
      "Somewhere with a skyline view and a great DJ.",
      "Coffee to start the day, cocktails to end it right.",
      "Finding the best late-night food spot after the bar closes.",
      "Anywhere my friends are - the plan matters less than the people.",
    ],
  },
  {
    username: "qa-seed-ravi",
    first_name: "Ravi",
    last_name: "Kapoor",
    name: "Ravi Kapoor",
    birthdate: new Date("1995-11-02"),
    age: 30,
    height: "5'11\"",
    gender: "Male",
    profile_image: "https://i.pravatar.cc/500?img=13",
    bio: "Here for good conversation and better cocktails.",
    pronouns: "He/Him",
    sexuality: "Straight",
    interested_in: "Women",
    hobbies: ["Cooking", "Football", "Standup comedy"],
    instagram_account: "ravi.eats",
    spotify_account: "ravikapoor",
    snapchat_account: "ravik.snap",
    galleryUrls: [
      "https://picsum.photos/seed/ravi1/800/1000",
      "https://picsum.photos/seed/ravi2/800/1000",
      "https://picsum.photos/seed/ravi3/800/1000",
    ],
    answerBank: [
      "Don't Stop Believin' - no shame in it.",
      "They think I'm serious. I just have a slow-burn sense of humor.",
      "A good match on TV and better company on the couch.",
      "Cooking for people is basically my love language.",
      "Football on Sundays is non-negotiable.",
      "Berlin - purely for the food scene, not what you're thinking.",
    ],
  },
  {
    username: "qa-seed-zara",
    first_name: "Zara",
    last_name: "Ali",
    name: "Zara Ali",
    birthdate: new Date("2001-07-19"),
    age: 24,
    height: "5'5\"",
    gender: "Female",
    profile_image: "https://i.pravatar.cc/500?img=32",
    bio: "Thrift store finds, sunrise hikes, and a playlist for every mood.",
    pronouns: "She/Her",
    sexuality: "Lesbian",
    interested_in: "Women",
    hobbies: ["Thrifting", "Journaling", "Hiking", "Baking"],
    instagram_account: "zara.thrifts",
    spotify_account: "zaraali_",
    snapchat_account: "zaraa.snap",
    galleryUrls: [
      "https://picsum.photos/seed/zara1/800/1000",
      "https://picsum.photos/seed/zara2/800/1000",
      "https://picsum.photos/seed/zara3/800/1000",
    ],
    answerBank: [
      "Sunrise hike, then brunch with whoever's up for it.",
      "The friend who somehow always finds the best hole-in-the-wall spot.",
      "A good playlist and zero plans.",
      "Chai, and I will fight for it.",
      "Iceland - glaciers and hot springs, need I say more.",
      "People assume I'm quiet. I just talk when it's worth saying something.",
    ],
  },
  {
    username: "qa-seed-leo",
    first_name: "Leo",
    last_name: "Fontaine",
    name: "Leo Fontaine",
    birthdate: new Date("1993-02-27"),
    age: 32,
    height: "6'0\"",
    gender: "Male",
    profile_image: "https://i.pravatar.cc/500?img=51",
    bio: "Amateur mixologist, professional over-orderer of appetizers.",
    pronouns: "He/Him",
    sexuality: "Straight",
    interested_in: "Women",
    hobbies: ["Mixology", "Chess", "Skateboarding"],
    instagram_account: "leo.pours",
    spotify_account: "leofontaine",
    snapchat_account: "leof.snap",
    galleryUrls: [
      "https://picsum.photos/seed/leo1/800/1000",
      "https://picsum.photos/seed/leo2/800/1000",
      "https://picsum.photos/seed/leo3/800/1000",
    ],
    answerBank: [
      "My own attempt at a backflip. There's video evidence.",
      "Berlin, purely for the club scene.",
      "They think I'm shy. I'm just picky about who I talk to.",
      "Home-mixed old fashioned, extra orange peel.",
      "Chess in the park until it's too dark to see the board.",
      "Whatever bar has the best appetizer menu wins my night.",
    ],
  },
  {
    username: "qa-seed-priya",
    first_name: "Priya",
    last_name: "Nair",
    name: "Priya Nair",
    birthdate: new Date("1999-09-30"),
    age: 26,
    height: "5'4\"",
    gender: "Female",
    profile_image: "https://i.pravatar.cc/500?img=25",
    bio: "Trying every rooftop in the city, one cocktail menu at a time.",
    pronouns: "She/Her",
    sexuality: "Bisexual",
    interested_in: "Everyone",
    hobbies: ["Journaling", "Salsa dancing", "Thrifting"],
    instagram_account: "priya.thrifts",
    spotify_account: "priyanair_",
    snapchat_account: "priyan.snap",
    galleryUrls: [
      "https://picsum.photos/seed/priya1/800/1000",
      "https://picsum.photos/seed/priya2/800/1000",
      "https://picsum.photos/seed/priya3/800/1000",
    ],
    answerBank: [
      "Salsa class, then wherever the group decides after.",
      "The one who somehow knows everyone at the party.",
      "A good playlist on the walk over changes everything.",
      "Chai, non-negotiable.",
      "Lisbon - the music and the light both hit different.",
      "People think I plan everything. Half of it is just showing up.",
    ],
  },
];

function pickN(arr, n) {
  if (arr.length === 0) return [];
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(n, arr.length));
}

try {
  await client.connect();
  const db = client.db();

  /* ===== FETCH REAL REFERENCE DATA ===== */
  const [genres, categories, vibes, questions, cities] = await Promise.all([
    db.collection("genres").find({ is_deleted: { $ne: true } }).toArray(),
    db.collection("categories").find({ is_deleted: { $ne: true } }).toArray(),
    db.collection("vibes").find({ is_deleted: { $ne: true } }).toArray(),
    db.collection("vibecheckquestions")
      .find({ is_deleted: { $ne: true }, is_active: { $ne: false } })
      .sort({ order: 1 })
      .toArray(),
    db.collection("cities").find({ is_deleted: { $ne: true } }).toArray(),
  ]);

  console.log(`Reference data found: ${genres.length} genres, ${categories.length} categories, ${vibes.length} vibes, ${questions.length} vibe check questions, ${cities.length} cities.`);
  if (genres.length === 0) console.log("  (!) No genres found - music_genre will be left empty for all users.");
  if (categories.length === 0) console.log("  (!) No categories found - event_preferences will be left empty for all users.");
  if (vibes.length === 0) console.log("  (!) No vibes found - vibes will be left empty for all users.");
  if (questions.length === 0) console.log("  (!) No vibe check questions found - vibe_checks will be left empty for all users.");
  if (cities.length === 0) console.log("  (!) No cities found - city_id/preferred_cities will be left unset for all users.");

  const city = cities[0] || null;

  /* ===== BUILD USERS ===== */
  const now = new Date();
  const testUsers = personas.map((p) => {
    const chosenGenres = pickN(genres, 2 + Math.floor(Math.random() * 2)); // 2-3
    const chosenCategories = pickN(categories, 2 + Math.floor(Math.random() * 2)); // 2-3
    const chosenVibes = pickN(vibes, 2 + Math.floor(Math.random() * 2)); // 2-3

    const vibeChecks = questions.map((q, i) => ({
      question_id: q._id,
      answer: p.answerBank[i % p.answerBank.length],
    }));

    const doc = {
      phone_number: "",
      email: `${p.username}@qa-seed.test`,
      is_another_email_verify: false,
      password: undefined, // no login needed for these - browse-only test accounts
      first_name: p.first_name,
      last_name: p.last_name,
      name: p.name,
      username: p.username,
      birthdate: p.birthdate,
      age: p.age,
      height: p.height,
      bio: p.bio,
      gender: p.gender,
      profile_image: p.profile_image,
      is_verified: true,
      is_profile_completed: true,
      user_gallery: p.galleryUrls.map((url) => ({
        url,
        type: "image",
        thumbnail_url: null,
        is_visible: true,
      })),
      instagram_account: p.instagram_account,
      spotify_account: p.spotify_account,
      snapchat_account: p.snapchat_account,
      hobbies: p.hobbies,
      music_genre: chosenGenres.map((g) => g._id),
      custom_music_genres: [],
      event_preferences: chosenCategories.map((c) => c._id),
      custom_event_preferences: [],
      vibes: chosenVibes.map((v) => v._id),
      custom_vibes: [],
      vibe_checks: vibeChecks,
      sexuality: p.sexuality,
      interested_in: p.interested_in,
      interests: [],
      pronouns: p.pronouns,
      accepted_terms: true,
      accepted_privacy_policy: true,
      is_active: true,
      is_deleted: false,
      my_visibility: true,
      signup_step: 4,
      referral_code: "",
      my_referral_code: p.username.toUpperCase(),
      total_likes: Math.floor(Math.random() * 40),
      total_friends: Math.floor(Math.random() * 15),
      createdAt: now,
      updatedAt: now,
    };

    if (city) {
      doc.city_id = city._id;
      doc.latitude = city.latitude;
      doc.longitude = city.longitude;
      doc.radius = 25;
      doc.preferred_cities = [
        {
          city_id: city._id,
          latitude: city.latitude,
          longitude: city.longitude,
          radius: 25,
        },
      ];
    }

    // Remove the `password` key entirely rather than inserting it as
    // undefined (Mongo would otherwise store a literal null).
    delete doc.password;

    return doc;
  });

  /* ===== INSERT (re-runnable) ===== */
  const usersCol = db.collection("users");
  const deleted = await usersCol.deleteMany({ username: { $regex: /^qa-seed-/ } });
  console.log(`\nRemoved ${deleted.deletedCount} previous test user(s).`);

  const result = await usersCol.insertMany(testUsers);
  console.log(`Inserted ${Object.keys(result.insertedIds).length} test users:`);
  testUsers.forEach((u) => {
    console.log(`  - ${u.name}  (_id: ${u._id})  genres: ${u.music_genre.length}  event prefs: ${u.event_preferences.length}  vibes: ${u.vibes.length}  vibe_checks: ${u.vibe_checks.length}`);
  });

  console.log("\nDone. Open the app and look for Maya Chen, Ravi Kapoor, Zara Ali, Leo Fontaine, and Priya Nair in the Members feed.");
} finally {
  await client.close();
}
