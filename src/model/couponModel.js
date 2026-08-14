/** @format */
// models/Coupon.js

import mongoose from "mongoose";

const CouponSchema = new mongoose.Schema(
  {
    vendor_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    promo_code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true
    },

    discount_percentage: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },

    expiry_date: {
      type: Date,
      required: true,
    },

    is_active: {
      type: Boolean,
      default: true,
    },

    is_deleted: {
      type: Boolean,
      default: false,
    },

    max_usage_limit: {
      type: Number,
      default: null,
    },

    current_usage_count: {
      type: Number,
      default: 0,
    },

    description: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

// Add indexes for better query performance
CouponSchema.index({ vendor_id: 1, is_deleted: 1, is_active: 1 });
CouponSchema.index({ expiry_date: 1 });

// Check if coupon is expired
CouponSchema.virtual('is_expired').get(function() {
  return new Date() > this.expiry_date;
});

const Coupon = mongoose.model("Coupon", CouponSchema);
export default Coupon;