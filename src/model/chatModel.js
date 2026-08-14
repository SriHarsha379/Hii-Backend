import mongoose from "mongoose";
import helper from "../utility/helper.js";
const ChatSchema = new mongoose.Schema(
  {
    conversation_id:{
     type: mongoose.Schema.Types.ObjectId,
          ref: "Conversation",
          default: null,
    },
    sender_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "sender_model", // 🔥 dynamic
      index: true,
    },

    sender_model: {
      type: String,
      required: true,
      enum: ["User", "Admin","Vendor"], // EXACT model names
    },

    receiver_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "receiver_model", // 🔥 dynamic
    },

    receiver_model: {
      type: String,
      required: true,
      enum: ["User", "Admin","Vendor"],
    },

    message: {
      type: String,
    },

    is_seen: {
      type: Boolean,
      default: false,
    },

    files: [{ type: String }], // file URLs

    type: {
      type: String,
      enum: ["message", "image", "video", "file", "audio", "post","pdf","location","event"],
      default: "message",
    },
    is_event:{
         type: Boolean,
      default: false,
    },
  approve_event:{
      type: Boolean,
      default: false,
  },
  reject_event:{
       type: Boolean,
      default: false,
  },
  event_object:{
    type:Object,
    default:""
  },

    delete_user_id: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "delete_user_model", // 🔥 dynamic
    },

    delete_user_model: {
      type: String,
      enum: ["User", "Admin"],
    },
  },
  { timestamps: true }
);
ChatSchema.post("find", function (docs) {
  docs.forEach(doc => {
    const { date, time } = helper.dataHelperchat(doc.createdAt);

    doc.set("date", date, { strict: false });
    doc.set("time", time, { strict: false });
  });
});

const Chat = mongoose.model("Chat", ChatSchema);
export default Chat;
