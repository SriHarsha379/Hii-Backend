
import mongoose from "mongoose";

const AmenitySchema = new mongoose.Schema(
    {
        amenity_name: { type: String, required: true, trim: true },
        amenity_icon: { type: String, required: true },
        is_active: { type: Boolean, default: true },
        is_deleted: { type: Boolean, default: false }
    },
    { timestamps: true }
);

const Amenity = mongoose.model("Amenity", AmenitySchema);
export default Amenity;
