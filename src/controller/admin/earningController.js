// controller/admin/earningController.js

import { Earning, Vendor, Booking, Event, Venue } from "../../model/index.js";
// import { getCommissionPercent } from "../../utility/commissionUtility.js";
import apiResponse from "../../utility/apiResponse.js";
import messages from "../../utility/messages.js";
import moment from "moment";


// =========================
// MANUAL ADD EARNING (ADMIN)
// =========================
const addEarning = async (req, res) => {
  try {
    const {
      booking_id
    } = req.body;

    // Fetch booking
    const booking = await Booking.findById(booking_id);
    if (!booking) {
      return apiResponse.notFoundResponse(res, "Booking not found");
    }

    const vendorExists = await Vendor.findById(booking.vendor_id);
    if (!vendorExists) {
      return apiResponse.notFoundResponse(res, "Vendor not found");
    }

    // Calculate commission
    const admin_commission = await getCommissionPercent(
      booking.booking_type,
      booking.event_id,
      booking.venue_id
    );

    const admin_earning = (booking.total * admin_commission) / 100;
    const vendor_earning = booking.total - admin_earning;

    // Prevent duplicate record
    const existing = await Earning.findOne({ booking_id: booking_id });
    if (existing) {
      return apiResponse.badRequest(res, "Earning already exists for this booking");
    }

    const earning = await Earning.create({
      vendor: booking.vendor_id,
      booking_id,
      transaction_id: booking.transaction_id,
      booking_type: booking.booking_type,
      event_id: booking.event_id,
      venue_id: booking.venue_id,
      total_amount: booking.total,
      admin_commission_percent: admin_commission,
      admin_earning,
      vendor_earning,
    });

    return apiResponse.created(res, earning, "Earning added successfully");

  } catch (err) {
    return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
  }
};

// =========================
// GET ALL EARNINGS (ADMIN / VENDOR)
// =========================
const getAllEarnings = async (req, res) => {
  try {

    const vendorId = req.vendor;
    const adminId = req.admin;

    console.log('💰 Fetching earnings...');

    // ✅ helper for safe calculation (avoid float issues)
    const calcSubTotal = (total, gst) => {
      return Number(((Number(total) || 0) - (Number(gst) || 0)).toFixed(2));
    };

    /* ================= QUERY BUILD ================= */

    let filter = {
      payment_status: "success",
      booking_status: { $in: ["confirmed", "completed"] },
      is_deleted: false
    };

    // ✅ If Vendor Logged In → Add vendor filter
    if (vendorId && !adminId) {
      filter.vendor_id = vendorId;
    }

    const bookings = await Booking.find(filter)
      .populate("vendor_id", "name business_name phone_number email")
      .populate("event_id", "venue_name venue_image")
      .populate("venue_id", "venue_name venue_image")
      .populate("user_id", "name profile_image")   // ✅ CUSTOMER ADDED
      .sort({ createdAt: -1 })
      .lean();

    console.log(`📊 Found ${bookings.length} bookings`);

    /* ================= CALCULATIONS ================= */

    const totalAdminEarning = bookings.reduce(
      (sum, item) => sum + (item.admin_earning || 0),
      0
    );

    const totalVendorEarning = bookings.reduce((sum, item) => {
      const sub = calcSubTotal(item.total, item.gst_amount);
      return sum + (sub - (item.admin_earning || 0));
    }, 0);

    /* ================= FORMAT CUSTOMER DETAILS ================= */

    // const formattedBookings = bookings.map(b => ({
    //   ...b,
    //   customer: {
    //     id: b.user_id?._id || null,
    //     name:
    //       b.user_id?.full_name ||
    //       b.user_id?.name ||
    //       b.contact_info?.full_name ||
    //       "Unknown"
    //   }
    // }));

    const formattedBookings = bookings.map(b => {
      const calculatedSubTotal = calcSubTotal(b.total, b.gst_amount);

      return {
        ...b,
        sub_total: calculatedSubTotal, // ✅ consistent everywhere

        customer: {
          id: b.user_id?._id || null,
          name:
            b.user_id?.full_name ||
            b.user_id?.name ||
            b.contact_info?.full_name ||
            "Unknown"
        }
      };
    });

    /* ================= VENDOR STATS (Only for Admin) ================= */

    let vendorStats = {};

    if (!vendorId || adminId) {
      formattedBookings.forEach(booking => {
        const vId = booking.vendor_id?._id?.toString();

        if (vId) {
          if (!vendorStats[vId]) {
            vendorStats[vId] = {
              vendor_name:
                booking.vendor_id?.name ||
                booking.vendor_id?.business_name ||
                "Unknown",
              booking_count: 0,
              total_earnings: 0,
              admin_earnings: 0
            };
          }

          vendorStats[vId].booking_count++;

          // ✅ FIXED: always use (subtotal - admin)
          const sub = booking.sub_total || 0;
          const admin = booking.admin_earning || 0;

          vendorStats[vId].total_earnings += (sub - admin);
          vendorStats[vId].admin_earnings += admin;
        }
      });
    }

    return apiResponse.ok(
      res,
      {
        total_admin_earning: totalAdminEarning,
        total_vendor_earning: totalVendorEarning,
        total_records: formattedBookings.length,
        vendor_stats: Object.values(vendorStats),
        earnings: formattedBookings   // ✅ updated response
      },
      "Earnings fetched successfully"
    );

  } catch (err) {
    console.error('❌ Get earnings error:', err);
    return apiResponse.serverError(
      res,
      messages.SERVER_ERROR,
      err.message
    );
  }
};

// =========================
// OTHER FUNCTIONS SAME
// =========================

const getTodaysEarning = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const earnings = await Earning.find({
      createdAt: { $gte: today, $lt: tomorrow }
    });

    const today_total = earnings.reduce((sum, earning) => sum + earning.admin_earning, 0);

    return apiResponse.ok(res, { today_total, count: earnings.length }, "Today's earning fetched successfully");
  } catch (err) {
    return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
  }
};


const getVendorEarnings = async (req, res) => {
  try {
    const { vendor_id } = req.params;

    const earnings = await Earning.find({ vendor: vendor_id })
      .sort({ createdAt: -1 });

    const totalEarnings = earnings.reduce((sum, earning) => sum + earning.vendor_earning, 0);

    return apiResponse.ok(res, {
      earnings,
      total_vendor_earning: totalEarnings,
      count: earnings.length
    }, "Vendor earnings fetched successfully");
  } catch (err) {
    return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
  }
};


const getEarningsStats = async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    let dateFilter = {};
    if (start_date && end_date) {
      dateFilter = {
        createdAt: {
          $gte: new Date(start_date),
          $lte: new Date(end_date)
        }
      };
    }

    const earnings = await Earning.find(dateFilter);

    const stats = {
      total_bookings: earnings.length,
      total_revenue: earnings.reduce((sum, e) => sum + e.total_amount, 0),
      total_admin_earning: earnings.reduce((sum, e) => sum + e.admin_earning, 0),
      total_vendor_earning: earnings.reduce((sum, e) => sum + e.vendor_earning, 0),
      average_commission: earnings.length > 0
        ? earnings.reduce((sum, e) => sum + e.admin_commission_percent, 0) / earnings.length
        : 0
    };

    return apiResponse.ok(res, stats, "Earnings statistics fetched successfully");
  } catch (err) {
    return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
  }
};


const deleteEarning = async (req, res) => {
  try {
    const { id } = req.params;

    const earning = await Earning.findByIdAndDelete(id);
    if (!earning) {
      return apiResponse.notFoundResponse(res, "Earning record not found");
    }

    return apiResponse.ok(res, null, "Earning deleted successfully");
  } catch (err) {
    return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
  }
};


// =========================
// GET TABULAR EARNINGS REPORT
// =========================
const getTabularEarningsReport = async (req, res) => {
  try {
    const { s_date, e_date } = req.query;

    // Parse using moment
    const startDate = moment(s_date, "YYYY-MM-DD").startOf("day");
    const endDate = moment(e_date, "YYYY-MM-DD").endOf("day");

    // Date filter
    const dateFilter = { createdAt: { $gte: startDate.toDate(), $lte: endDate.toDate() } };

    // Query earnings with populated relationships
    const earnings = await Earning.find({ ...dateFilter })
      .populate("vendor", "name business_name phone_number email")
      .populate("event_id", "title")
      .populate("venue_id", "venue_name address")
      .sort({ createdAt: -1 });

    // Map to required fields
    const result = earnings.map((e) => ({
      earning_id: e?._id,
      booking_id: e?.booking_id || null,
      vendor_name: e?.vendor?.business_name || e?.vendor?.name || "N/A",
      vendor_email: e?.vendor?.email || "N/A",
      vendor_phone: e?.vendor?.phone_number || "N/A",
      event_venue_name: e?.booking_type === "event"
        ? (e?.event_id?.title || e?.event_details?.title || "N/A")
        : (e?.venue_id?.venue_name || e?.venue_details?.venue_name || "N/A"),
      booking_type: e?.booking_type || "event",
      total_amount: e?.total_amount || 0,
      admin_commission_percent: e?.admin_commission_percent || 0,
      admin_earning: e?.admin_earning || 0,
      vendor_earning: e?.vendor_earning || 0,
      transaction_id: e?.transaction_id || null,
      status: e?.status || "completed",
      createdAt: e?.createdAt
    }));

    // Calculate summary statistics
    const totalEarnings = result.reduce((sum, e) => sum + e.total_amount, 0);
    const totalAdminEarning = result.reduce((sum, e) => sum + e.admin_earning, 0);
    const totalVendorEarning = result.reduce((sum, e) => sum + e.vendor_earning, 0);
    const avgCommission = result.length > 0
      ? result.reduce((sum, e) => sum + e.admin_commission_percent, 0) / result.length
      : 0;

    return apiResponse.ok(
      res,
      {
        data: result,
        summary: {
          total_bookings: result.length,
          total_revenue: totalEarnings,
          total_admin_earning: totalAdminEarning,
          total_vendor_earning: totalVendorEarning,
          average_commission: parseFloat(avgCommission.toFixed(2)),
          event_bookings: result.filter(e => e.booking_type === "event").length,
          venue_bookings: result.filter(e => e.booking_type === "venue").length
        }
      },
      messages.SUCCESS
    );
  } catch (err) {
    console.error(err);
    return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
  }
};


export default {
  addEarning,
  getAllEarnings,
  getTodaysEarning,
  getVendorEarnings,
  getEarningsStats,
  deleteEarning,
  // createEarningForBooking,
  getTabularEarningsReport
};
