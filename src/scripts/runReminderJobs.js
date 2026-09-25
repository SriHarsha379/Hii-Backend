/**
 * Check or trigger the reminder cron jobs right now (instead of waiting for
 * 18:00 / 19:00). Run on the server, in the Hii-Backend folder:
 *
 *   node src/scripts/runReminderJobs.js          -> DRY RUN: shows how many
 *                                                   members are due, sends nothing
 *   node src/scripts/runReminderJobs.js --send   -> actually sends them now
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const { runProfileCompletionReminderJob } = await import("../cron/profileCompletionReminderJob.js");
const { runInactiveMemberReminderJob } = await import("../cron/inactiveMemberReminderJob.js");

const send = process.argv.includes("--send");
try {
  await mongoose.connect(process.env.MONGO_URI);
  console.log(send ? "\nSENDING reminders now...\n" : "\nDRY RUN - nothing will be sent (add --send to send)\n");
  const p = await runProfileCompletionReminderJob({ dryRun: !send });
  const i = await runInactiveMemberReminderJob({ dryRun: !send });
  console.log(`\nProfile-completion reminders: ${p.sent} ${send ? "sent" : "due"}`);
  console.log(`Inactive-member reminders    : ${i.sent} ${send ? "sent" : "due"}\n`);
  process.exit(0);
} catch (err) {
  console.error("Error:", err.message);
  process.exit(1);
}
