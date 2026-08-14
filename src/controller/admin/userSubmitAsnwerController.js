import { UserSubmitAnswer } from "../../model/index.js";
import apiResponse from "../../utility/apiResponse.js";
import messages from "../../utility/messages.js";

// ✅ Get answers by Booking ID
const getAnswersByBookingId = async (req, res) => {
    try {
        const { bookingId } = req.params;

        const answers = await UserSubmitAnswer.findOne({ booking_id: bookingId })
           

        if (!answers) {
            return apiResponse.notFoundResponse(res, messages.ANSWER_NOT_FOUND );
        }

        const result = {
            _id: answers._id,
            answers: answers.answers, // array of Q & A
            is_active: answers.is_active,
            createdAt: answers.createdAt,
            updatedAt: answers.updatedAt
        };

        return apiResponse.ok(res, result, messages.ANswer_FETCHED);
    } catch (error) {
        console.error(error);
        return apiResponse.serverError(res, messages.SERVER_ERROR, error.message);
    }
};

export default { getAnswersByBookingId };
