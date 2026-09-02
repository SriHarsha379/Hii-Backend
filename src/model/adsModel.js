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
        ad_video: {
            type: String,
            default: null,
        },
        video_width: {
            type: Number,
            default: null,
        },
        video_height: {
            type: Number,
            default: null,
        },
        link_url: {
            type: String,
            default: null,
        },
        expiry_date: {
            type: Date, // ✅ new field
        },
        is_deleted: {
            type: Boolean,
            default: false
        },

        // Ad analytics — was completely untracked: ads were injected into
        // feeds but nothing recorded how often they were shown or tapped.
        impressions_count: {
            type: Number,
            default: 0,
        },
        clicks_count: {
            type: Number,
            default: 0,
        },
        last_impression_at: {
            type: Date,
            default: null,
        },
        last_click_at: {
            type: Date,
            default: null,
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