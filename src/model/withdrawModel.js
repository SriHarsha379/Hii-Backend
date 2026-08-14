import mongoose from "mongoose";

const WithdrawSchema = new mongoose.Schema(
  {
    vendor_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      required: true
    },

    amount: {
      type: Number,
      required: true
    },

    description: {
      type: String,
      default: ""
    },

    transaction_id: {
      type: String,
      default: ""
    },

    reject_reason: {
      type: String,
      default: ""
    },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending"
    },

    // Bank details snapshot at time of withdrawal
    bank: {
      account_holder_name: String,
      bank_name: String,
      account_number: String,
      ifsc_code: String,
      account_type: {
        type: String,
        enum: ["savings", "current"]
      }
    }
  },
  { timestamps: true }
);

const WithdrawRequest = mongoose.model("WithdrawRequest", WithdrawSchema);

export default WithdrawRequest;