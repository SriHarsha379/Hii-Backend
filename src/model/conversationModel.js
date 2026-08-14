import mongoose from "mongoose";
import helper from "../utility/helper.js";
const conversationSchema = new mongoose.Schema(
  {
    sender_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "sender_model", // 🔥 dynamic
      index: true,
    },
  is_user:{
    type:Boolean,
    default:false
  },
    sender_model: {
      type: String,
      required: true,
      enum: ["User", "Admin", "Vendor"], // EXACT model names
    },

    receiver_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "receiver_model", // 🔥 dynamic
    },

    receiver_model: {
      type: String,
      required: true,
      enum: ["User", "Admin", "Vendor"],
    },

    last_message: {
      type: String,
    },
    message_type: {
      type: String,
    },
  },
  { timestamps: true },
);

conversationSchema.virtual("date").get(function () {
  if (!this.createdAt) return "";
  const { date } = helper.dataHelperchat(this.createdAt);
  return date;
});

conversationSchema.virtual("time").get(function () {
  if (!this.createdAt) return "";
  const { time } = helper.dataHelperchat(this.createdAt);
  return time;
});
let Conversation = mongoose.model("Conversation", conversationSchema);

export default Conversation;
