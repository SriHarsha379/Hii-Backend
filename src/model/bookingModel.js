import mongoose from "mongoose";
import helper from "../utility/helper.js";

const BookingSchema = new mongoose.Schema(
  {
    /* ================= COMMON ================= */

    vendor_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
      index: true
    },

    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },

    booking_type: {
      type: String,
      enum: ["event", "venue"],
      default: "venue",
      required: true,
      index: true
    },

    /* ================= EVENT BOOKING ================= */

    event_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      default: null
    },

    ticket_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ticket",
      default: null
    },

    event_tickets: {
      type: [
        {
          ticket_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Ticket",
            required: true
          },
          title: String,
          isOneDay: Boolean,
          quantity: Number,
          base_price: Number,
          total_price: Number
        }
      ],
      default: []
    },


    quantity: {
      type: Number,
      default: 1
    },

    /* ================= VENUE BOOKING ================= */

    venue_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Venue",
      default: null,
      index: true
    },

    booking_date: {
      type: Date,
      default: null
    },

    slot_time: {
      type: Date,
      default: null
    },

    number_of_guests: {
      type: Number,
      default: 1
    },

    is_cover: {
      type: Boolean,
      default: false
    },

    cover_charge_percentage: {
      type: Number,
      default: 0
    },

    cover_charge: {
      type: Number,
      default: 0
    },

    special_request: {
      type: String,
      default: ""
    },

    city_name: {
      type: String,
      default: ""
    },

    /* ================= PAYMENT ================= */

    sub_total: {
      type: Number,
      required: true
    },

    discount: {
      type: Number,
      default: 0
    },

    discount_percent: {
      type: Number,
      default: 0
    },
    tax_amount: {
      type: Number,
      default: 0
    },

    // ✅ NEW FIELD
    gst_percentage: {
      type: Number,
      default: 0
    },

    // ✅ NEW FIELD
    gst_amount: {
      type: Number,
      default: 0
    },

    admin_earning: {
      type: Number,
      default: 0
    },
    admin_earning_percentage: {
      type: Number,
      default: 0
    },

    total: {
      type: Number,
      required: true
    },

    transaction_id: {
      type: String,
      required: true,
      index: true
    },

    payment_status: {
      type: String,
      enum: ["pending", "success", "failed"],
      default: "success"
    },

    /* ================= CONTACT INFO (UNCHANGED FORMAT) ================= */

    contact_info: {
      country_code: { type: String, required: true },
      phone_number: { type: String, required: true },
      email: { type: String, required: true },
      full_name: { type: String, required: true }
    },

    /* ================= STATUS ================= */

    booking_status: {
      type: String,
      enum: ["confirmed", "cancelled", "completed"],
      default: "confirmed"
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


BookingSchema.post("find", function (docs) {
  docs.forEach(doc => {
    doc.createdAt = helper.dataHelper(doc.createdAt);
  });
});

BookingSchema.post("findOne", function (doc) {
  if (doc) {
    doc.createdAt = helper.dataHelper(doc.createdAt);
  }
});

const Booking = mongoose.model("Booking", BookingSchema);
export default Booking; 
