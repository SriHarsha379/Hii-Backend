/** @format */

import apiResponse from "../../utility/apiResponse.js";
import messages from "../../utility/messages.js";


import { WithdrawRequest, Booking, Earning } from "../../model/index.js";

// =========================
// GET VENDOR WITHDRAWALS
// =========================
const getVendorWithdrawals = async (req, res) => {
  try {
    const vendorId = req.vendor._id;
    console.log('==========================================');
    console.log('🔍 GET VENDOR WITHDRAWALS CALLED');
    console.log('🔍 Vendor ID from token:', vendorId);
    console.log('==========================================');

    // ==========================================
    // STEP 1: Fetch all withdrawals
    // ==========================================
    console.log('📥 Fetching withdrawals for vendor...');
    const withdrawals = await WithdrawRequest.find({ vendor_id: vendorId })
      .sort({ createdAt: -1 });

    console.log(`📊 Found ${withdrawals.length} withdrawal requests`);
    if (withdrawals.length > 0) {
      console.log('📝 Withdrawals:', withdrawals.map(w => ({
        id: w._id,
        amount: w.amount,
        status: w.status
      })));
    }

    // ==========================================
    // STEP 2: Fetch ALL bookings for this vendor (without filters)
    // ==========================================
    console.log('\n📥 Fetching ALL bookings for vendor (unfiltered)...');
    const allVendorBookings = await Booking.find({
      vendor_id: vendorId
    });

    console.log(`📊 Total bookings in database for this vendor: ${allVendorBookings.length}`);

    if (allVendorBookings.length > 0) {
      console.log('📝 All bookings (raw):', allVendorBookings.map(b => ({
        id: b._id,
        sub_total: b.sub_total,
        admin_earning: b.admin_earning,
        payment_status: b.payment_status,
        booking_status: b.booking_status,
        transaction_id: b.transaction_id
      })));
    } else {
      console.log('⚠️ No bookings found for this vendor in database!');
    }

    // ==========================================
    // STEP 3: Fetch filtered bookings (successful & confirmed)
    // ==========================================
    console.log('\n📥 Fetching FILTERED bookings (payment_status=success, booking_status=confirmed/completed)...');
    const bookings = await Booking.find({
      vendor_id: vendorId,
      payment_status: "success",
      booking_status: { $in: ["confirmed", "completed"] },
      is_deleted: false
    });

    console.log(`📊 Filtered bookings count: ${bookings.length}`);

    // ==========================================
    // STEP 4: Calculate total earnings
    // ==========================================
    console.log('\n💰 Calculating earnings from bookings...');

    let totalEarnings = 0;
    const earningsBreakdown = [];

    bookings.forEach((booking, index) => {
      const subTotal = booking.sub_total || 0;
      const adminEarning = booking.admin_earning || 0;
      const vendorEarning = subTotal - adminEarning;

      earningsBreakdown.push({
        booking_id: booking._id,
        sub_total: subTotal,
        admin_earning: adminEarning,
        vendor_earning: vendorEarning,
        payment_status: booking.payment_status,
        booking_status: booking.booking_status
      });

      totalEarnings += vendorEarning;

      console.log(`  Booking ${index + 1}:`);
      console.log(`    ID: ${booking._id}`);
      console.log(`    Sub Total: $${subTotal}`);
      console.log(`    Admin Earning: $${adminEarning}`);
      console.log(`    Vendor Earning: $${vendorEarning}`);
      console.log(`    Payment Status: ${booking.payment_status}`);
      console.log(`    Booking Status: ${booking.booking_status}`);
      console.log('    ---');
    });

    console.log('\n📊 Earnings Breakdown:', earningsBreakdown);
    console.log(`💰 TOTAL EARNINGS CALCULATED: $${totalEarnings}`);

    // ==========================================
    // STEP 5: Calculate pending withdrawals
    // ==========================================
    console.log('\n⏳ Calculating pending withdrawals...');
    const pendingWithdrawalsResult = await WithdrawRequest.aggregate([
      {
        $match: {
          vendor_id: vendorId,
          status: "pending"
        }
      },
      {
        $group: {
          _id: null,
          total_pending: { $sum: "$amount" }
        }
      }
    ]);

    const totalPending = pendingWithdrawalsResult[0]?.total_pending || 0;
    console.log(`⏳ Total Pending Withdrawals: $${totalPending}`);

    // ==========================================
    // STEP 6: Calculate approved withdrawals
    // ==========================================
    console.log('\n✅ Calculating approved withdrawals...');
    const approvedWithdrawalsResult = await WithdrawRequest.aggregate([
      {
        $match: {
          vendor_id: vendorId,
          status: "approved"
        }
      },
      {
        $group: {
          _id: null,
          total_approved: { $sum: "$amount" }
        }
      }
    ]);

    const totalApproved = approvedWithdrawalsResult[0]?.total_approved || 0;
    console.log(`✅ Total Approved Withdrawals: $${totalApproved}`);

    // ==========================================
    // STEP 7: Calculate remaining amount
    // ==========================================
    console.log('\n🧮 Calculating remaining amount...');
    const remainingAmount = totalEarnings - (totalPending + totalApproved);

    console.log(`   Total Earnings: $${totalEarnings}`);
    console.log(`   Total Pending: $${totalPending}`);
    console.log(`   Total Approved: $${totalApproved}`);
    console.log(`   Remaining Amount: $${remainingAmount}`);

    // ==========================================
    // STEP 8: Format withdrawals for response
    // ==========================================
    const formattedWithdrawals = withdrawals.map(item => ({
      _id: item._id,
      amount: item.amount,
      description: item.description || "Withdrawal request",
      status: item.status,
      transaction_id: item.transaction_id || '',
      reject_reason: item.reject_reason || '',
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      bank: {
        bank_name: item.bank?.bank_name || '',
        account_holder_name: item.bank?.account_holder_name || '',
        account_type: item.bank?.account_type || '',
        account_number: item.bank?.account_number || '',
        ifsc_code: item.bank?.ifsc_code || ''
      }
    }));

    // ==========================================
    // STEP 9: Send response
    // ==========================================
    console.log('\n==========================================');
    console.log('✅ FINAL RESPONSE DATA:');
    console.log('==========================================');
    console.log('Withdrawals count:', formattedWithdrawals.length);
    console.log('Remaining Amount:', remainingAmount);
    console.log('Summary:', {
      total_earnings: totalEarnings,
      total_pending: totalPending,
      total_approved: totalApproved,
      total_withdrawn: totalApproved,
      available_balance: remainingAmount
    });
    console.log('==========================================\n');

    return apiResponse.ok(
      res,
      {
        withdrawals: formattedWithdrawals,
        remaining_amount: remainingAmount,
        summary: {
          total_earnings: totalEarnings,
          total_pending: totalPending,
          total_approved: totalApproved,
          total_withdrawn: totalApproved,
          available_balance: remainingAmount
        }
      },
      "Withdrawal requests fetched successfully"
    );

  } catch (err) {
    console.error("❌ Get withdrawals error:", err);
    console.error("❌ Error stack:", err.stack);
    return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
  }
};

// =========================
// GET SINGLE WITHDRAW REQUEST
// =========================

const getWithdrawalById = async (req, res) => {
  try {
    const vendorId = req.vendor._id;
    const { id } = req.params;

    const withdrawal = await WithdrawRequest.findOne({
      _id: id,
      vendor_id: vendorId
    });

    if (!withdrawal) {
      return apiResponse.notFound(res, "Withdrawal request not found");
    }

    const responseData = {
      _id: withdrawal._id,
      request_for: withdrawal.request_for,
      amount: withdrawal.requested_amount,
      description: withdrawal.description || `Withdrawal request for ${withdrawal.request_for}`,
      status: withdrawal.status,
      transaction_id: withdrawal.transaction_id,
      reject_reason: withdrawal.reject_reason,
      createdAt: withdrawal.createdAt,
      updatedAt: withdrawal.updatedAt,
      bank: withdrawal.bank,
      event_id: withdrawal.event_id,
      venue_id: withdrawal.venue_id
    };

    return apiResponse.ok(res, responseData, "Withdrawal details fetched successfully");
  } catch (err) {
    console.error("Get withdrawal by ID error:", err);
    return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
  }
};

// =========================
// DELETE WITHDRAW REQUEST (Only if pending)
// =========================

const deleteWithdrawal = async (req, res) => {
  try {
    const vendorId = req.vendor._id;
    const { id } = req.params;

    const withdrawal = await WithdrawRequest.findOne({
      _id: id,
      vendor_id: vendorId
    });

    if (!withdrawal) {
      return apiResponse.notFound(res, "Withdrawal request not found");
    }

    // Only allow deletion of pending requests
    if (withdrawal.status !== 'pending') {
      return apiResponse.badRequest(res, "Only pending withdrawal requests can be deleted");
    }

    await WithdrawRequest.findByIdAndDelete(id);

    return apiResponse.ok(res, null, "Withdrawal request deleted successfully");
  } catch (err) {
    console.error("Delete withdrawal error:", err);
    return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
  }
};

// =========================
// GET VENDOR EARNINGS SUMMARY
// =========================
const getVendorEarnings = async (req, res) => {
  try {
    const vendorId = req.vendor._id;
    console.log('🔍 Vendor ID for earnings:', vendorId);

    // ✅ Calculate total earnings from EARNING model
    const earningsResult = await Earning.aggregate([
      {
        $match: {
          vendor: vendorId, // ✅ Yahan 'vendor' field check ho raha hai
          status: "completed",
          is_active: true
        }
      },
      {
        $group: {
          _id: null,
          total_vendor_earnings: { $sum: "$vendor_earning" },
          total_commission_paid: { $sum: "$admin_earning" },
          total_revenue: { $sum: "$total_amount" },
          total_bookings: { $sum: 1 }
        }
      }
    ]);

    console.log('📊 Earnings result:', earningsResult);

    // ✅ Calculate pending withdrawals
    const pendingWithdrawals = await WithdrawRequest.aggregate([
      {
        $match: {
          vendor_id: vendorId, // ✅ Yahan 'vendor_id' field check ho raha hai
          status: 'pending'
        }
      },
      {
        $group: {
          _id: null,
          pending_amount: { $sum: "$requested_amount" },
          pending_count: { $sum: 1 }
        }
      }
    ]);

    console.log('⏳ Pending withdrawals:', pendingWithdrawals);

    // ✅ Calculate completed (already paid) withdrawals
    const completedWithdrawals = await WithdrawRequest.aggregate([
      {
        $match: {
          vendor_id: vendorId, // ✅ Yahan 'vendor_id' field check ho raha hai
          status: 'approved'
        }
      },
      {
        $group: {
          _id: null,
          paid_amount: { $sum: "$requested_amount" },
          paid_count: { $sum: 1 }
        }
      }
    ]);

    console.log('✅ Completed withdrawals:', completedWithdrawals);

    const totalEarnings = earningsResult[0]?.total_vendor_earnings || 0;
    const pendingAmount = pendingWithdrawals[0]?.pending_amount || 0;
    const paidAmount = completedWithdrawals[0]?.paid_amount || 0;

    // ✅ Available balance = Total earnings - (Pending + Already paid)
    const availableBalance = totalEarnings - (pendingAmount + paidAmount);

    console.log('💰 Calculated amounts:', {
      totalEarnings,
      pendingAmount,
      paidAmount,
      availableBalance
    });

    const responseData = {
      total_vendor_earnings: totalEarnings,
      total_revenue: earningsResult[0]?.total_revenue || 0,
      total_commission_paid: earningsResult[0]?.total_commission_paid || 0,
      total_bookings: earningsResult[0]?.total_bookings || 0,
      pending_withdrawal_amount: pendingAmount,
      pending_withdrawal_count: pendingWithdrawals[0]?.pending_count || 0,
      paid_withdrawal_amount: paidAmount,
      paid_withdrawal_count: completedWithdrawals[0]?.paid_count || 0,
      available_balance: availableBalance > 0 ? availableBalance : 0,
      break_down: {
        earnings_from_events: await getEarningsByType(vendorId, 'event'),
        earnings_from_venues: await getEarningsByType(vendorId, 'venue')
      }
    };

    return apiResponse.ok(res, responseData, "Earnings summary fetched successfully");
  } catch (err) {
    console.error("❌ Get vendor earnings error:", err);
    return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
  }
};

// Helper function to get earnings by type
const getEarningsByType = async (vendorId, type) => {
  const result = await Earning.aggregate([
    {
      $match: {
        vendor: vendorId,
        booking_type: type,
        status: "completed",
        is_active: true
      }
    },
    {
      $group: {
        _id: null,
        total_earnings: { $sum: "$vendor_earning" },
        total_bookings: { $sum: 1 }
      }
    }
  ]);

  return {
    total_earnings: result[0]?.total_earnings || 0,
    total_bookings: result[0]?.total_bookings || 0
  };
};

// =========================
// GET EVENT WISE EARNINGS
// =========================
const getEventEarnings = async (req, res) => {
  try {
    const vendorId = req.vendor._id;

    // ✅ Get earnings from EARNING model for events
    const eventEarnings = await Earning.aggregate([
      {
        $match: {
          vendor: vendorId,
          booking_type: 'event',
          status: "completed",
          is_active: true
        }
      },
      {
        $lookup: {
          from: "events",
          localField: "event_id",
          foreignField: "_id",
          as: "event"
        }
      },
      { $unwind: "$event" },
      {
        $group: {
          _id: "$event_id",
          event_name: { $first: "$event.venue_name" },
          total_earnings: { $sum: "$vendor_earning" }, // ✅ vendor_earning use karein
          total_bookings: { $sum: 1 },
          total_revenue: { $sum: "$total_amount" },
          total_commission: { $sum: "$admin_earning" }
        }
      },
      { $sort: { total_earnings: -1 } }
    ]);

    // Calculate available for withdrawal (minus pending withdrawals for each event)
    const formattedEarnings = await Promise.all(
      eventEarnings.map(async (item) => {
        // Find pending withdrawals for this specific event
        const pendingForEvent = await WithdrawRequest.aggregate([
          {
            $match: {
              vendor_id: vendorId,
              event_id: item._id,
              status: 'pending'
            }
          },
          {
            $group: {
              _id: null,
              pending_amount: { $sum: "$requested_amount" }
            }
          }
        ]);

        const pendingAmount = pendingForEvent[0]?.pending_amount || 0;

        return {
          _id: item._id,
          event_id: item._id,
          event_name: item.event_name,
          total_earnings: item.total_earnings,
          total_bookings: item.total_bookings,
          total_revenue: item.total_revenue,
          total_commission: item.total_commission,
          pending_withdrawals: pendingAmount,
          available_for_withdrawal: Math.max(0, item.total_earnings - pendingAmount)
        };
      })
    );

    return apiResponse.ok(res, formattedEarnings, "Event-wise earnings fetched successfully");
  } catch (err) {
    console.error("Get event earnings error:", err);
    return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
  }
};

// =========================
// GET VENUE WISE EARNINGS
// =========================
const getVenueEarnings = async (req, res) => {
  try {
    const vendorId = req.vendor._id;

    // ✅ Get earnings from EARNING model for venues
    const venueEarnings = await Earning.aggregate([
      {
        $match: {
          vendor: vendorId,
          booking_type: 'venue',
          status: "completed",
          is_active: true
        }
      },
      {
        $lookup: {
          from: "venues",
          localField: "venue_id",
          foreignField: "_id",
          as: "venue"
        }
      },
      { $unwind: "$venue" },
      {
        $group: {
          _id: "$venue_id",
          venue_name: { $first: "$venue.venue_name" },
          total_earnings: { $sum: "$vendor_earning" }, // ✅ vendor_earning use karein
          total_bookings: { $sum: 1 },
          total_revenue: { $sum: "$total_amount" },
          total_commission: { $sum: "$admin_earning" }
        }
      },
      { $sort: { total_earnings: -1 } }
    ]);

    // Calculate available for withdrawal (minus pending withdrawals for each venue)
    const formattedEarnings = await Promise.all(
      venueEarnings.map(async (item) => {
        // Find pending withdrawals for this specific venue
        const pendingForVenue = await WithdrawRequest.aggregate([
          {
            $match: {
              vendor_id: vendorId,
              venue_id: item._id,
              status: 'pending'
            }
          },
          {
            $group: {
              _id: null,
              pending_amount: { $sum: "$requested_amount" }
            }
          }
        ]);

        const pendingAmount = pendingForVenue[0]?.pending_amount || 0;

        return {
          _id: item._id,
          venue_id: item._id,
          venue_name: item.venue_name,
          total_earnings: item.total_earnings,
          total_bookings: item.total_bookings,
          total_revenue: item.total_revenue,
          total_commission: item.total_commission,
          pending_withdrawals: pendingAmount,
          available_for_withdrawal: Math.max(0, item.total_earnings - pendingAmount)
        };
      })
    );

    return apiResponse.ok(res, formattedEarnings, "Venue-wise earnings fetched successfully");
  } catch (err) {
    console.error("Get venue earnings error:", err);
    return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
  }
};

// =========================
// CREATE WITHDRAW REQUEST
// =========================
const requestWithdraw = async (req, res) => {
  try {
    const vendorId = req.vendor._id;

    const {
      amount,
      description,
      bank
    } = req.body;

    // Basic validation
    if (!amount || amount <= 0) {
      return apiResponse.badRequest(res, "Please enter a valid amount");
    }

    if (!description || description.length < 10) {
      return apiResponse.badRequest(res, "Description must be at least 10 characters");
    }

    // Bank details validation
    if (!bank ||
      !bank.account_holder_name ||
      !bank.bank_name ||
      !bank.account_number ||
      !bank.ifsc_code ||
      !bank.account_type) {
      return apiResponse.badRequest(res, "Please provide all bank details");
    }

    if (!['savings', 'current'].includes(bank.account_type)) {
      return apiResponse.badRequest(res, "Account type must be savings or current");
    }

    // ✅ FIX: Calculate total earnings from Bookings (not Earning model)
    const bookings = await Booking.find({
      vendor_id: vendorId,
      payment_status: "success",
      booking_status: { $in: ["confirmed", "completed"] },
      is_deleted: false
    });

    const totalEarnings = bookings.reduce((sum, booking) => {
      const vendorEarning = (booking.sub_total || 0) - (booking.admin_earning || 0);
      return sum + vendorEarning;
    }, 0);

    console.log('💰 Total Earnings from Bookings:', totalEarnings);

    // ✅ Calculate total pending withdrawals
    const pendingWithdrawalsResult = await WithdrawRequest.aggregate([
      {
        $match: {
          vendor_id: vendorId,
          status: "pending"
        }
      },
      {
        $group: {
          _id: null,
          total_pending: { $sum: "$amount" }
        }
      }
    ]);

    const totalPending = pendingWithdrawalsResult[0]?.total_pending || 0;
    console.log('⏳ Total Pending Withdrawals:', totalPending);

    // ✅ Calculate total approved withdrawals
    const approvedWithdrawalsResult = await WithdrawRequest.aggregate([
      {
        $match: {
          vendor_id: vendorId,
          status: "approved"
        }
      },
      {
        $group: {
          _id: null,
          total_approved: { $sum: "$amount" }
        }
      }
    ]);

    const totalApproved = approvedWithdrawalsResult[0]?.total_approved || 0;
    console.log('✅ Total Approved Withdrawals:', totalApproved);

    // ✅ Calculate available balance
    const availableBalance = totalEarnings - (totalPending + totalApproved);
    console.log('💳 Available Balance:', availableBalance);

    // Check if requested amount exceeds available balance
    if (parseFloat(amount) > availableBalance) {
      return apiResponse.badRequest(res,
        `Requested amount ($${parseFloat(amount).toFixed(2)}) exceeds available balance ($${availableBalance.toFixed(2)}). 
         Total Earnings: $${totalEarnings.toFixed(2)} 
         Pending Withdrawals: $${totalPending.toFixed(2)}
         Approved Withdrawals: $${totalApproved.toFixed(2)}`
      );
    }

    // ✅ Create withdrawal request
    const withdrawData = {
      vendor_id: vendorId,
      amount: parseFloat(amount),
      description: description.trim(),
      bank: {
        account_holder_name: bank.account_holder_name.trim(),
        bank_name: bank.bank_name.trim(),
        account_number: bank.account_number.trim(),
        ifsc_code: bank.ifsc_code.toUpperCase().trim(),
        account_type: bank.account_type
      },
      status: "pending"
    };

    const request = await WithdrawRequest.create(withdrawData);

    // Calculate new available balance after this request
    const newAvailableBalance = availableBalance - parseFloat(amount);

    // Response data
    const responseData = {
      _id: request._id,
      amount: request.amount,
      description: request.description,
      status: request.status,
      transaction_id: request.transaction_id || '',
      reject_reason: request.reject_reason || '',
      createdAt: request.createdAt,
      bank: request.bank,
      summary: {
        total_earnings: totalEarnings,
        total_pending: totalPending,
        total_approved: totalApproved,
        available_before: availableBalance,
        new_available: newAvailableBalance
      }
    };

    return apiResponse.created(res, responseData, "Withdrawal request submitted successfully");

  } catch (err) {
    console.error("Create withdrawal error:", err);
    return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
  }
};

export default {
  requestWithdraw,
  getVendorWithdrawals,
  getWithdrawalById,
  deleteWithdrawal,
  getVendorEarnings,
  getEventEarnings,
  getVenueEarnings
};