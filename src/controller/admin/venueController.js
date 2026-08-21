import { Venue, Category } from "../../model/index.js";
import apiResponse from "../../utility/apiResponse.js";
import messages from "../../utility/messages.js";

// ---------------- CHECK IF VENDOR ALREADY HAS A VENUE ------------------
const checkVendorVenueExists = async (vendorId, excludeId = null) => {
  const query = {
    vendor_id: vendorId,
    is_deleted: false
  };

  if (excludeId) {
    query._id = { $ne: excludeId };
  }

  const existingVenue = await Venue.findOne(query);
  return existingVenue;
};


const createVenue = async (req, res) => {
  try {
    // Was hardcoded to `req.vendor._id`, which only exists when the caller
    // authenticated as a vendor. Admins can now also hit this route
    // (allowAdminOrVendor) and must specify which vendor/club this venue
    // belongs to via `vendor_id` in the body — same fix applied to events.
    const vendorId = req.vendor ? req.vendor._id : req.body.vendor_id;

    if (!vendorId) {
      return apiResponse.badRequest(
        res,
        "vendor_id is required when creating a venue as an admin (select the club/organiser this venue belongs to)"
      );
    }

    const existingVenue = await checkVendorVenueExists(vendorId);
    if (existingVenue) {
      return apiResponse.badRequest(
        res,
        "You already have a venue. Please update or delete your existing venue first."
      );
    }

    const {
      venue_name,
      city_id,
      category_ids,
      start_time,
      end_time,
      address,
      about,
      latitude,
      longitude,
      table_reservation_fee,
      reservation_fee,
      tax_percentage,
      bill_discount_percentage,
      open_days,
      terms_and_conditions
    } = req.body;

    /* ================= TIME NORMALIZER ================= */
    const normalizeTime = (timeStr) => {
      if (!timeStr) return "";

      timeStr = String(timeStr).trim().toUpperCase();

      if (timeStr.includes("AM") || timeStr.includes("PM")) {
        const [time, mod] = timeStr.split(" ");
        let [h, m] = time.split(":").map(Number);

        if (mod === "PM" && h < 12) h += 12;
        if (mod === "AM" && h === 12) h = 0;

        return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
      }

      return timeStr; // already 24hr
    };

    /* ================= IMAGES ================= */
    const venue_image = req.files?.venue_image?.[0]?.filename || "";
    const gallery_images = req.files?.gallery_images?.map(f => f.filename) || [];

    /* ================= CATEGORY ================= */
    let parsedCategoryIds = [];
    if (category_ids) {
      parsedCategoryIds = Array.isArray(category_ids) ? category_ids : [category_ids];
    }

    /* ================= OPEN DAYS ================= */
    let parsedOpenDays = [];
    if (open_days) {
      try {
        parsedOpenDays = typeof open_days === "string" ? JSON.parse(open_days) : open_days;
      } catch {
        parsedOpenDays = [];
      }
    }


    /* ================= TERMS & CONDITIONS ================= */
    let parsedTerms = [];

    if (terms_and_conditions) {
      try {
        const temp = typeof terms_and_conditions === "string"
          ? JSON.parse(terms_and_conditions)
          : terms_and_conditions;

        parsedTerms = temp.map(item => {

          if (typeof item === "string") {
            return { item };
          }


          if (typeof item === "object" && item.item) {
            return { item: item.item };
          }

          return null;
        }).filter(Boolean);

      } catch {
        parsedTerms = [];
      }
    }

    /* ================= FEES ================= */
    const finalTableReservationFee = parseFloat(table_reservation_fee || 0);
    const finalReservationFee = parseFloat(reservation_fee || 0);
    const finalTax = parseFloat(tax_percentage || 0);
    const finalBillDiscount = parseFloat(bill_discount_percentage || 0);

    /* ================= CREATE ================= */
    const newVenue = await Venue.create({
      vendor_id: vendorId,
      venue_name,
      venue_image,
      gallery_images,
      city_id: city_id || undefined,
      category_ids: parsedCategoryIds,
      open_days: parsedOpenDays,

      // ✅ FIXED TIME
      start_time: normalizeTime(start_time),
      end_time: normalizeTime(end_time),

      address,
      about,
      latitude: latitude ? parseFloat(latitude) : null,
      longitude: longitude ? parseFloat(longitude) : null,
      table_reservation_fee: finalTableReservationFee,
      reservation_fee: finalReservationFee,
      tax_percentage: finalTax,
      bill_discount_percentage: finalBillDiscount,
      terms_and_conditions: parsedTerms
    });

    return apiResponse.created(res, newVenue, "Venue created successfully");

  } catch (error) {
    return apiResponse.serverError(res, "Server error", error.message);
  }
};



const updateVenue = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      venue_name,
      city_id,
      category_ids,
      start_time,
      end_time,
      address,
      about,
      latitude,
      longitude,
      table_reservation_fee,
      reservation_fee,
      tax_percentage,
      bill_discount_percentage,
      open_days,
      venue_image: venue_image_from_body,
      gallery_images: gallery_images_from_body,
      terms_and_conditions
    } = req.body;

    // Vendors can only edit their own venue; admins can edit any venue.
    const lookupFilter = req.vendor
      ? { _id: id, vendor_id: req.vendor._id }
      : { _id: id };

    const venueExists = await Venue.findOne(lookupFilter);

    if (!venueExists) {
      return apiResponse.notFoundResponse(res, "Venue not found");
    }

    /* ================= TIME NORMALIZER ================= */
    const normalizeTime = (timeStr) => {
      if (!timeStr) return "";

      timeStr = String(timeStr).trim().toUpperCase();

      if (timeStr.includes("AM") || timeStr.includes("PM")) {
        const [time, mod] = timeStr.split(" ");
        let [h, m] = time.split(":").map(Number);

        if (mod === "PM" && h < 12) h += 12;
        if (mod === "AM" && h === 12) h = 0;

        return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
      }

      return timeStr;
    };

    /* ================= CATEGORY ================= */
    let parsedCategoryIds = [];
    if (category_ids) {
      try {
        parsedCategoryIds =
          typeof category_ids === "string"
            ? JSON.parse(category_ids)
            : category_ids;

        parsedCategoryIds = Array.isArray(parsedCategoryIds)
          ? parsedCategoryIds
          : [parsedCategoryIds];
      } catch {
        parsedCategoryIds = [category_ids];
      }
    }

    /* ================= OPEN DAYS ================= */
    let parsedOpenDays = [];
    if (open_days) {
      try {
        parsedOpenDays =
          typeof open_days === "string"
            ? JSON.parse(open_days)
            : open_days;
      } catch {
        parsedOpenDays = [];
      }
    }

    /* ================= TERMS & CONDITIONS ================= */
    let parsedTerms;

    if (terms_and_conditions !== undefined) {
      try {
        const temp = typeof terms_and_conditions === "string"
          ? JSON.parse(terms_and_conditions)
          : terms_and_conditions;

        parsedTerms = temp.map(item => {
          // ✅ string case
          if (typeof item === "string") {
            return { item };
          }

          // ✅ object case
          if (typeof item === "object" && item.item) {
            return { item: item.item };
          }

          return null;
        }).filter(Boolean);

      } catch {
        parsedTerms = venueExists.terms_and_conditions; // fallback
      }
    }

    /* ================= UPDATE DATA ================= */
    const updateData = {
      venue_name: venue_name || venueExists.venue_name,
      city_id: city_id || venueExists.city_id,
      category_ids: parsedCategoryIds.length ? parsedCategoryIds : venueExists.category_ids,
      open_days: parsedOpenDays.length ? parsedOpenDays : venueExists.open_days,

      // ✅ FIXED TIME
      start_time: start_time ? normalizeTime(start_time) : venueExists.start_time,
      end_time: end_time ? normalizeTime(end_time) : venueExists.end_time,

      address: address || venueExists.address,
      about: about || venueExists.about,
      latitude: latitude ? parseFloat(latitude) : venueExists.latitude,
      longitude: longitude ? parseFloat(longitude) : venueExists.longitude,
      table_reservation_fee: parseFloat(table_reservation_fee || venueExists.table_reservation_fee || 0),
      reservation_fee: parseFloat(reservation_fee || venueExists.reservation_fee || 0),
      tax_percentage: parseFloat(tax_percentage || venueExists.tax_percentage || 0),
      bill_discount_percentage: parseFloat(bill_discount_percentage || venueExists.bill_discount_percentage || 0),
      terms_and_conditions:
        parsedTerms !== undefined
          ? parsedTerms
          : venueExists.terms_and_conditions
    };

    /* ================= IMAGE ================= */
    if (req.files?.venue_image?.length > 0) {
      updateData.venue_image = req.files.venue_image[0].filename;
    } else if (venue_image_from_body) {
      updateData.venue_image = venue_image_from_body;
    }

    if (req.files?.gallery_images?.length > 0) {
      updateData.gallery_images = req.files.gallery_images.map(f => f.filename);
    } else if (gallery_images_from_body) {
      updateData.gallery_images = gallery_images_from_body;
    }

    const updatedVenue = await Venue.findOneAndUpdate(
      lookupFilter,
      updateData,
      { new: true }
    );

    return apiResponse.ok(res, updatedVenue, "Venue updated successfully");

  } catch (error) {
    return apiResponse.serverError(res, "Server error", error.message);
  }
};



// ---------------- GET ALL VENUES --------------------
const getAllVenues = async (req, res) => {
  try {
    // If request is from a vendor, scope to that vendor. If admin, return all venues.
    const vendorId = req.vendor?._id || null;

    const query = { is_deleted: false };
    if (vendorId) query.vendor_id = vendorId;

    const venues = await Venue.find(query).populate("category_ids", "category_name");

    return apiResponse.ok(res, venues, "Success");
  } catch (error) {
    return apiResponse.serverError(res, "Server error", error.message);
  }
};

// ---------------- GET VENDOR'S SINGLE VENUE --------------------
const getVenueByVendor = async (req, res) => {
  try {
    const vendorId = req.vendor._id;

    const venue = await Venue.findOne({
      vendor_id: vendorId,
      is_deleted: false,
    }).populate("category_ids", "category_name");

    if (!venue) {
      return apiResponse.ok(res, null, "No venue found for this vendor");
    }

    return apiResponse.ok(res, venue, "Success");
  } catch (error) {
    return apiResponse.serverError(res, "Server error", error.message);
  }
};


const getVenueById = async (req, res) => {
  try {
    const isVendor = !!req.vendor;

    const query = {
      _id: req.params.id,
      is_deleted: false,
      ...(isVendor && { vendor_id: req.vendor._id })
    };

    const venue = await Venue.findOne(query)
      .populate("category_ids", "category_name");

    if (!venue)
      return apiResponse.notFoundResponse(res, "Venue not found");

    return apiResponse.ok(res, venue, "Success");

  } catch (error) {
    return apiResponse.serverError(res, "Server error", error.message);
  }
};


// ---------------- DELETE VENUE --------------------
const deleteVenue = async (req, res) => {
  try {
    // Vendors can only delete their own venue; admins can delete any venue.
    const lookupFilter = req.vendor
      ? { _id: req.params.id, vendor_id: req.vendor._id }
      : { _id: req.params.id };

    const deletedVenue = await Venue.findOneAndUpdate(
      lookupFilter,
      { is_deleted: true },
      { new: true }
    );

    if (!deletedVenue)
      return apiResponse.notFoundResponse(res, "Venue not found");

    return apiResponse.ok(res, deletedVenue, "Venue deleted");
  } catch (error) {
    return apiResponse.serverError(res, "Server error", error.message);
  }
};

export default {
  createVenue,
  getAllVenues,
  getVenueByVendor,
  getVenueById,
  updateVenue,
  deleteVenue,
};