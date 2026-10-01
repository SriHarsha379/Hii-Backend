/* =====================================================================
   SUPPORT REQUEST CATEGORIES - one list per sender type.
   Edit these lists to add / rename categories (keep "Other" last).
   ===================================================================== */
export const SUPPORT_CATEGORIES = {
  member: ["Reservations", "Tickets", "Account", "Payments", "Report a bug", "Other"],
  club: ["Feature club", "Reservations", "Listing changes", "Payouts", "Other"],
  organiser: ["Feature event", "Tickets", "Event changes", "Payouts", "Other"],
};

/** A valid category for this sender type ("Other" if missing / unknown). */
export const normalizeSupportCategory = (source, category) => {
  const list = SUPPORT_CATEGORIES[source] || SUPPORT_CATEGORIES.member;
  const wanted = String(category || "").trim().toLowerCase();
  return list.find((c) => c.toLowerCase() === wanted) || "Other";
};

/** Sender type for a dashboard login: club / organiser (null = not a club login). */
export const supportSourceForAdmin = (admin) =>
  admin?.role === "CLUB_ADMIN" ? "club" : admin?.role === "EVENT_ADMIN" ? "organiser" : null;
