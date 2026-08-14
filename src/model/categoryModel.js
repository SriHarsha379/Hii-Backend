import mongoose from "mongoose";
import helper from "../utility/helper.js"

const CategorySchema = new mongoose.Schema(
  {

    category_name: {
      type: String,
      required: true,
      trim: true
    },
    category_type: {
      type: Number,
      required: true,
      enum: [1, 2], // 1: Event, 2: Venue
    },
    is_active: {
      type: Boolean,
      default: true
    },
    is_deleted: {
      type: Boolean,
      default: false
    },
  },
  {
    timestamps: true
  }
);

// Add compound index to prevent duplicate categories for same vendor
CategorySchema.index(
  {
    vendor_id: 1,
    category_name: 1,
    category_type: 1,
    is_deleted: 1
  },
  {
    unique: true,
    partialFilterExpression: { is_deleted: false }
  }
);


CategorySchema.post("find", function (docs) {
  docs.forEach(doc => {
    doc.createdAt = helper.dataHelper(doc.createdAt);
  });
});

CategorySchema.post("findOne", function (doc) {
  if (doc) {
    doc.createdAt = helper.dataHelper(doc.createdAt);
  }
});

const Category = mongoose.model("Category", CategorySchema);
export default Category;
