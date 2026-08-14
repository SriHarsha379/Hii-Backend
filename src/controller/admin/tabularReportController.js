


import { User, Booking, Earning,Venue,Ticket,Vendor,Event } from "../../model/index.js";
import apiResponse from "../../utility/apiResponse.js";
import messages from "../../utility/messages.js";
import moment from "moment";

const getTabularUserReport = async (req, res) => {
    try {
        const { s_date, e_date } = req.query;
        // Parse using moment
        const startDate = moment(s_date, "YYYY-MM-DD").startOf("day");
        const endDate = moment(e_date, "YYYY-MM-DD").endOf("day");
        const today = moment().endOf("day");
        // Date filter
        const dateFilter = { createdAt: { $gte: startDate.toDate(), $lte: endDate.toDate() } };
        // Customers filter
        const users = await User.find({
            is_deleted: false,
            is_profile_completed: true,
            is_verified: true,
            ...dateFilter
        }).sort({ createdAt: -1 });
        // Sirf required fields map karo
        const result = users && users?.map(u => ({
            user_id: u?.id,
            profile_image: u?.profile_image || null,
            first_name: u.first_name,
            last_name: u.last_name,
            email: u.email,
            mobile: u.phone_number,
            status: u.is_deleted ? "Inactive" : "Active",
            createdAt: u.createdAt
        }));


        return apiResponse.ok(res, result, messages.SUCCESS);
    } catch (err) {
        console.error(err);
        return apiResponse.serverError(res, messages.SERVER_ERROR, err.messages);
    }
};
// ✅ Get Tabular Booking Report
const getTabularBookingReport = async (req, res) => {
  try {
    const vendorId = req.vendor._id; // ✅ token se vendor

    const { s_date, e_date } = req.query;

    // Validate dates
    if (!s_date || !e_date) {
      return apiResponse.badRequest(res, "Start date and end date are required");
    }

    const startDate = moment(s_date).startOf("day").toDate();
    const endDate = moment(e_date).endOf("day").toDate();

    if (!moment(startDate).isValid() || !moment(endDate).isValid()) {
      return apiResponse.badRequest(res, "Invalid date format. Use YYYY-MM-DD");
    }

    if (moment(startDate).isAfter(endDate)) {
      return apiResponse.badRequest(res, "Start date cannot be after end date");
    }

    // ✅ ONLY THIS VENDOR BOOKINGS
    const bookings = await Booking.find({
      vendor_id: vendorId,            // 🔥 MAIN FIX
      createdAt: { $gte: startDate, $lte: endDate },
      is_active: true,
      is_deleted: false
    })
      .populate({
        path: "user_id",
        select: "first_name last_name email phone_number country_code"
      })
      .populate({
        path: "event_id",
        select: "venue_name title"
      })
      .populate({
        path: "venue_id",
        select: "venue_name address"
      })
      .populate({
        path: "ticket_id",
        select: "title ticket_price"
      })
      .sort({ createdAt: -1 })
      .lean();

    const processedBookings = bookings.map((booking, index) => {
      let userFirstName = "";
      let userLastName = "";
      let userEmail = "";
      let userPhone = "";
      let countryCode = "";

      if (booking.user_id) {
        userFirstName = booking.user_id.first_name || "";
        userLastName = booking.user_id.last_name || "";
        userEmail = booking.user_id.email || "";
        userPhone = booking.user_id.phone_number || "";
        countryCode = booking.user_id.country_code || "";
      } else if (booking.contact_info) {
        userFirstName = booking.contact_info.first_name || "";
        userLastName = booking.contact_info.last_name || "";
        userEmail = booking.contact_info.email || "";
        userPhone = booking.contact_info.phone_number || "";
        countryCode = booking.contact_info.country_code || "";
      }

      let serviceTitle = "";
      if (booking.booking_type === "event" && booking.event_id) {
        serviceTitle =
          booking.event_id.venue_name ||
          booking.event_id.title ||
          "Event";
      } else if (booking.booking_type === "venue" && booking.venue_id) {
        serviceTitle = booking.venue_id.venue_name || "Venue";
      } else {
        serviceTitle = booking.booking_type || "Service";
      }

      const amount =
        booking.total ||
        booking.sub_total ||
        booking.ticket_id?.ticket_price ||
        0;

      return {
        booking_id: booking._id,
        number: index + 1,
        first_name: userFirstName,
        last_name: userLastName,
        email: userEmail,
        phone_number: userPhone,
        country_code: countryCode,
        service_title: serviceTitle,
        booking_type: booking.booking_type,
        amount,
        total: amount,
        transaction_id: booking.transaction_id || "N/A",
        status: "Completed",
        createdAt: booking.createdAt
      };
    });

    // 📊 Summary
    const totalBookings = processedBookings.length;
    const eventBookings = processedBookings.filter(
      b => b.booking_type === "event"
    ).length;
    const venueBookings = processedBookings.filter(
      b => b.booking_type === "venue"
    ).length;
    const totalRevenue = processedBookings.reduce(
      (sum, b) => sum + (b.amount || 0),
      0
    );

    return apiResponse.ok(res, {
      data: processedBookings,
      summary: {
        total_bookings: totalBookings,
        event_bookings: eventBookings,
        venue_bookings: venueBookings,
        total_revenue: totalRevenue
      }
    }, "Vendor booking report fetched successfully");

  } catch (err) {
    console.error("Error in getTabularBookingReport:", err);
    return apiResponse.serverError(res, err.message);
  }
};


const getTabularEarningsReport = async (req, res) => {
    try {
        const { s_date, e_date } = req.query;
        const vendorId = req.vendor?._id || req.user?.id; // Get vendor ID from token
        
        if (!vendorId) {
            return apiResponse.unauthorizedResponse(res, "Vendor not authenticated");
        }

        // Parse dates
        const startDate = moment(s_date, "YYYY-MM-DD").startOf("day");
        const endDate = moment(e_date, "YYYY-MM-DD").endOf("day");

        // Date filter
        const dateFilter = { 
            createdAt: { 
                $gte: startDate.toDate(), 
                $lte: endDate.toDate() 
            },
            vendor: vendorId // Filter by specific vendor
        };

        // Query earnings for this vendor only
        const earnings = await Earning.find(dateFilter)
            .populate("vendor", "name business_name phone_number email profile_image")
            .populate("event_id", "title venue_name date start_time")
            .populate("venue_id", "venue_name address")
            .sort({ createdAt: -1 });

        // Map to required fields for frontend
        const result = earnings.map((e, index) => ({
            s_no: index + 1,
            earning_id: e?._id,
            booking_id: e?.booking_id || null,
            vendor_id: e?.vendor?._id,
            vendor_name: e?.vendor?.business_name || e?.vendor?.name || "N/A",
            vendor_email: e?.vendor?.email || "N/A",
            vendor_phone: e?.vendor?.phone_number || "N/A",
            profile_image: e?.vendor?.profile_image || null,
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
            created_date: moment(e?.createdAt).format("DD/MM/YYYY"),
            created_time: moment(e?.createdAt).format("hh:mm A"),
            createdAt: e?.createdAt
        }));

        // Calculate summary statistics for this vendor
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
                    vendor_net_earning: totalVendorEarning,
                    average_commission: parseFloat(avgCommission.toFixed(2)),
                    event_bookings: result.filter(e => e.booking_type === "event").length,
                    venue_bookings: result.filter(e => e.booking_type === "venue").length,
                    date_range: `${s_date} to ${e_date}`
                }
            },
            messages.SUCCESS
        );
    } catch (err) {
        console.error(err);
        return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
    }
};

// Get vendor's earnings summary
const getVendorEarningsSummary = async (req, res) => {
    try {
        const vendorId = req.vendor?._id;
        
        if (!vendorId) {
            return apiResponse.unauthorizedResponse(res, "Vendor not authenticated");
        }

        // Current month earnings
        const startOfMonth = moment().startOf('month');
        const endOfMonth = moment().endOf('month');

        const monthEarnings = await Earning.find({
            vendor: vendorId,
            createdAt: { $gte: startOfMonth.toDate(), $lte: endOfMonth.toDate() }
        });

        // Today's earnings
        const startOfDay = moment().startOf('day');
        const endOfDay = moment().endOf('day');

        const todayEarnings = await Earning.find({
            vendor: vendorId,
            createdAt: { $gte: startOfDay.toDate(), $lte: endOfDay.toDate() }
        });

        // All time earnings
        const allTimeEarnings = await Earning.find({ vendor: vendorId });

        const summary = {
            today: {
                bookings: todayEarnings.length,
                revenue: todayEarnings.reduce((sum, e) => sum + e.total_amount, 0),
                vendor_earning: todayEarnings.reduce((sum, e) => sum + e.vendor_earning, 0)
            },
            this_month: {
                bookings: monthEarnings.length,
                revenue: monthEarnings.reduce((sum, e) => sum + e.total_amount, 0),
                vendor_earning: monthEarnings.reduce((sum, e) => sum + e.vendor_earning, 0)
            },
            all_time: {
                bookings: allTimeEarnings.length,
                revenue: allTimeEarnings.reduce((sum, e) => sum + e.total_amount, 0),
                vendor_earning: allTimeEarnings.reduce((sum, e) => sum + e.vendor_earning, 0)
            }
        };

        return apiResponse.ok(res, summary, "Vendor earnings summary fetched successfully");
    } catch (err) {
        console.error(err);
        return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
    }
};

const getEventTabular = async (req, res) => {
  try {
    const vendor_id = req.userId;
    const { s_date, e_date } = req.query;

    let filter = {
      vendor_id,
      is_deleted: false
    };

    // ✅ Proper date handling (India/local safe)
    if (s_date && e_date) {
      const startOfDay = new Date(s_date);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(e_date);
      endOfDay.setHours(23, 59, 59, 999);

      filter.createdAt = {
        $gte: startOfDay,
        $lte: endOfDay
      };
    }

    const bookings = await Booking.find(filter)
      .populate({
        path: 'event_id',
        select: 'title',
        match: { is_deleted: false }   // ✅ correct
      })
      .populate({
        path: 'venue_id',
        select: 'venue_name',
        match: { is_deleted: false }   // ✅ correct
      })
      .sort({ createdAt: -1 });

    const data = bookings.map((item, index) => ({
      number: index + 1,
      booking_id: item._id,
      transaction_id: item.transaction_id || 'N/A',
      booking_type: item.booking_type,
      event_venue_name:
        item.booking_type === 'event'
          ? item.event_id?.title || 'Deleted Event'
          : item.venue_id?.venue_name || 'Deleted Venue',
      total_amount: item.total_amount || 0,
      status: item.status,
      createdAt: item.createdAt
    }));

    return res.status(200).json({
      success: true,
      message: 'Event tabular report fetched successfully',
      data
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: 'Something went wrong'
    });
  }
};
const getTabularBookingReportAdmin = async (req, res) => {
  try {

    const { s_date, e_date } = req.query;

    // Validate dates
    if (!s_date || !e_date) {
      return apiResponse.badRequest(res, "Start date and end date are required");
    }

    const startDate = moment(s_date).startOf("day").toDate();
    const endDate = moment(e_date).endOf("day").toDate();

    if (!moment(startDate).isValid() || !moment(endDate).isValid()) {
      return apiResponse.badRequest(res, "Invalid date format. Use YYYY-MM-DD");
    }

    if (moment(startDate).isAfter(endDate)) {
      return apiResponse.badRequest(res, "Start date cannot be after end date");
    }

    // ✅ ONLY THIS VENDOR BOOKINGS
    const bookings = await Booking.find({
      createdAt: { $gte: startDate, $lte: endDate },
      is_active: true,
      is_deleted: false
    })
      .populate({
        path: "user_id",
        select: "first_name last_name email phone_number country_code"
      })
      .populate({
        path: "event_id",
        select: "venue_name title"
      })
      .populate({
        path: "venue_id",
        select: "venue_name address"
      })
      // .populate({
      //   path: "ticket_id",
      //   select: "title ticket_price"
      // })
      .sort({ createdAt: -1 })
      .lean();

    const processedBookings = bookings.map((booking, index) => {
      let userFirstName = "";
      let userLastName = "";
      let userEmail = "";
      let userPhone = "";
      let countryCode = "";

      if (booking.user_id) {
        userFirstName = booking.user_id.first_name || "";
        userLastName = booking.user_id.last_name || "";
        userEmail = booking.user_id.email || "";
        userPhone = booking.user_id.phone_number || "";
        countryCode = booking.user_id.country_code || "";
      } else if (booking.contact_info) {
        userFirstName = booking.contact_info.first_name || "";
        userLastName = booking.contact_info.last_name || "";
        userEmail = booking.contact_info.email || "";
        userPhone = booking.contact_info.phone_number || "";
        countryCode = booking.contact_info.country_code || "";
      }

      let serviceTitle = "";
      if (booking.booking_type === "event" && booking.event_id) {
        serviceTitle =
          booking.event_id.venue_name ||
          booking.event_id.title ||
          "Event";
      } else if (booking.booking_type === "venue" && booking.venue_id) {
        serviceTitle = booking.venue_id.venue_name || "Venue";
      } else {
        serviceTitle = booking.booking_type || "Service";
      }

      const amount =
        booking.total ||
        booking.sub_total ||
        // booking.ticket_id?.ticket_price ||
        0;

      return {
        booking_id: booking._id,
        number: index + 1,
        first_name: userFirstName,
        last_name: userLastName,
        email: userEmail,
        phone_number: userPhone,
        country_code: countryCode,
        service_title: serviceTitle,
        booking_type: booking.booking_type,
        amount,
        total: amount,
        transaction_id: booking.transaction_id || "N/A",
        status: "Completed",
        createdAt: booking.createdAt
      };
    });

    // 📊 Summary
    const totalBookings = processedBookings.length;
    const eventBookings = processedBookings.filter(
      b => b.booking_type === "event"
    ).length;
    const venueBookings = processedBookings.filter(
      b => b.booking_type === "venue"
    ).length;
    const totalRevenue = processedBookings.reduce(
      (sum, b) => sum + (b.amount || 0),
      0
    );

    return apiResponse.ok(res, {
      data: processedBookings,
      summary: {
        total_bookings: totalBookings,
        event_bookings: eventBookings,
        venue_bookings: venueBookings,
        total_revenue: totalRevenue
      }
    }, "Vendor booking report fetched successfully");

  } catch (err) {
    console.error("Error in getTabularBookingReport:", err);
    return apiResponse.serverError(res, err.message);
  }
};

export default { getTabularUserReport, getTabularBookingReport, getTabularEarningsReport,getVendorEarningsSummary,getEventTabular,getTabularBookingReportAdmin };
