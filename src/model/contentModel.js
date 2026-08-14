

import mongoose from "mongoose";

const ContentSchema = new mongoose.Schema(
  {
    content_type: {
      type: Number,
      enum: [0, 1, 2, 3, 4, 5, 6, 7], // 0: "about_us", 1: "privacy_policy",2: "terms_condition", 3: "rate_app_ios", 4: "rate_app_android", 5: "share_message",  6: "terms_condition_insurance" , 7: "Support Email"
      required: true,
      default: 0,
    },

    content: {
      type: String,
      trim: true,
      default: null,
    },

    delete_flag: {
      type: Number,
      enum: [0, 1], // 0 for no, 1 for yes
      default: 0,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);


const Content = mongoose.model("Content", ContentSchema);
export default Content;