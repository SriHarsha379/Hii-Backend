import mongoose from "mongoose";

const ReportProblemSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

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
