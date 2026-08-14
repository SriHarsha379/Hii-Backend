import mongoose from "mongoose";

const faqSchema = new mongoose.Schema(
    {
        question: {
            type: String,
            required: true,
            trim: true
        },
        answer: {
            type: String,
            trim: true
        },
        target: {
            type: String,
            enum: ["FOR_ALL", "FOR_VENDOR", "FOR_USER"],
            default: "FOR_ALL"
        },
        is_deleted: {
            type: Boolean,
            default: false
        },
        is_active: {
            type: Boolean,
            default: true
        }
    },
    { timestamps: true }
);

const Faq = mongoose.model("Faq", faqSchema);
export default Faq;