import mongoose from "mongoose";

const InterestSchema = new mongoose.Schema(
    {
        interest: {
            type: String,
            required: true,
            trim: true
        },
        is_active: {
            type: Boolean,
            default: true
        },
        is_deleted: {
            type: Boolean,
            default: false
        },
    },
    { timestamps: true }
);

const Interest = mongoose.model("Interest", InterestSchema);
export default Interest;

