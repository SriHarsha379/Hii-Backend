import mongoose from "mongoose";

const TicketSchema = new mongoose.Schema(
  {
    vendor_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
    },

    event_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
    },

    ticket_type: {
      type: String,
      required: true,
      enum: ["One Day Pass", "Multi Day Pass"],
      default: "One Day Pass"
    },

    title: { type: String, required: true, trim: true },

    ticket_price: { type: Number, required: true },
    total_tickets: { type: Number, required: true },
    sold_tickets: { type: Number, default: 0 },
    available_tickets: { type: Number, default: 0 },

    description: { type: String, trim: true },

    is_active: { type: Boolean, default: true },
    is_deleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Calculate available tickets before saving
TicketSchema.pre('save', function(next) {
  if (this.total_tickets && this.sold_tickets) {
    this.available_tickets = this.total_tickets - this.sold_tickets;
  }
  next();
});

const Ticket = mongoose.model("Ticket", TicketSchema);
export default Ticket;