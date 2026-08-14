import mongoose from "mongoose";
import dotenv from "dotenv";
import { Vibe } from "../model/index.js";

dotenv.config();

// Better descriptions for the existing weak ones. Match is case-insensitive
// on the 'vibe' name so this is safe to re-run.
const DESCRIPTION_FIXES = {
  "chill pill": "Laid-back music, good company, no pressure",
  "new friends": "Open to meeting new people tonight",
};

// Reactivate this one to bring the active count up to 5. It already has a
// solid description and image - it was just sitting deactivated.
const REACTIVATE_VIBE_NAME = "Wild & Crazy";

const fixVibes = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connected");

    const allVibes = await Vibe.find({});

    // ---------------- 1) Fix weak descriptions on active vibes ----------------
    for (const vibe of allVibes) {
      if (!vibe.is_active || vibe.is_deleted) continue;
      const key = vibe.vibe.trim().toLowerCase();
      const better = DESCRIPTION_FIXES[key];
      if (better && vibe.description !== better) {
        await Vibe.updateOne({ _id: vibe._id }, { $set: { description: better } });
        console.log(`✏️  "${vibe.vibe}" description -> "${better}"`);
      }
    }

    // ---------------- 2) Reactivate a 5th vibe ----------------
    const activeCount = await Vibe.countDocuments({ is_active: true, is_deleted: false });
    console.log(`\nCurrently active vibes: ${activeCount}`);

    if (activeCount < 5) {
      const candidate = allVibes
        .filter((v) => v.vibe.trim().toLowerCase() === REACTIVATE_VIBE_NAME.toLowerCase())
        .sort((a, b) => (b.updatedAt > a.updatedAt ? 1 : -1))[0]; // most recently updated match

      if (candidate) {
        await Vibe.updateOne(
          { _id: candidate._id },
          { $set: { is_active: true, is_deleted: false } }
        );
        console.log(`✅ Reactivated "${candidate.vibe}" - "${candidate.description}"`);
      } else {
        console.log(`⚠️  Couldn't find a vibe named "${REACTIVATE_VIBE_NAME}" to reactivate.`);
      }
    } else {
      console.log("Already have 5+ active vibes, nothing to reactivate.");
    }

    const finalActive = await Vibe.find({ is_active: true, is_deleted: false });
    console.log(`\n🎉 Final active vibes (${finalActive.length}):`);
    finalActive.forEach((v) => console.log(`   - ${v.vibe}: "${v.description}"`));

    process.exit(0);
  } catch (err) {
    console.error("❌ Error fixing vibes:", err.message);
    process.exit(1);
  }
};

fixVibes();
