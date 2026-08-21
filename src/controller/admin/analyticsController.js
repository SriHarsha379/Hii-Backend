import mongoose from "mongoose";
import { Earning, Booking, Event, Venue, Ticket, VenueFollow } from "../../model/index.js";
import apiResponse from "../../utility/apiResponse.js";
import messages from "../../utility/messages.js";

// GET /analytics/extended?vendor_id=<id>&range=7d|30d|90d|all
// Powers the Club Admin / Event Admin "Revenue, Earnings, Bookings,
// Engagement Rate" cards on the Analytics page — these previously hit a
// literal placeholder URL (`/TODO_ANALYTICS_STATS`) that never existed, so
// every one of those cards permanently showed "—". This computes real
// numbers from the actual Earning/Booking collections.
//
// vendor_id is required for CLUB_ADMIN/EVENT_ADMIN (their own organisation);
// SUPER_ADMIN/NORMAL_ADMIN can omit it for a platform-wide view.
//
// Deliberately does NOT return an "avg session time" figure — there is no
// session/usage-tracking model anywhere in this backend, so making one up
// would just be a different flavor of the same problem this endpoint exists
// to fix. If real session analytics are wanted later, that needs actual
// event-tracking infrastructure on the mobile app side first.
const getExtendedStats = async (req, res) => {
  try {
    const { vendor_id, range = "30d" } = req.query;

    const filter = {};
    if (vendor_id) filter.vendor = vendor_id; // Earning uses `vendor`, not `vendor_id`
    const bookingFilter = {};
    if (vendor_id) bookingFilter.vendor_id = vendor_id;

    if (range !== "all") {
      const days = { "7d": 7, "30d": 30, "90d": 90 }[range] || 30;
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      filter.createdAt = { $gte: since };
      bookingFilter.createdAt = { $gte: since };
    }

    const [earnings, bookings] = await Promise.all([
      Earning.find({ ...filter, status: { $ne: "cancelled" } }).lean(),
      Booking.find({ ...bookingFilter, is_deleted: false }).lean(),
    ]);

    const revenue = earnings.reduce((sum, e) => sum + (e.total_amount || 0), 0);
    const vendorEarnings = earnings.reduce((sum, e) => sum + (e.vendor_earning || 0), 0);
    const totalBookings = bookings.length;

    // "Engagement rate" here = confirmed/completed share of all bookings —
    // a real conversion-style metric from actual booking outcomes, not a
    // fabricated number.
    const successfulBookings = bookings.filter((b) => b.booking_status === "confirmed" || b.booking_status === "completed").length;
    const engagementRate = totalBookings > 0 ? Math.round((successfulBookings / totalBookings) * 100) : null;

    return apiResponse.ok(
      res,
      {
        revenue,
        earnings: vendorEarnings,
        bookings: totalBookings,
        engagementRate,
      },
      messages.SUCCESS
    );
  } catch (err) {
    console.error(err);
    return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
  }
};

// GET /analytics/club-overview?vendor_id=<id>
// Powers the CLUB_ADMIN "Overview" dashboard tab requested to show:
// Upcoming Events, Featured Events, Followers, Profile Views, Live
// Tickets, Tickets Sold. All of these are computed from real data except
// "Profile Views" — there is no view-tracking model anywhere in this
// backend (no analytics-event collection), so that one is intentionally
// returned as null rather than a made-up number. It'll need real
// view-tracking added on the mobile app side before it can be real.
const getClubOverviewStats = async (req, res) => {
  try {
    const { vendor_id } = req.query;
    if (!vendor_id) return apiResponse.badRequest(res, "vendor_id is required");

    const now = new Date();

    const [upcomingEvents, featuredEvents, venue, ticketAgg] = await Promise.all([
      Event.countDocuments({ vendor_id, is_deleted: false, status: "UPCOMING" }),
      Event.countDocuments({
        vendor_id,
        is_deleted: false,
        is_featured: true,
        $or: [{ featured_until: null }, { featured_until: { $gte: now } }],
      }),
      Venue.findOne({ vendor_id, is_deleted: false }),
      Ticket.aggregate([
        { $match: { vendor_id: new mongoose.Types.ObjectId(vendor_id), is_deleted: false } },
        { $group: { _id: null, liveTickets: { $sum: "$available_tickets" }, ticketsSold: { $sum: "$sold_tickets" } } },
      ]),
    ]);

    const followers = venue ? await VenueFollow.countDocuments({ venue_id: venue._id, is_active: true }) : 0;
    const { liveTickets = 0, ticketsSold = 0 } = ticketAgg[0] || {};

    return apiResponse.ok(
      res,
      {
        upcomingEvents,
        featuredEvents,
        followers,
        profileViews: null, // honestly not trackable — see comment above
        liveTickets,
        ticketsSold,
      },
      messages.SUCCESS
    );
  } catch (err) {
    console.error(err);
    return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
  }
};

export default { getExtendedStats, getClubOverviewStats };