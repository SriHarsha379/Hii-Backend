import mongoose from "mongoose";

const StateSchema = new mongoose.Schema(
    {
        state_name: {
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

const State = mongoose.model("State", StateSchema);
export default State;

