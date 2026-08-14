import mongoose from "mongoose";

const VibeCheckSchema = new mongoose.Schema(
    {
        question: {
            type: String,
            required: true,
            trim: true
        },
        answer: {
            type: String,
            required: true,
            trim: true
        },
        is_active: {
            type: Boolean,
            default: true
        }
    },
    { timestamps: true }
);

const VibeCheck = mongoose.model("VibeCheck", VibeCheckSchema);
export default VibeCheck;