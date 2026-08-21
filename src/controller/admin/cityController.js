import { City, State } from "../../model/index.js";
import apiResponse from "../../utility/apiResponse.js";
import messages from "../../utility/messages.js";
import moment from 'moment';
import logActivity from "../../utility/activityLogger.js";

const createCity = async (req, res) => {
    try {
        const { city_name, state_id, latitude, longitude } = req.body;

        const city_image = req.file ? req.file.filename : null;

        // ================= CHECK STATE =================
        const existState = await State.findById(state_id);
        if (!existState) {
            return apiResponse.notFoundResponse(res, messages.STATE_NOT_FOUND);
        }

        // ================= CHECK CITY =================
        const existCity = await City.findOne({
            city_name: city_name.trim(),
            state_id,
            is_deleted: false
        });

        if (existCity) {
            return apiResponse.badRequest(res, messages.CITY_ALREADY);
        }

        // ================= CREATE CITY =================
        const city = new City({
            city_name: city_name.trim(),
            state_id,
            city_image,
            latitude: Number(latitude),
            longitude: Number(longitude)
        });

        await city.save();

        await logActivity(req, { action: "CREATE", resource: "City", resource_id: city._id, details: `Created city "${city.city_name}"` });

        return apiResponse.ok(res, city, messages.CITY_CREATED);
    } catch (err) {
        console.error(err);
        return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
    }
};


// GET /city/get_all_cities
// Default: only active cities (used by every filter dropdown across the
// app — Featured Events, Events, Venues, etc. — so admins control exactly
// which cities are selectable there via the Manage Filters > Cities tab).
// ?include_inactive=true: returns every non-deleted city regardless of
// active status — used only by the Users page filter and the Manage
// Filters city management view itself, since a user can be registered
// from any city even if that city isn't currently "active" for curated
// filtering purposes.
// Always sorted alphabetically by city name (not creation order).
const getCity = async (req, res) => {
    try {
        const filter = req.query.include_inactive === 'true'
            ? { is_deleted: false }
            : { is_active: true, is_deleted: false };

        const city = await City.find(filter)
            .populate({
                path: "state_id",
                select: "state_name",
            })
            .collation({ locale: "en", strength: 2 }) // case-insensitive alphabetical sort
            .sort({ city_name: 1 });

        return apiResponse.ok(res, city, messages.SUCCESS);
    } catch (err) {
        console.log(err.message);
        return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
    }
};

const updateCity = async (req, res) => {
    try {
        const { id } = req.params;
        const { city_name, state_id, latitude, longitude } = req.body;

        const city_image = req.file ? req.file.filename : undefined;

        const city = await City.findOne({ _id: id, is_deleted: false });
        if (!city) {
            return apiResponse.notFoundResponse(res, messages.CITY_NOT_FOUND);
        }

        if (state_id) {
            const existState = await State.findById(state_id);
            if (!existState) {
                return apiResponse.notFoundResponse(res, messages.STATE_NOT_FOUND);
            }
        }

        // 🔥 Proper trim validation
        let updatedName = city.city_name;

        if (city_name !== undefined) {
            const trimmedName = city_name.trim();

            if (!trimmedName) {
                return apiResponse.badRequest(res, "City name cannot be empty");
            }

            updatedName = trimmedName;
        }

        const updatedState = state_id ? state_id : city.state_id;

        const existCity = await City.findOne({
            city_name: updatedName,
            state_id: updatedState,
            _id: { $ne: id },
            is_deleted: false
        });

        if (existCity) {
            return apiResponse.badRequest(res, messages.CITY_ALREADY);
        }

        const updateData = {
            city_name: updatedName,
            state_id: updatedState,
        };

        if (latitude) updateData.latitude = latitude;
        if (longitude) updateData.longitude = longitude;
        if (city_image !== undefined) updateData.city_image = city_image;

        const updatedCity = await City.findByIdAndUpdate(
            id,
            { $set: updateData },
            { new: true }
        );

        return apiResponse.ok(res, updatedCity, messages.CITY_UPDATED);

    } catch (err) {
        console.error(err);
        return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
    }
};

const deleteCity = async (req, res) => {
    try {
        const { id } = req.params;

        const city = await City.findByIdAndUpdate(
            id,
            {
                is_deleted: true,
                is_active: false
            },
            { new: true } // return updated doc
        );

        if (!city) {
            return apiResponse.notFoundResponse(res, messages.CITY_NOT_FOUND);
        }

        return apiResponse.ok(res, city, messages.CITY_DELETED_SUCCESSFULLY);

    } catch (err) {
        console.error(err);
        return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
    }
};

// POST /city/toggle_status/:id
// Genuine activate/deactivate — unlike deleteCity (which also sets
// is_deleted:true), this just flips is_active so the city stays in the
// system and can be reactivated later. This is what "only Bangalore,
// Delhi, Goa & Mumbai should be active for filters" should use, rather
// than deleting the other cities outright.
const toggleCityStatus = async (req, res) => {
    try {
        const { id } = req.params;

        const city = await City.findOne({ _id: id, is_deleted: false });
        if (!city) {
            return apiResponse.notFoundResponse(res, messages.CITY_NOT_FOUND);
        }

        city.is_active = !city.is_active;
        await city.save();

        await logActivity(req, {
            action: "UPDATE",
            resource: "City",
            resource_id: city._id,
            details: `${city.is_active ? "Activated" : "Deactivated"} city "${city.city_name}"`,
        });

        return apiResponse.ok(res, city, messages.SUCCESS);
    } catch (err) {
        console.error(err);
        return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
    }
};

export default { createCity, getCity, updateCity, deleteCity, toggleCityStatus }