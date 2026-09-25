import cron from "node-cron";
import { User } from "../model/index.js";
import sendNotification from "../utility/notification.js";

/* =====================================================================
   INACTIVE MEMBER REMINDER  ("We miss you 👋")
   Client ask: "app notifications when a member is not active on the app".
   - Inactive = no app activity for INACTIVITY_DAYS (last_active_at is set by
     appAuth). Members from before activity tracking existed have no
     last_active_at - for them, when their account last changed is used.
   - At most one nudge every COOLDOWN_DAYS per member.
   - Runs daily at 19:00 India time (APP_TIMEZONE), processes everyone due
     (in batches), and "claims" each member before sending so two server
     processes can never send the same person two notifications.
   ===================================================================== */
const TZ = process.env.APP_TIMEZONE || "Asia/Kolkata";
const DAY_MS = 24 * 60 * 60 * 1000;
const INACTIVITY_DAYS = 5;
const COOLDOWN_DAYS = 7;
const BATCH_SIZE = 200;
const MAX_PER_RUN = 5000;
const PER_USER_DELAY_MS = 50;
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const runInactiveMemberReminderJob = async ({ dryRun = false } = {}) => {
  const inactiveCutoff = new Date(Date.now() - INACTIVITY_DAYS * DAY_MS);
  const cooldownCutoff = new Date(Date.now() - COOLDOWN_DAYS * DAY_MS);
  const notRecentlyNudged = {
    $or: [
      { last_inactivity_nudge_sent_at: null },
      { last_inactivity_nudge_sent_at: { $lte: cooldownCutoff } },
    ],
  };
  const filter = {
    is_deleted: false,
    is_active: true,
    is_profile_completed: true, // don't nudge someone mid-onboarding
    player_id: { $nin: [null, ""] },
    $and: [
      {
        $or: [
          { last_active_at: { $lte: inactiveCutoff } },
          // members from before activity tracking existed
          { last_active_at: null, updatedAt: { $lte: inactiveCutoff } },
        ],
      },
      notRecentlyNudged,
    ],
  };

  let processed = 0, sent = 0, lastId = null;
  while (processed < MAX_PER_RUN) {
    const page = await User.find(lastId ? { ...filter, _id: { $gt: lastId } } : filter)
      .sort({ _id: 1 })
      .select("_id player_id")
      .limit(BATCH_SIZE)
      .lean();
    if (!page.length) break;

    for (const user of page) {
      lastId = user._id;
      processed += 1;
      if (dryRun) { sent += 1; continue; }
      try {
        // Claim first: only one process can flip this, so no double sends.
        const claim = await User.updateOne(
          { _id: user._id, ...notRecentlyNudged },
          { $set: { last_inactivity_nudge_sent_at: new Date() } }
        );
        if (!claim.modifiedCount) continue;
        await sendNotification(
          "inactivity_reminder",
          user.player_id,
          { senderId: user._id, other_user_id: user._id, action: "inactivity_reminder" },
          0
        );
        sent += 1;
        await delay(PER_USER_DELAY_MS);
      } catch (err) {
        console.error(`[inactiveMemberReminderJob] failed for user ${user._id}:`, err.message);
      }
    }
  }
  console.log(`[inactiveMemberReminderJob]${dryRun ? " (dry run)" : ""} ${processed} due, ${sent} ${dryRun ? "would be sent" : "sent"}.`);
  return { processed, sent };
};

const startInactiveMemberReminderJob = () => {
  cron.schedule(
    "0 19 * * *",
    () => runInactiveMemberReminderJob().catch((err) =>
      console.error("[inactiveMemberReminderJob] run failed:", err.message)),
    { timezone: TZ, noOverlap: true, name: "inactive-member-reminder" }
  );
};

export { startInactiveMemberReminderJob, runInactiveMemberReminderJob };
