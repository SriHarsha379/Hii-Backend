import mongoose from "mongoose";
import helper from "../utility/helper.js";

const NotificationSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false, },
    other_user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, },
    vendor_user_id: { type: mongoose.Schema.Types.ObjectId, ref: "Vendor", default: null, },
    action: { type: String, default: null, },
    action_id: { type: String, default: null, },
    action_json: { type: mongoose.Schema.Types.Mixed, default: {}, },
    title: { type: String, required: false, },
    icon: { type: String, default: null },
    message: { type: String, required: false, },
    read_status: {
      type: Number, default: 0, // 0 = unread, 1 = read
    },
    is_deleted: {
      type: Number, default: 0, // 0 = active, 1 = deleted
    },
  }, { timestamps: true });

NotificationSchema.post("find", function (docs) {
  docs.forEach(doc => {
    doc.createdAt = helper.dataHelper(doc.createdAt);
  });
});

NotificationSchema.post("findOne", function (doc) {
  if (doc) {
    doc.createdAt = helper.dataHelper(doc.createdAt);
  }
});

const Notification = mongoose.model("Notification", NotificationSchema);

export default Notification;