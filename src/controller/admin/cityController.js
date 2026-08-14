import { City, State } from "../../model/index.js";
import apiResponse from "../../utility/apiResponse.js";
import messages from "../../utility/messages.js";
import moment from 'moment';

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

        return apiResponse.ok(res, city, messages.CITY_CREATED);
    } catch (err) {
        console.error(err);
        return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
    }
};


const getCity = async (req, res) => {
    try {
        const city = await City.find({ is_active: true, is_deleted: false })
            .populate({
                path: "state_id",
                select: "state_name",
            })
            .sort({ createdAt: -1 });

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

export default { createCity, getCity, updateCity, deleteCity }