import { Rating, Booking } from "../../model/index.js";
import apiResponse from "../../utility/apiResponse.js"
import messages from "../../utility/messages.js"

// Create Rating
const createRating = async (req, res) => {
    try {
        const userId = req.userId;

        const { booking_id, rating, review } = req.body;

        /* ================= VALIDATION ================= */

        if (!booking_id || !rating) {
            return apiResponse.badRequest(res, messages.BOOKINGID_RATING_REQ);
        }

        if (rating < 1 || rating > 5) {
            return apiResponse.badRequest(res, messages.RATING_LENGTH);
        }

        /* ================= CHECK BOOKING ================= */

        const booking = await Booking.findOne({
            _id: booking_id,
            user_id: userId,
            is_deleted: false
        });

        if (!booking) {
            return apiResponse.badRequest(res, messages.BOOKING_NOT_FOUND);
        }

        /* ================= CREATE RATING ================= */

        const newRating = await Rating.create({
            booking_id: booking._id,
            vendor_id: booking.vendor_id,
            user_id: userId,
            rating,
            review: review || ""
        });

        return apiResponse.ok(
            res,
            {
                rating_id: newRating._id,
                booking_id: newRating.booking_id,
                vendor_id: newRating.vendor_id,
                rating: newRating.rating,
                review: newRating.review
            },
            "Rating submitted successfully"
        );

    } catch (error) {

        // Handle duplicate rating error
        if (error.code === 11000) {
            return apiResponse.badRequest(res, "You have already rated this booking");
        }

        return apiResponse.serverError(
            res,
            "Server error",
            error.message
        );
    }
};

export default { createRating };
