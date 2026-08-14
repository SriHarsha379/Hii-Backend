import mongoose from "mongoose";

const VibeSchema = new mongoose.Schema(
    {
        vibe: { type: String, required: true, trim: true },
        description: { type: String, required: true, trim: true },
        image: { type: String, required: true },
        is_active: { type: Boolean, default: true },
        is_deleted: { type: Boolean, default: false }
    },
    { timestamps: true }
);

const Vibe = mongoose.model("Vibe", VibeSchema);
export default Vibe;