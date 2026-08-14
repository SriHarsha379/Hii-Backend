import mongoose from "mongoose";

const VibeCheckQuestionSchema = new mongoose.Schema(
  {
    question: {
      type: String,
      required: true,
      trim: true
    },

    description: {
      type: String,
      default: null
    },

    // Optional sample answer shown under the input field to give users a
    // sense of what a good response looks like. Falls back to a generic
    // example in the app if left blank.
    example_answer: {
      type: String,
      default: null
    },

    order: {
      type: Number,
      default: 0
    },

    is_active: {
      type: Boolean,
      default: true
    },

    is_deleted: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

export default mongoose.model("VibeCheckQuestion", VibeCheckQuestionSchema);