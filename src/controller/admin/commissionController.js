import { Commission } from "../../model/index.js";
import apiResponse from "../../utility/apiResponse.js";
import messages from "../../utility/messages.js";


// ---------------- GET COMMISSION ----------------
const getCommission = async (req, res) => {
  try {
    let commission = await Commission.findOne();

    console.log("FULL COMMISSION:", commission);
    console.log("VALUE:", commission?.commission_percentage);

    if (!commission) {
      commission = await Commission.create({
        commission_percentage: 18,
      });
    }


    // Return proper response with correct field name
    const responseData = {
      _id: commission._id,
      commission_percentage: commission?.commission_percentage || 0, // Keep original field name
      updatedAt: commission.updatedAt
    };

    return apiResponse.ok(res, responseData, messages.COMMISSION_FETCHED);
  } catch (error) {
    return apiResponse.serverError(res, "Server error", error.message);
  }
};

// UPDATE COMMISSION 
const updateCommission = async (req, res) => {
  try {
    const { commission_percentage } = req.body;

    // Validation
    if (commission_percentage === undefined || commission_percentage === null) {
      return apiResponse.badRequest(res, messages.COMMISSION_REQ);
    }

    if (isNaN(commission_percentage) || commission_percentage < 0 || commission_percentage > 100) {
      return apiResponse.badRequest(res, messages.COMMISSION_NOT_VALID);
    }

    // Find existing commission
    let commission = await Commission.findOne();

    // If not found, create it
    if (!commission) {
      commission = await Commission.create({
        commission_percentage,
        created_by: req.user?._id || req.vendor?._id,
      });
    } else {
      commission.commission_percentage = commission_percentage;
      commission.updated_by = req.user?._id || req.vendor?._id;
      await commission.save();
    }

    // Return proper response with correct field name
    const responseData = {
      _id: commission._id,
      commission_percentage: commission.commission_percentage,
      createdAt: commission.createdAt,
      updatedAt: commission.updatedAt
    };

    return apiResponse.ok(res, responseData, messages.COMMISSION_UPDATED);
  } catch (error) {
    return apiResponse.serverError(res, "Server error", error.message);
  }
};

export default {
  getCommission,
  updateCommission
};