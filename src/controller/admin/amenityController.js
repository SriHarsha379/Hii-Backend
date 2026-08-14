/** @format */

// controllers/amenityController.js

import {Amenity} from "../../model/index.js";
import apiResponse from "../../utility/apiResponse.js";
import messages from "../../utility/messages.js";

// ✅ Create Amenity
const createAmenity = async (req, res) => {
  try {
    const { amenity_name } = req.body;
    const amenity_icon = req.file ? req.file.filename : null;

    if (!amenity_name || !amenity_icon) {
      return apiResponse.badRequest(res, messages.ALL_FIELDS_REQUIRED);
    }

    const newAmenity = await Amenity.create({ amenity_name, amenity_icon });

    return apiResponse.created(res, newAmenity, messages.AMENITY_CREATED);
  } catch (error) {
    console.error("Create Amenity Error:", error);
    return apiResponse.serverError(res, messages.SERVER_ERROR, error.message);
  }
};

// ✅ Get All Amenities
const getAllAmenities = async (req, res) => {
  try {
    const amenities = await Amenity.find({ is_deleted: false }).sort({
      createdAt: -1,
    });

    return apiResponse.ok(res, amenities, messages.SUCCESS);
  } catch (error) {
    console.error("Get All Amenities Error:", error);
    return apiResponse.serverError(res, messages.SERVER_ERROR, error.message);
  }
};

// ✅ Get Amenity by ID
const getAmenityById = async (req, res) => {
  try {
    const { id } = req.params;
    const amenity = await Amenity.findById(id);

    if (!amenity || amenity.is_deleted) {
      return apiResponse.notFoundResponse(res, messages.AMENITY_NOT_FOUND);
    }

    return apiResponse.ok(res, amenity, messages.SUCCESS);
  } catch (error) {
    console.error("Get Amenity By ID Error:", error);
    return apiResponse.serverError(res, messages.SERVER_ERROR, error.message);
  }
};

// ✅ Update Amenity
const updateAmenity = async (req, res) => {
  try {
    const { id } = req.params;
    const { amenity_name, is_active } = req.body;
    const amenity_icon = req.file ? req.file.filename : undefined;

    const updateData = {
      amenity_name,
      is_active,
      ...(amenity_icon && { amenity_icon }),
    };

    const updatedAmenity = await Amenity.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!updatedAmenity) {
      return apiResponse.notFoundResponse(res, messages.AMENITY_NOT_FOUND);
    }

    return apiResponse.ok(res, updatedAmenity, messages.AMENITY_UPDATED);
  } catch (error) {
    console.error("Update Amenity Error:", error);
    return apiResponse.serverError(res, messages.SERVER_ERROR, error.message);
  }
};

// ✅ Soft Delete Amenity
const deleteAmenity = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedAmenity = await Amenity.findByIdAndUpdate(
      id,
      { is_deleted: true },
      { new: true }
    );

    if (!deletedAmenity) {
      return apiResponse.notFoundResponse(res, messages.AMENITY_NOT_FOUND);
    }

    return apiResponse.ok(res, deletedAmenity, messages.AMENITY_DELETED);
  } catch (error) {
    console.error("Delete Amenity Error:", error);
    return apiResponse.serverError(res, messages.SERVER_ERROR, error.message);
  }
};

export default {
  createAmenity,
  getAllAmenities,
  getAmenityById,
  updateAmenity,
  deleteAmenity,
};
