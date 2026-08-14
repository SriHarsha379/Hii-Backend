// controllers/userReportController.js


import { User, Booking, Earning } from "../../model/index.js";

// import { User, Booking } from "../../model/index.js";

import apiResponse from "../../utility/apiResponse.js";
import messages from "../../utility/messages.js";
import mongoose from "mongoose";
const getAnalyticalUserReport = async (req, res) => {
  try {
    const startOfYear = new Date(new Date().getFullYear(), 0, 1);
    const endOfYear = new Date(new Date().getFullYear(), 11, 31, 23, 59, 59);

    // ✅ MONTHLY
    const monthlyReport = await User.aggregate([
      {
        $match: {
          is_deleted: false,
          is_profile_completed: true,
          is_verified: true,
          createdAt: { $ne: null }
        }
      },
      {
        // 🔥 FIX: force Date conversion
        $addFields: {
          createdAtDate: { $toDate: "$createdAt" }
        }
      },
      {
        $match: {
          createdAtDate: { $gte: startOfYear, $lte: endOfYear }
        }
      },
      {
        $group: {
          _id: { month: { $month: "$createdAtDate" } },
          month_user_arr: { $sum: 1 }
        }
      },
      { $sort: { "_id.month": 1 } }
    ]);

    // ✅ YEARLY
    const yearlyReport = await User.aggregate([
      {
        $match: {
          is_deleted: false,
          is_profile_completed: true,
          is_verified: true,
          createdAt: { $ne: null }
        }
      },
      {
        // 🔥 FIX: force Date conversion
        $addFields: {
          createdAtDate: { $toDate: "$createdAt" }
        }
      },
      {
        $group: {
          _id: { year: { $year: "$createdAtDate" } },
          year_user_arr: { $sum: 1 }
        }
      },
      { $sort: { "_id.year": 1 } }
    ]);

    return apiResponse.ok(
      res,
      {
        month_report_arr: monthlyReport.map(m => ({
          month: m._id.month,
          month_user_arr: m.month_user_arr
        })),
        year_report_arr: yearlyReport.map(y => ({
          year: y._id.year,
          year_user_arr: y.year_user_arr
        }))
      },
      messages.SUCCESS
    );

  } catch (err) {
    console.error("Analytics Error:", err);
    return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
  }
};


const getAnalyticalBookingReport1 = async (req, res) => {
    try {
        // 🔑 Logged-in Vendor ID
        const vendorId = req.userId;

        const currentYear = new Date().getFullYear();
        const startOfYear = new Date(currentYear, 0, 1, 0, 0, 0);
        const endOfYear   = new Date(currentYear, 11, 31, 23, 59, 59);

        // ✅ MONTHLY REPORT (ONLY THIS VENDOR - CURRENT YEAR)
        const monthlyReport = await Booking.aggregate([
            {
                $match: {
                    vendor_id: vendorId,
                    createdAt: { $gte: startOfYear, $lte: endOfYear }
                }
            },
            {
                $group: {
                    _id: { month: { $month: "$createdAt" } },
                    month_booking_arr: { $sum: 1 }
                }
            },
            { $sort: { "_id.month": 1 } }
        ]);

        // ✅ YEARLY REPORT (ONLY THIS VENDOR - ALL YEARS)
        const yearlyReport = await Booking.aggregate([
            {
                $match: {
                    vendor_id: vendorId,
                    createdAt: { $ne: null }
                }
            },
            {
                $group: {
                    _id: { year: { $year: "$createdAt" } },
                    year_booking_arr: { $sum: 1 }
                }
            },
            { $sort: { "_id.year": 1 } }
        ]);

        return apiResponse.ok(
            res,
            {
                month_report_arr: monthlyReport.map(m => ({
                    month: m._id.month,
                    month_booking_arr: m.month_booking_arr
                })),
                year_report_arr: yearlyReport.map(y => ({
                    year: y._id.year,
                    year_booking_arr: y.year_booking_arr
                }))
            },
            messages.SUCCESS
        );

    } catch (err) {
        console.error("Error:", err);
        return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
    }
};



const getAnalyticalBookingReport = async (req, res) => {
    try {
        // 📅 Current Year Range
        const currentYear = new Date().getFullYear();
        const startOfYear = new Date(currentYear, 0, 1, 0, 0, 0);
        const endOfYear   = new Date(currentYear, 11, 31, 23, 59, 59);

        // ✅ MONTHLY REPORT (ALL VENDORS - CURRENT YEAR)
        const monthlyReport = await Booking.aggregate([
            {
                $match: {
                    createdAt: { $gte: startOfYear, $lte: endOfYear }
                    // ❌ vendor_id filter removed
                }
            },
            {
                $group: {
                    _id: {
                        month: { $month: "$createdAt" }
                    },
                    month_booking_arr: { $sum: 1 }
                }
            },
            { $sort: { "_id.month": 1 } }
        ]);

        // ✅ YEARLY REPORT (ALL VENDORS - ALL YEARS)
        const yearlyReport = await Booking.aggregate([
            {
                $group: {
                    _id: {
                        year: { $year: "$createdAt" }
                    },
                    year_booking_arr: { $sum: 1 }
                }
            },
            { $sort: { "_id.year": 1 } }
        ]);

        return apiResponse.ok(
            res,
            {
                month_report_arr: monthlyReport.map(m => ({
                    month: m._id.month,
                    month_booking_arr: m.month_booking_arr
                })),
                year_report_arr: yearlyReport.map(y => ({
                    year: y._id.year,
                    year_booking_arr: y.year_booking_arr
                }))
            },
            messages.SUCCESS
        );

    } catch (err) {
        console.error("Error:", err);
        return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
    }
};

// ✅ Get Analytical Earnings Report
const getAnalyticalEarningsReport = async (req, res) => {
    try {
        // Current year start & end
        const startOfYear = new Date(new Date().getFullYear(), 0, 1);
        const endOfYear = new Date(new Date().getFullYear(), 11, 31, 23, 59, 59);

        // ✅ Monthly Report (current year only)
        const monthlyReport = await Earning.aggregate([
            {
                $match: {
                    createdAt: { $gte: startOfYear, $lte: endOfYear }
                }
            },
            {
                $group: {
                    _id: { month: { $month: "$createdAt" } },
                    month_total_earnings: { $sum: "$total_amount" },
                    month_admin_earning: { $sum: "$admin_earning" }
                }
            },
            { $sort: { "_id.month": 1 } }
        ]);

        // ✅ Yearly Report (all years)
        const yearlyReport = await Earning.aggregate([
            {
                $group: {
                    _id: { year: { $year: "$createdAt" } },
                    year_total_earnings: { $sum: "$total_amount" },
                    year_admin_earning: { $sum: "$admin_earning" }
                }
            },
            { $sort: { "_id.year": 1 } }
        ]);

        // ✅ Response
        return apiResponse.ok(
            res,
            {
                month_report_arr: monthlyReport.map((m) => ({
                    month: m._id.month,
                    month_total_earnings: m.month_total_earnings,
                    month_admin_earning: m.month_admin_earning
                })),
                year_report_arr: yearlyReport.map((y) => ({
                    year: y._id.year,
                    year_total_earnings: y.year_total_earnings,
                    year_admin_earning: y.year_admin_earning
                }))
            },
            messages.SUCCESS
        );
    } catch (err) {
        console.error("Error:", err);
        return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
    }
};

const getVendorAnalyticalEarningsReport = async (req, res) => {
  try {
    // ✅ vendor ObjectId (IMPORTANT)
    const vendorObjectId = new mongoose.Types.ObjectId(req.userId);

    const currentYear = new Date().getFullYear();
    const startOfYear = new Date(currentYear, 0, 1, 0, 0, 0);
    const endOfYear   = new Date(currentYear, 11, 31, 23, 59, 59);

    // ================= MONTHLY =================
    const monthlyReport = await Earning.aggregate([
      {
        $match: {
          vendor: vendorObjectId,        // ✅ FIXED
          is_deleted: false,
          status: "completed",
          createdAt: { $gte: startOfYear, $lte: endOfYear }
        }
      },
      {
        $group: {
          _id: { month: { $month: "$createdAt" } },
          total_earning: { $sum: "$vendor_earning" } // 🔥 no need $toDouble
        }
      },
      { $sort: { "_id.month": 1 } }
    ]);

    // ================= YEARLY =================
    const yearlyReport = await Earning.aggregate([
      {
        $match: {
          vendor: vendorObjectId,        // ✅ FIXED
          is_deleted: false,
          status: "completed"
        }
      },
      {
        $group: {
          _id: { year: { $year: "$createdAt" } },
          total_earning: { $sum: "$vendor_earning" }
        }
      },
      { $sort: { "_id.year": 1 } }
    ]);

    return res.status(200).json({
      success: true,
      data: {
        month_report_arr: monthlyReport.map(m => ({
          month: m._id.month,
          month_user_arr: m.total_earning
        })),
        year_report_arr: yearlyReport.map(y => ({
          year: y._id.year,
          year_user_arr: y.total_earning
        }))
      },
      message: "Vendor analytical earning report fetched successfully"
    });

  } catch (err) {
    console.error("Vendor analytics error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};


export default { getAnalyticalUserReport, getAnalyticalBookingReport, getAnalyticalEarningsReport,
  getVendorAnalyticalEarningsReport,getAnalyticalBookingReport1
 };


