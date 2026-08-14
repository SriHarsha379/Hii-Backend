/** @format */
// models/Offer.js

import mongoose from "mongoose";

const OfferSchema = new mongoose.Schema(
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

    description: {
      type: String,
      trim: true,
    },

    discount_percentage: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },

    cover_charge: {
      type: Number,
      required: true,
      min: 0,
    },

    is_active: {
      type: Boolean,
      default: true,
    },

    is_deleted: {
      type: Boolean,
      default: false,
    },

    valid_from: {
      type: Date,
      default: Date.now,
    },

    valid_until: {
      type: Date,
    },
  },
  { timestamps: true }
);

// Add index for better query performance
OfferSchema.index({ vendor_id: 1, is_deleted: 1, is_active: 1 });

const Offer = mongoose.model("Offer", OfferSchema);
export default Offer;