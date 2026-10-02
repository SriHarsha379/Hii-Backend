/**
 * One-time repair: link every club / event admin to their club on the server.
 *   node src/scripts/linkClubAdmins.js            (dry run - changes nothing)
 *   node src/scripts/linkClubAdmins.js --apply    (saves the links)
 * Before this fix, onboarding / claiming saved the link only in the
 * browser, so the server didn't know which club an admin manages.
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
import { Admin, Vendor } from "../model/index.js";
import { exactNameRx } from "../utility/adminScope.js";
dotenv.config();

const APPLY = process.argv.includes("--apply");
await mongoose.connect(process.env.MONGO_URI);
const admins = await Admin.find({ role: { $in: ["CLUB_ADMIN", "EVENT_ADMIN"] }, is_deleted: { $ne: true } }).lean();
let ok = 0, fixed = 0;
const unmatched = [];
for (const a of admins) {
  const org = String(a.organisation || "").trim();
  let v = org ? await Vendor.findOne({ name: exactNameRx(org), is_deleted: { $ne: true } }).lean() : null;
  if (v && v.name === a.organisation) { ok++; continue; }
  if (!v && a.email) v = await Vendor.findOne({ email: exactNameRx(a.email), is_deleted: { $ne: true } }).lean();
  if (!v) { unmatched.push(a); continue; }
  console.log(`${APPLY ? "LINKED " : "would link"}  ${a.email}  ->  "${v.name}"${org ? `  (was "${org}")` : ""}`);
  if (APPLY) await Admin.updateOne({ _id: a._id }, { $set: { organisation: v.name } });
  fixed++;
}
console.log(`\n${admins.length} club/event admins: ${ok} already linked, ${fixed} ${APPLY ? "linked now" : "can be linked (run with --apply)"}, ${unmatched.length} not matched`);
if (unmatched.length) {
  console.log("\nNot matched (no club with their organisation name or email) - they can claim their club again from the dashboard:");
  for (const a of unmatched) console.log(`  - ${a.email}  role=${a.role}  organisation="${a.organisation || ""}"`);
}
await mongoose.disconnect();
