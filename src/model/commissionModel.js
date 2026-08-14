import mongoose from "mongoose";
import helper from "../utility/helper.js"

const CommissionSchema = new mongoose.Schema(
  {
    commission_percentage: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      default: 10
    }
  },
  { timestamps: true }
);

CommissionSchema.post("find", function (docs) {
  docs.forEach(doc => {
    doc.createdAt = helper.dataHelper(doc.createdAt);
  });
});

CommissionSchema.post("findOne", function (doc) {
  if (doc) {
    doc.createdAt = helper.dataHelper(doc.createdAt);
  }
});

const Commission = mongoose.model("Commission", CommissionSchema);
export default Commission;