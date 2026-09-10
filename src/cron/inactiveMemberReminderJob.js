import cron from "node-cron";
import { User } from "../model/index.js";
import sendNotification from "../utility/notification.js";

/* =====================================================================
   INACTIVE MEMBER REMINDER
   =====================================================================
   Client's ask: "We need to have app notifications when a member is not
   active on the app." Nothing on the User schema tracked activity at all
   before this — see last_active_at (set in appAuth middleware) and this
   cron, which is the first thing that actually reads it.

   Same structural pattern as profileCompletionReminderJob.js: daily,
   batched, per-user cooldown via its own timestamp field, one bad user
   never blocks the rest of the batch.
   ===================================================================== */

// "Inactive" = no authenticated app request in this many days. 5 days is
// a deliberate middle ground — long enough that it's a genuine lapse
// rather than someone who just checked yesterday, short enough that the
// nudge still lands while they might plausibly remember the app.
const INACTIVITY_THRESHOLD_MS = 5 * 24 * 60 * 60 * 1000;

// Don't re-nudge someone every single day just because they're still
// inactive — once every 7 days is a nudge, not a nag.
const REMINDER_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

const BATCH_SIZE = 200;
const PER_USER_DELAY_MS = 50;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const runInactiveMemberReminderJob = async () => {
  const inactiveCutoff = new Date(Date.now() - INACTIVITY_THRESHOLD_MS);
  const cooldownCutoff = new Date(Date.now() - REMINDER_COOLDOWN_MS);

  const candidates = await User.find({
    is_deleted: false,
    is_active: true,
    is_profile_completed: true, // don't nudge someone mid-onboarding
    player_id: { $ne: null, $exists: true },
    last_active_at: { $lte: inactiveCutoff },
    $or: [
      { last_inactivity_nudge_sent_at: null },
      { last_inactivity_nudge_sent_at: { $lte: cooldownCutoff } },
    ],
  })
    .select("_id player_id last_active_at")
    .limit(BATCH_SIZE)
    .lean();

  let sent = 0;

  for (const user of candidates) {
    try {
      await sendNotification(
        "inactivity_reminder",
        user.player_id,
        {
          senderId: user._id,
          other_user_id: user._id,
          action: "inactivity_reminder",
        },
        0
      );

      await User.updateOne(
        { _id: user._id },
        { $set: { last_inactivity_nudge_sent_at: new Date() } }
      );

      sent += 1;
      await delay(PER_USER_DELAY_MS);
    } catch (err) {
      console.error(
        `[inactiveMemberReminderJob] failed for user ${user._id}:`,
        err.message
      );
    }
  }

  console.log(
    `[inactiveMemberReminderJob] processed ${candidates.length} candidate(s), sent ${sent} reminder(s).`
  );
};

// Runs once daily at 19:00 server time — an hour after the profile-
// completion reminder (18:00), so the two batch jobs don't compete for
// the same DB/Firebase resources simultaneously.
const startInactiveMemberReminderJob = () => {
  cron.schedule("0 19 * * *", () => {
    runInactiveMemberReminderJob().catch((err) => {
      console.error("[inactiveMemberReminderJob] run failed:", err.message);
    });
  });
};

export { startInactiveMemberReminderJob, runInactiveMemberReminderJob };