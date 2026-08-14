import mongoose from "mongoose";
import helper from "../utility/helper.js"

const EventSchema = new mongoose.Schema(
  {
    vendor_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      required: true
    },

    venue_name: { type: String, required: true, trim: true },
    venue_image: { type: String, required: true },

    city_id: { type: mongoose.Schema.Types.ObjectId, ref: "City" },

    category_ids: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true }
    ],

    start_time: { type: String, required: true },
    end_time: { type: String, required: true },
    address: { type: String, required: true },

    latitude: { type: Number },
    longitude: { type: Number },

    start_date: { type: String, required: true },
    end_date: { type: String, required: true },
    is_multi_day: { type: Boolean, default: false },
    about: { type: String, required: true },

    gallery_images: [{ type: String, required: true }],

    /* ================= ARTISTS (MULTIPLE) ================= */
    artists: [
      {
        name: { type: String, required: true },
        title: { type: String },        // DJ / Singer
        subtitle: { type: String },     // Bollywood / Techno
        image: { type: String }
      }
    ],

    is_active: { type: Boolean, default: true },
    is_deleted: { type: Boolean, default: false },

    // New fields for additional event information

    // Event Layout Images
    event_layout_images: [{
      image_url: {
        type: String,
        required: true
      }
    }],

    // Terms & Conditions
    // terms_and_conditions: {
    //   type: String,
    //   default: ''
    // },

    // Terms & Conditions
    terms_and_conditions: [{
      item: { type: String, default: '' }
    }],

    // Frequently Asked Questions
    faqs: [{
      question: {
        type: String,
        required: true
      },
      answer: {
        type: String,
        required: true
      }
    }],

    // Prohibited Items
    prohibited_items: [{
      item: {
        type: String,
      }
    }],

  },
  { timestamps: true }
);

EventSchema.post("find", function (docs) {
  docs.forEach(doc => {
    doc.createdAt = helper.dataHelper(doc.createdAt);
  });
});

EventSchema.post("findOne", function (doc) {
  if (doc) {
    doc.createdAt = helper.dataHelper(doc.createdAt);
  }
});

const Event = mongoose.model("Event", EventSchema);


export default Event;