// models/UserBlockModel.js

import mongoose from "mongoose";

const UserBlockSchema = new mongoose.Schema(
    {
        blocked_by: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },

        blocked_user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },

        reason: {
            type: String,
            default: null
        },

        is_blocked: {
            type: Boolean,
            default: true
        }

    },
    { timestamps: true }
);

/* ================= UNIQUE BLOCK ================= */
// Prevent duplicate block entries
UserBlockSchema.index(
    { blocked_by: 1, blocked_user: 1 },
    { unique: true }
);

const UserBlock = mongoose.model("UserBlock", UserBlockSchema);

export default UserBlock;
