
//5  UserSubmitAnswer;
import mongoose from "mongoose";

const UserSubmitAnswerSchema = new mongoose.Schema(
    {
        booking_id: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", required: true },
        user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        service_id: { type: mongoose.Schema.Types.ObjectId, ref: "Service", required: true },
        answers: [
            {
                question: { type: String, required: true },
                answer: { type: String, required: true }
            }
        ],
        is_active: { type: Boolean, default: true }
    },
    { timestamps: true }
);

const UserSubmitAnswer = mongoose.model("UserSubmitAnswer", UserSubmitAnswerSchema);
export default UserSubmitAnswer;


