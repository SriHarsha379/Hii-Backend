import mongoose from "mongoose";

const CitySchema = new mongoose.Schema(
    {
        state_id: { type: mongoose.Schema.Types.ObjectId, ref: "State", required: true },
        
        city_name: {
            type: String,
            required: true,
            trim: true
        },

        city_image: {
            type: String,
            default: null,
        },

        // 📍 City Location
        latitude: {
            type: Number,
            required: true,
        },

        longitude: {
            type: Number,
            required: true,
        },

        is_active: {
            type: Boolean,
            default: true
        },
        // Marks a city for the "Preferred Cities" shortlist shown at the
        // top of the city picker (e.g. Bangalore, Delhi, Goa, Mumbai) -
        // does NOT restrict which cities are available overall, it's
        // purely a display/priority flag.
        is_preferred: {
            type: Boolean,
            default: false
        },
        is_deleted: {
            type: Boolean,
            default: false
        },
    },
    { timestamps: true }
);

const City = mongoose.model("City", CitySchema);
export default City;