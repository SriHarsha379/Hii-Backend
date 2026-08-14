import mongoose from "mongoose";
import helper from "../utility/helper.js"

const AdSchema = new mongoose.Schema(
    {

        // ad_title: {
        //     type: String,
        // },
        ad_image: {
            type: String,
            required: true,
        },
        expiry_date: {
            type: Date, // ✅ new field
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

AdSchema.post("find", function (docs) {
    docs.forEach(doc => {
        doc.createdAt = helper.dataHelper(doc.createdAt);
    });
});

AdSchema.post("findOne", function (doc) {
    if (doc) {
        doc.createdAt = helper.dataHelper(doc.createdAt);
    }
});

const Ads = mongoose.model("Ads", AdSchema);
export default Ads;
