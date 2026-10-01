import mongoose from "mongoose";

const ReportProblemSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null // members only (clubs / organisers use admin_id)
    },

    // who sent it: app member, club admin or event organiser (dashboard)
    source: {
      type: String,
      enum: ["member", "club", "organiser"],
      default: "member",
      index: true
    },
    category: { type: String, default: "Other", index: true },
    admin_id: { type: mongoose.Schema.Types.ObjectId, ref: "Admin", default: null },
    vendor_id: { type: mongoose.Schema.Types.ObjectId, ref: "Vendor", default: null },

    description: {
      type: String,
      required: true,
      trim: true
    },

    attachments: [
      {
        file: {
          type: String,
          required: true
        },
        type: {
          type: String,
          enum: ["Image", "Video"],
          required: true
        },
        thumbnail: {
          type: String,
          default: null
        }
      }
    ],

    status: {
      type: String,
      enum: ["Pending", "Inprogress", "Resolve", "Closed"],
      default: "Pending"
    },

    admin_reply: {
      type: String,
      default: ""
    }
  },
  { timestamps: true }
);

const ReportProblem = mongoose.model(
  "ReportProblem",
  ReportProblemSchema
);

export default ReportProblem;
