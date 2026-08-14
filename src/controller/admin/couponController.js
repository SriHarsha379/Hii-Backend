/** @format */
import { Coupon } from "../../model/index.js";
import apiResponse from "../../utility/apiResponse.js";
import messages from "../../utility/messages.js";

// Create Coupon
const createCoupon = async (req, res) => {
  try {
    const vendor_id = req.vendor._id;
    const { title, promo_code, discount_percentage, expiry_date, max_usage_limit, description } = req.body;

    // Validation
    if (!title || !promo_code || !discount_percentage || !expiry_date) {
      return apiResponse.badRequestResponse(res, "All fields are required");
    }

    if (discount_percentage < 0 || discount_percentage > 100) {
      return apiResponse.badRequestResponse(res, "Discount percentage must be between 0 and 100");
    }

    const expiryDate = new Date(expiry_date);
    if (expiryDate <= new Date()) {
      return apiResponse.badRequestResponse(res, "Expiry date must be in the future");
    }

    // Check if promo code already exists (globally unique)
    const existingCoupon = await Coupon.findOne({
      promo_code: promo_code.trim().toUpperCase(),
      is_deleted: false,
    });

    if (existingCoupon) {
      return apiResponse.badRequest(res, "This promo code is already taken");
    }

    // Create new coupon
    const coupon = new Coupon({
      vendor_id,
      title: title.trim(),
      promo_code: promo_code.trim().toUpperCase(),
      discount_percentage: Number(discount_percentage),
      expiry_date: expiryDate,
      max_usage_limit: max_usage_limit ? Number(max_usage_limit) : null,
      description: description || "",
    });

    await coupon.save();

    return apiResponse.created(res, coupon, "Coupon created successfully");
  } catch (err) {
    console.error("Create coupon error:", err);
    return apiResponse.serverError(res, "Server error occurred", err.message);
  }
};

// Get All Coupons
const getAllCoupons = async (req, res) => {
  try {
    const vendor_id = req.vendor._id;

    const coupons = await Coupon.find({
      vendor_id,
      is_deleted: false,
    }).sort({ createdAt: -1 });

    return apiResponse.ok(res, coupons, "Success");
  } catch (err) {
    console.error("Get coupons error:", err);
    return apiResponse.serverError(res, "Server error occurred", err.message);
  }
};

// Get Coupon By ID
const getCouponById = async (req, res) => {
  try {
    const vendor_id = req.vendor._id;

    const coupon = await Coupon.findOne({
      _id: req.params.id,
      vendor_id,
      is_deleted: false,
    });

    if (!coupon) {
      return apiResponse.notFoundResponse(res, "Coupon not found");
    }

    return apiResponse.ok(res, coupon, "Success");
  } catch (err) {
    console.error("Get coupon by ID error:", err);
    return apiResponse.serverError(res, "Server error occurred", err.message);
  }
};

// Update Coupon
const updateCoupon = async (req, res) => {
  try {
    const vendor_id = req.vendor._id;
    const couponId = req.params.id;

    // Check if coupon exists and belongs to vendor
    const coupon = await Coupon.findOne({
      _id: couponId,
      vendor_id,
      is_deleted: false,
    });

    if (!coupon) {
      return apiResponse.notFoundResponse(res, "Coupon not found");
    }

    const updateData = { ...req.body };

    // Validate discount percentage if provided
    if (updateData.discount_percentage !== undefined) {
      if (updateData.discount_percentage < 0 || updateData.discount_percentage > 100) {
        return apiResponse.badRequestResponse(res, "Discount percentage must be between 0 and 100");
      }
      updateData.discount_percentage = Number(updateData.discount_percentage);
    }

    // Validate expiry date if provided
    if (updateData.expiry_date !== undefined) {
      const expiryDate = new Date(updateData.expiry_date);
      if (expiryDate <= new Date()) {
        return apiResponse.badRequestResponse(res, "Expiry date must be in the future");
      }
      updateData.expiry_date = expiryDate;
    }

    // Validate max usage limit if provided
    if (updateData.max_usage_limit !== undefined) {
      if (updateData.max_usage_limit < coupon.current_usage_count) {
        return apiResponse.badRequestResponse(res, `Max usage cannot be less than current usage (${coupon.current_usage_count})`);
      }
      updateData.max_usage_limit = updateData.max_usage_limit ? Number(updateData.max_usage_limit) : null;
    }

    // If promo code is being updated, check uniqueness
    if (updateData.promo_code !== undefined) {
      const newPromoCode = updateData.promo_code.trim().toUpperCase();

      // Check if promo code already exists (excluding current coupon)
      const existingCoupon = await Coupon.findOne({
        promo_code: newPromoCode,
        _id: { $ne: couponId },
        is_deleted: false,
      });

      if (existingCoupon) {
        return apiResponse.badRequest(res, "This promo code is already taken");
      }

      updateData.promo_code = newPromoCode;
    }

    const updatedCoupon = await Coupon.findByIdAndUpdate(
      couponId,
      { $set: updateData },
      { new: true }
    );

    return apiResponse.ok(res, updatedCoupon, "Coupon updated successfully");
  } catch (err) {
    console.error("Update coupon error:", err);
    return apiResponse.serverError(res, "Server error occurred", err.message);
  }
};



// Delete Coupon (Soft Delete)
const deleteCoupon = async (req, res) => {
  try {
    const vendor_id = req.vendor._id;

    const coupon = await Coupon.findOne({
      _id: req.params.id,
      vendor_id,
      is_deleted: false,
    });

    if (!coupon) {
      return apiResponse.notFoundResponse(res, "Coupon not found");
    }

    // Soft delete
    coupon.is_deleted = true;
    coupon.is_active = false;
    await coupon.save();

    return apiResponse.ok(res, coupon, "Coupon deleted successfully");
  } catch (err) {
    console.error("Delete coupon error:", err);
    return apiResponse.serverError(res, "Server error occurred", err.message);
  }
};

export default {
  createCoupon,
  getAllCoupons,
  getCouponById,
  updateCoupon,
  deleteCoupon,
};