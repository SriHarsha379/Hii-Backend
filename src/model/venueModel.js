import mongoose from "mongoose";
import helper from "../utility/helper.js"

const VenueSchema = new mongoose.Schema(
  {
    vendor_id: { type: mongoose.Schema.Types.ObjectId, ref: "Vendor", required: true },

    venue_name: { type: String, required: true, trim: true },
    venue_image: { type: String, required: true },

    city_id: { type: mongoose.Schema.Types.ObjectId, ref: "City" },

    category_ids: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true }
    ],

    // Open days field - array of strings for days of week
    open_days: [{
      type: String,
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      required: true
    }],

    start_time: { type: String, required: true },
    end_time: { type: String, required: true },

    address: { type: String, required: true },

    // latitude and longitude
    latitude: { type: Number },
    longitude: { type: Number },

    about: { type: String, required: true },
    gallery_images: [{ type: String }],

    // Remove open_hours (commented out)
    // open_hours: [{ type: Number }],

    // Add new fields
    table_reservation_fee: {
      type: Number,
      default: 0,
      min: 0
    },

    reservation_fee: {
      type: Number,
      default: 0,
      min: 0
    },

    tax_percentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },

    bill_discount_percentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },

    // Terms & Conditions
    // terms_and_conditions: {
    //   type: String,
    //   default: ''
    // },

    terms_and_conditions: [{
      item: { type: String }
    }],

    // Frequently Asked Questions
    faqs: [{
      question: { type: String, required: true },
      answer: { type: String, required: true }
    }],

    // Prohibited Items
    prohibited_items: [{
      item: { type: String }
    }],

    is_active: { type: Boolean, default: true },
    is_deleted: { type: Boolean, default: false },

    // Featured Clubs/Venues — mirrors the Event model's featured pattern.
    // featured_city is optional — null means featured everywhere, a city
    // name scopes it to just that city's feed.
    is_featured: { type: Boolean, default: false },
    featured_until: { type: Date, default: null },
    featured_city: { type: String, default: null },
  },
  { timestamps: true }
);

VenueSchema.post("find", function (docs) {
  docs.forEach(doc => {
    doc.createdAt = helper.dataHelper(doc.createdAt);
  });
});

VenueSchema.post("findOne", function (doc) {
  if (doc) {
    doc.createdAt = helper.dataHelper(doc.createdAt);
  }
});

const Venue = mongoose.models.Venue || mongoose.model("Venue", VenueSchema);
export default Venue;