import cron from "node-cron";
import { User } from "../model/index.js";
import helper from "../utility/helper.js";
import sendNotification from "../utility/notification.js";

/* =====================================================================
   PROFILE COMPLETION REMINDER (push)  ("Your profile is 60% complete")
   Reaches members even if they never open the app again (the in-app
   prompt on app open covers everyone who does).
   - Every REMINDER_EVERY_DAYS, at most MAX_REMINDERS times per member,
     then it stops - a nudge, not a nag.
   - Runs daily at 18:00 India time (APP_TIMEZONE), processes everyone due
     (in batches), claims each member before sending (no double sends).
   - Uses the same calculateProfileCompletion() as the app, so the % in the
     notification always matches the app.
   ===================================================================== */
const TZ = process.env.APP_TIMEZONE || "Asia/Kolkata";
const DAY_MS = 24 * 60 * 60 * 1000;
const REMINDER_EVERY_DAYS = 3;
const MAX_REMINDERS = 5;
const BATCH_SIZE = 200;
const MAX_PER_RUN = 5000;
const PER_USER_DELAY_MS = 50;
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const runProfileCompletionReminderJob = async ({ dryRun = false } = {}) => {
  const cutoff = new Date(Date.now() - REMINDER_EVERY_DAYS * DAY_MS);
  const due = {
    $or: [
      { last_profile_reminder_sent_at: null },
      { last_profile_reminder_sent_at: { $lte: cutoff } },
    ],
  };
  const underCap = {
    $or: [
      { profile_reminder_count: null },
      { profile_reminder_count: { $lt: MAX_REMINDERS } },
    ],
  };
  const filter = {
    is_deleted: false,
    is_active: true,
    is_profile_completed: true,
    player_id: { $nin: [null, ""] },
    $and: [due, underCap],
  };

  let processed = 0, sent = 0, alreadyComplete = 0, lastId = null;
  while (processed < MAX_PER_RUN) {
    const page = await User.find(lastId ? { ...filter, _id: { $gt: lastId } } : filter)
      .sort({ _id: 1 })
      .select("_id user_gallery bio instagram_account hobbies vibe_checks player_id")
      .limit(BATCH_SIZE)
      .lean();
    if (!page.length) break;

    for (const user of page) {
      lastId = user._id;
      processed += 1;
      try {
        const { percentage, messages, fields } = helper.calculateProfileCompletion(user);
        if (percentage >= 100) {
          alreadyComplete += 1;
          if (!dryRun) {
            await User.updateOne({ _id: user._id }, { $set: { last_profile_reminder_sent_at: new Date() } });
          }
          continue;
        }
        if (dryRun) { sent += 1; continue; }
        const claim = await User.updateOne(
          { _id: user._id, $and: [due, underCap] },
          { $set: { last_profile_reminder_sent_at: new Date() }, $inc: { profile_reminder_count: 1 } }
        );
        if (!claim.modifiedCount) continue;
        await sendNotification(
          "profile_completion",
          user.player_id,
          {
            senderId: user._id,
            other_user_id: user._id,
            action: "profile_completion",
            percentage,
            next_step: messages[0] || null,
            next_step_field: fields[0] || null,
          },
          0
        );
        sent += 1;
        await delay(PER_USER_DELAY_MS);
      } catch (err) {
        console.error(`[profileCompletionReminderJob] failed for user ${user._id}:`, err.message);
      }
    }
  }
  console.log(`[profileCompletionReminderJob]${dryRun ? " (dry run)" : ""} ${processed} due, ${sent} ${dryRun ? "would be sent" : "sent"}, ${alreadyComplete} already complete.`);
  return { processed, sent, alreadyComplete };
};

const startProfileCompletionReminderJob = () => {
  cron.schedule(
    "0 18 * * *",
    () => runProfileCompletionReminderJob().catch((err) =>
      console.error("[profileCompletionReminderJob] run failed:", err.message)),
    { timezone: TZ, noOverlap: true, name: "profile-completion-reminder" }
  );
};

export { startProfileCompletionReminderJob, runProfileCompletionReminderJob };
