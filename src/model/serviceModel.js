import mongoose from 'mongoose';

const serviceSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, default: null },
    session_count: { type: Number, default: 0 },
    fees: { type: Number, default: 0 },
    image: { type: String, default: null },
    is_active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Service = mongoose.model('Service', serviceSchema);

export default Service;
