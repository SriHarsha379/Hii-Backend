/** @format */
import { WithdrawRequest, Notification } from "../../model/index.js";
import apiResponse from "../../utility/apiResponse.js";
import messages from "../../utility/messages.js";

// =========================
// GET ALL WITHDRAW REQUESTS (ADMIN)
// =========================
const getAllWithdraws = async (req, res) => {
  try {
    console.log('📥 Fetching all withdrawal requests for admin...');

    const list = await WithdrawRequest.find({})
      .populate("vendor_id", "name email phone_number business_image")
      .sort({ createdAt: -1 });

    console.log(`📊 Found ${list.length} withdrawal requests`);

    const transformedList = list.map(item => {
      // Get vendor details
      const vendorName = item.vendor_id?.name ||
        item.vendor_id?.business_name ||
        'Unknown Vendor';
      const vendorPhone = item.vendor_id?.phone_number || 'N/A';
      const vendorEmail = item.vendor_id?.email || 'N/A';

      return {
        _id: item._id,
        vendor: {
          business_name: vendorName,
          phone_number: vendorPhone,
          email: vendorEmail
        },
        amount: item.amount,
        description: item.description || 'Withdrawal request',
        status: item.status,
        transaction_id: item.transaction_id || '',
        reject_reason: item.reject_reason || '',
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        bank: item.bank ? {
          account_holder_name: item.bank.account_holder_name,
          bank_name: item.bank.bank_name,
          account_number: item.bank.account_number,
          ifsc_code: item.bank.ifsc_code,
          account_type: item.bank.account_type
        } : null
      };
    });

    console.log('✅ Withdrawal requests fetched successfully');

    return apiResponse.ok(
      res,
      transformedList,
      "Withdrawal requests fetched successfully"
    );

  } catch (err) {
    console.error("❌ Get all withdrawals error:", err);
    console.error("❌ Error stack:", err.stack);
    return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
  }
};

// =========================
// APPROVE WITHDRAW REQUEST (ADMIN)
// =========================
const approveWithdraw = async (req, res) => {
  try {
    const { id } = req.params;
    const { transaction_id } = req.body;
    const adminId = req.admin?._id || req.user?._id;

    console.log('✅ Approving withdrawal request:', id);
    console.log('📝 Transaction ID:', transaction_id);

    if (!transaction_id || !transaction_id.trim()) {
      return apiResponse.badRequest(res, "Transaction ID is required");
    }

    const withdrawal = await WithdrawRequest.findById(id);

    if (!withdrawal) {
      console.log('❌ Withdrawal request not found:', id);
      return apiResponse.notFoundResponse(res, "Withdrawal request not found");
    }

    if (withdrawal.status !== 'pending') {
      return apiResponse.badRequest(
        res,
        `Cannot approve ${withdrawal.status} request`
      );
    }

    // Update withdrawal
    withdrawal.status = 'approved';
    withdrawal.transaction_id = transaction_id.trim();
    withdrawal.processed_by = adminId;
    withdrawal.processed_at = new Date();

    await withdrawal.save();

    // Populate vendor details for response
    await withdrawal.populate('vendor_id', 'name email phone_number');

    console.log('✅ Withdrawal approved successfully:', id);

    try {
      if (withdrawal.vendor_id) {
        await Notification.create({
          vendor_user_id: withdrawal.vendor_id,
          other_user_id: null,
          title: "Withdrawal Approved",
          message: `Your withdrawal request has been approved. Transaction ID: ${transaction_id}`,
          read_status: 0,
          action: "withdraw_approved"
        });
      }
    } catch (notifError) {
      console.warn("Notification failed:", notifError.message);
    }

    return apiResponse.ok(
      res,
      {
        _id: withdrawal._id,
        status: withdrawal.status,
        transaction_id: withdrawal.transaction_id,
        vendor: withdrawal.vendor_id ? {
          name: withdrawal.vendor_id.name,
          email: withdrawal.vendor_id.email
        } : null
      },
      "Withdrawal approved successfully"
    );

  } catch (err) {
    console.error("❌ Approve withdrawal error:", err);
    return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
  }
};

// =========================
// REJECT WITHDRAW REQUEST (ADMIN)
// =========================
const rejectWithdraw = async (req, res) => {
  try {
    const { id } = req.params;
    const { reject_reason } = req.body;
    const adminId = req.admin?._id || req.user?._id;

    console.log('❌ Rejecting withdrawal request:', id);
    console.log('📝 Reject reason:', reject_reason);

    if (!reject_reason || !reject_reason.trim()) {
      return apiResponse.badRequest(res, "Reject reason is required");
    }

    if (reject_reason.length < 10) {
      return apiResponse.badRequest(
        res,
        "Reject reason must be at least 10 characters"
      );
    }

    const withdrawal = await WithdrawRequest.findById(id);

    if (!withdrawal) {
      console.log('❌ Withdrawal request not found:', id);
      return apiResponse.notFoundResponse(res, "Withdrawal request not found");
    }

    if (withdrawal.status !== 'pending') {
      return apiResponse.badRequest(
        res,
        `Cannot reject ${withdrawal.status} request`
      );
    }

    // Update withdrawal
    withdrawal.status = 'rejected';
    withdrawal.reject_reason = reject_reason.trim();
    withdrawal.processed_by = adminId;
    withdrawal.processed_at = new Date();

    await withdrawal.save();


    // Populate vendor details for response
    await withdrawal.populate('vendor_id', 'name email phone_number');

    console.log('✅ Withdrawal rejected successfully:', id);


    try {
      if (withdrawal.vendor_id) {
        await Notification.create({
          vendor_user_id: withdrawal.vendor_id,
          other_user_id: null,
          title: "Withdrawal Rejected",
          message: `Your withdrawal request was rejected. Reason: ${reject_reason}`,
          read_status: 0,
          action: "withdraw_rejected"
        });
      }
    } catch (notifError) {
      console.warn("Notification failed:", notifError.message);
    }

    return apiResponse.ok(
      res,
      {
        _id: withdrawal._id,
        status: withdrawal.status,
        reject_reason: withdrawal.reject_reason,
        vendor: withdrawal.vendor_id ? {
          name: withdrawal.vendor_id.name,
          email: withdrawal.vendor_id.email
        } : null
      },
      "Withdrawal rejected successfully"
    );

  } catch (err) {
    console.error("❌ Reject withdrawal error:", err);
    return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
  }
};



const getAllWithdrawsVendor = async (req, res) => {
  try {
    const vendor = req.vendor._id;
    const list = await WithdrawRequest.find({ vendor_id: vendor })
      .populate("vendor_id", "name email phone_number business_image")
      .populate("venue_id", "venue_name")
      .populate("event_id", "venue_name date")
      .sort({ createdAt: -1 });

    const transformedList = list.map(item => {
      // Determine the entity name based on request_for
      let entityName = 'N/A';
      let entityPhone = 'N/A';

      if (item.request_for === 'vendor' && item.vendor_id) {
        entityName = item.vendor_id.name || item.vendor_id.business_name || 'Vendor';
        entityPhone = item.vendor_id.phone_number || 'N/A';
      } else if (item.request_for === 'venue' && item.venue_id) {
        entityName = item.venue_id.venue_name;
        entityPhone = 'N/A';
      } else if (item.request_for === 'event' && item.event_id) {
        entityName = item.event_id.venue_name;
        entityPhone = 'N/A';
      }

      return {
        _id: item._id,
        vendor: {
          business_name: entityName,
          phone_number: entityPhone,
          email: item.vendor_id?.email || 'N/A'
        },
        request_for: item.request_for,
        amount: item.requested_amount,
        description: item.description || `Withdrawal request for ${item.request_for}`,
        status: item.status,
        transaction_id: item.transaction_id,
        reject_reason: item.reject_reason,
        createdAt: item.createdAt,
        bank: item.bank
      };
    });

    return apiResponse.ok(res, transformedList, "Withdrawal list fetched successfully");
  } catch (err) {
    console.error("Get all withdrawals error:", err);
    return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
  }
};


export default {
  getAllWithdraws,
  approveWithdraw,
  rejectWithdraw,
  getAllWithdrawsVendor
};