import mongoose from "mongoose";

const RatingSchema = new mongoose.Schema(
  {
    booking_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
      index: true
    },

    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },

    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },

    review: {
      type: String,
      default: "",
      trim: true,
      maxlength: 1000
    }
  },
  { timestamps: true }
);


const Rating = mongoose.model("Rating", RatingSchema);
export default Rating;