// models/Friendship.js
import mongoose from "mongoose";

const FriendshipSchema = new mongoose.Schema(
  {
    user_id_1: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    }, 
    user_id_2: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected', 'blocked'],
      default: 'pending'
    },
    initiated_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    }
  },
  { timestamps: true }
);

const Friendship = mongoose.model("Friendship", FriendshipSchema);
export default Friendship;