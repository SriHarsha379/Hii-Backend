// models/EarningModel.js
import mongoose from "mongoose";

const EarningSchema = new mongoose.Schema(
  {
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
    },
    booking_id: {
      type: String,
      required: true,
    },
    event_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
    },
    venue_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Venue",
    },
    event_details: {
      title: String,
      venue_name: String
    },
    venue_details: {
      venue_name: String,
      address: String
    },
    transaction_id: {
      type: String,
      required: true,
    },
    booking_type: {
      type: String,
      enum: ["event", "venue"],
      required: true,
    },
    total_amount: {
      type: Number,
      required: true,
    },
    admin_commission_percent: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    admin_earning: {
      type: Number,
      required: true,
    },
    vendor_earning: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "completed", "cancelled", "refunded"],
      default: "completed",
    },
    commission_setting_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CommissionSetting",
    },
    is_active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Indexes for better performance
EarningSchema.index({ vendor: 1, createdAt: -1 });
EarningSchema.index({ booking_type: 1 });
EarningSchema.index({ transaction_id: 1 });
EarningSchema.index({ createdAt: -1 });
EarningSchema.index({ "event_details.title": "text", "venue_details.venue_name": "text" });

export default mongoose.model("Earning", EarningSchema);