/** @format */
// controllers/admin/offerController.js

import { Offer } from "../../model/index.js";
import apiResponse from "../../utility/apiResponse.js";
import messages from "../../utility/messages.js";

// Create Offer
const createOffer = async (req, res) => {
  try {
    const vendor_id = req.vendor._id;
    const { title, description, discount_percentage, cover_charge, valid_until } = req.body;

    // Validation
    if (!title || !discount_percentage || !cover_charge) {
      return apiResponse.badRequestResponse(res, "Title, discount percentage and cover charge are required");
    }

    if (discount_percentage < 0 || discount_percentage > 100) {
      return apiResponse.badRequestResponse(res, "Discount percentage must be between 0 and 100");
    }

    if (cover_charge < 0) {
      return apiResponse.badRequestResponse(res, "Cover charge cannot be negative");
    }

    // Check if offer with same title exists for this vendor
    const existingOffer = await Offer.findOne({
      vendor_id,
      title: title.trim(),
      is_deleted: false,
    });

    if (existingOffer) {
      return apiResponse.badRequest(res, "An offer with this title already exists");
    }

    // Create new offer
    const offer = new Offer({
      vendor_id,
      title: title.trim(),
      description: description || "",
      discount_percentage: Number(discount_percentage),
      cover_charge: Number(cover_charge),
      valid_until: valid_until ? new Date(valid_until) : null,
    });

    await offer.save();
    
    return apiResponse.created(res, offer, "Offer created successfully");
  } catch (err) {
    console.error("Create offer error:", err);
    return apiResponse.serverError(res, "Server error occurred", err.message);
  }
};

// Get All Offers
const getAllOffers = async (req, res) => {
  try {
    const vendor_id = req.vendor._id;

    const offers = await Offer.find({
      vendor_id,
      is_deleted: false,
    }).sort({ createdAt: -1 });

    return apiResponse.ok(res, offers, "Success");
  } catch (err) {
    console.error("Get offers error:", err);
    return apiResponse.serverError(res, "Server error occurred", err.message);
  }
};

// Get Offer By ID
const getOfferById = async (req, res) => {
  try {
    const vendor_id = req.vendor._id;

    const offer = await Offer.findOne({
      _id: req.params.id,
      vendor_id,
      is_deleted: false,
    });

    if (!offer) {
      return apiResponse.notFoundResponse(res, "Offer not found");
    }

    return apiResponse.ok(res, offer, "Success");
  } catch (err) {
    console.error("Get offer by ID error:", err);
    return apiResponse.serverError(res, "Server error occurred", err.message);
  }
};

// Update Offer
const updateOffer = async (req, res) => {
  try {
    const vendor_id = req.vendor._id;
    const offerId = req.params.id;

    // Check if offer exists and belongs to vendor
    const offer = await Offer.findOne({
      _id: offerId,
      vendor_id,
      is_deleted: false,
    });

    if (!offer) {
      return apiResponse.notFoundResponse(res, "Offer not found");
    }

    const updateData = { ...req.body };
    
    // Validate discount percentage if provided
    if (updateData.discount_percentage !== undefined) {
      if (updateData.discount_percentage < 0 || updateData.discount_percentage > 100) {
        return apiResponse.badRequestResponse(res, "Discount percentage must be between 0 and 100");
      }
      updateData.discount_percentage = Number(updateData.discount_percentage);
    }

    // Validate cover charge if provided
    if (updateData.cover_charge !== undefined) {
      if (updateData.cover_charge < 0) {
        return apiResponse.badRequestResponse(res, "Cover charge cannot be negative");
      }
      updateData.cover_charge = Number(updateData.cover_charge);
    }

    const updatedOffer = await Offer.findByIdAndUpdate(
      offerId,
      { $set: updateData },
      { new: true }
    );

    return apiResponse.ok(res, updatedOffer, "Offer updated successfully");
  } catch (err) {
    console.error("Update offer error:", err);
    return apiResponse.serverError(res, "Server error occurred", err.message);
  }
};

// Delete Offer (Soft Delete)
const deleteOffer = async (req, res) => {
  try {
    const vendor_id = req.vendor._id;

    const offer = await Offer.findOne({
      _id: req.params.id,
      vendor_id,
      is_deleted: false,
    });

    if (!offer) {
      return apiResponse.notFoundResponse(res, "Offer not found");
    }

    // Soft delete
    offer.is_deleted = true;
    offer.is_active = false;
    await offer.save();

    return apiResponse.ok(res, offer, "Offer deleted successfully");
  } catch (err) {
    console.error("Delete offer error:", err);
    return apiResponse.serverError(res, "Server error occurred", err.message);
  }
};

export default {
  createOffer,
  getAllOffers,
  getOfferById,
  updateOffer,
  deleteOffer,
};