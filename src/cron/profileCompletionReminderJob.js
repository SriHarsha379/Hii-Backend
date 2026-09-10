import cron from "node-cron";
import { User } from "../model/index.js";
import helper from "../utility/helper.js";
import sendNotification from "../utility/notification.js";

/* =====================================================================
   PROFILE COMPLETION — proactive reminder (runs even if the user never
   opens the app)
   =====================================================================
   Two other mechanisms already existed before this one, and neither
   covers a user who simply never opens the app again after signing up:

   1. helper.checkAndNotifyProfileCompletion — fires only when a field
      that affects the percentage is actually edited. A user who never
      touches their profile again never triggers this.
   2. ProfileCompletionReminder (Flutter, local notification) — fires on
      app cold-start/resume. A user who never opens the app again never
      triggers this either.

   This cron closes that gap: it runs on a schedule against the database
   directly, independent of whether the user ever does anything client-side.
   Reuses the exact same calculateProfileCompletion() used by both of the
   above, so the percentage/messages shown here always agree with what the
   in-app UI and the other two reminders would show.
   ===================================================================== */

// Once a day is a deliberate choice — proactively pushing to someone who
// isn't even opening the app is easy to get wrong as "nagging"; daily is
// enough to be a nudge without feeling like spam. Batches with a small
// per-user delay to avoid a thundering-herd of pushes against Firebase.
const REMINDER_COOLDOWN_MS = 24 * 60 * 60 * 1000;
const BATCH_SIZE = 200;
const PER_USER_DELAY_MS = 50;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const runProfileCompletionReminderJob = async () => {
  const cutoff = new Date(Date.now() - REMINDER_COOLDOWN_MS);

  const candidates = await User.find({
    is_deleted: false,
    is_active: true,
    is_profile_completed: true,
    player_id: { $ne: null, $exists: true },
    $or: [
      { last_profile_reminder_sent_at: null },
      { last_profile_reminder_sent_at: { $lte: cutoff } },
    ],
  })
    .select(
      "_id user_gallery bio instagram_account hobbies vibe_checks player_id is_profile_completed"
    )
    .limit(BATCH_SIZE)
    .lean();

  let sent = 0;

  for (const user of candidates) {
    try {
      const { percentage, messages } = helper.calculateProfileCompletion(user);

      // Complete profiles have nothing to nudge — still stamp the
      // timestamp so we don't keep re-querying them every run.
      if (percentage >= 100) {
        await User.updateOne(
          { _id: user._id },
          { $set: { last_profile_reminder_sent_at: new Date() } }
        );
        continue;
      }

      await sendNotification(
        "profile_completion",
        user.player_id,
        {
          senderId: user._id,
          other_user_id: user._id,
          action: "profile_completion",
          percentage,
          next_step: messages[0] || null,
        },
        0
      );

      await User.updateOne(
        { _id: user._id },
        { $set: { last_profile_reminder_sent_at: new Date() } }
      );

      sent += 1;
      await delay(PER_USER_DELAY_MS);
    } catch (err) {
      // One bad user (e.g. a stale/invalid player_id) should never stop
      // the rest of the batch from being processed.
      console.error(
        `[profileCompletionReminderJob] failed for user ${user._id}:`,
        err.message
      );
    }
  }

  console.log(
    `[profileCompletionReminderJob] processed ${candidates.length} candidate(s), sent ${sent} reminder(s).`
  );
};

// Runs once daily at 18:00 server time — evening, when someone's more
// likely to actually look at their phone than a random weekday morning.
const startProfileCompletionReminderJob = () => {
  cron.schedule("0 18 * * *", () => {
    runProfileCompletionReminderJob().catch((err) => {
      console.error("[profileCompletionReminderJob] run failed:", err.message);
    });
  });
};

export { startProfileCompletionReminderJob, runProfileCompletionReminderJob };