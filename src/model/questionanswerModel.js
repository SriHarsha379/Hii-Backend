//4  QuestionAnswerSchema 
import mongoose from "mongoose";

const QuestionAnswerSchema = new mongoose.Schema(
    {
        service_id: { type: mongoose.Schema.Types.ObjectId, ref: "Service", required: true },
        question: { type: String, required: true },
        options: [{ type: String, required: true }],
        is_active: { type: Boolean, default: true }
    },
    { timestamps: true }
);


const QuestionAnswer = mongoose.model("QuestionAnswer", QuestionAnswerSchema);
export default QuestionAnswer;
