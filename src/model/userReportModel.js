import mongoose from "mongoose";

const UserReportSchema = new mongoose.Schema(
    {
        reported_by: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },

        reported_user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },

        reason: {
            type: String,
        },

        description: {
            type: String
        },

        status: {
            type: String,
            enum: ["Pending", "Reviewed", "Resolved", "Rejected"],
            default: "Pending",
            index: true
        },

        admin_note: {
            type: String
        },

        action_taken: {
            type: String,
            enum: ["None", "Warning", "Blocked", "Suspended"],
            default: "None"
        }
    },
    { timestamps: true }
);

export default mongoose.model("UserReport", UserReportSchema);