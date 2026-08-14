/** @format */
import { Event, Category } from "../../model/index.js";
import apiResponse from "../../utility/apiResponse.js";
import messages from "../../utility/messages.js";


// ---------------- CREATE EVENT ------------------
const createEvent = async (req, res) => {
  try {
    const vendorId = req.vendor._id;

    const {
      venue_name,
      city_id,
      category_ids,
      start_time,
      end_time,
      address,
      start_date,
      end_date,
      is_multi_day,
      about,
      artists,
      latitude,
      longitude,
      faqs,
      prohibited_items,
      terms_and_conditions
    } = req.body;

    /* ================= FILE UPLOADS ================= */

    const venue_image = req.files?.venue_image?.[0]?.filename || "";
    const gallery_images =
      req.files?.gallery_images?.map((f) => f.filename) || [];

    const event_layout_images =
      req.files?.event_layout_images?.map((f) => ({
        image_url: f.filename
      })) || [];

    const artistImages =
      req.files?.artist_images?.map((f) => f.filename) || [];

    const MAX_GALLERY_IMAGES = 10;

    if (gallery_images.length > MAX_GALLERY_IMAGES) {
      return apiResponse.badRequest(
        res,
        `Maximum ${MAX_GALLERY_IMAGES} gallery images allowed`
      );
    }

    /* ================= REQUIRED VALIDATION ================= */

    if (
      !venue_name ||
      !venue_image ||
      !category_ids ||
      !start_time ||
      !end_time ||
      !address ||
      !start_date ||
      latitude === undefined ||
      longitude === undefined
    ) {
      return apiResponse.badRequest(res, "Please fill all required fields");
    }

    /* ================= CATEGORY PARSE ================= */

    let parsedCategoryIds = [];
    try {
      parsedCategoryIds = JSON.parse(category_ids);
      if (!Array.isArray(parsedCategoryIds)) {
        parsedCategoryIds = [parsedCategoryIds];
      }
    } catch (error) {
      return apiResponse.badRequest(res, "Invalid category format");
    }

    /* ================= ARTIST PARSE ================= */

    let parsedArtists = [];
    try {
      if (artists) {
        parsedArtists = JSON.parse(artists);
        if (!Array.isArray(parsedArtists)) {
          parsedArtists = [parsedArtists];
        }

        parsedArtists = parsedArtists.map((artist, index) => ({
          name: artist.name || "",
          title: artist.title || "",
          subtitle: artist.subtitle || "",
          image: artistImages[index] || ""
        }));
      }
    } catch (error) {
      return apiResponse.badRequest(res, "Invalid artists format");
    }

    /* ================= FAQ PARSE ================= */

    let parsedFaqs = [];
    try {
      if (faqs) {
        parsedFaqs = JSON.parse(faqs);
        if (!Array.isArray(parsedFaqs)) {
          parsedFaqs = [parsedFaqs];
        }

        parsedFaqs = parsedFaqs.map((f) => ({
          question: f.question || "",
          answer: f.answer || ""
        }));
      }
    } catch (error) {
      return apiResponse.badRequest(res, "Invalid FAQ format");
    }

    /* ================= PROHIBITED ITEMS PARSE ================= */

    let parsedProhibitedItems = [];
    try {
      if (prohibited_items) {
        parsedProhibitedItems = JSON.parse(prohibited_items);
        if (!Array.isArray(parsedProhibitedItems)) {
          parsedProhibitedItems = [parsedProhibited_items];
        }

        parsedProhibitedItems = parsedProhibitedItems.map((item) => ({
          item: item.item || item || ""
        }));
      }
    } catch (error) {
      return apiResponse.badRequest(res, "Invalid prohibited items format");
    }

    /* ================= TERMS & CONDITIONS PARSE ================= */

    let parsedTerms = [];

    try {
      if (terms_and_conditions) {
        const temp =
          typeof terms_and_conditions === "string"
            ? JSON.parse(terms_and_conditions)
            : terms_and_conditions;

        if (!Array.isArray(temp)) {
          parsedTerms = [{ item: temp }];
        } else {
          parsedTerms = temp.map((item) => {
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
        }
      }
    } catch (error) {
      return apiResponse.badRequest(res, "Invalid terms and conditions format");
    }

    /* ================= CATEGORY VALIDATION ================= */

    const categories = await Category.find({
      _id: { $in: parsedCategoryIds },
      is_deleted: false
    });

    if (categories.length !== parsedCategoryIds.length) {
      return apiResponse.badRequest(res, "Some categories not found");
    }

    /* ================= DATE LOGIC ================= */

    let finalEndDate = start_date;

    if (is_multi_day === "true" || is_multi_day === true) {
      if (!end_date) {
        return apiResponse.badRequest(
          res,
          "End date required for multi-day event"
        );
      }

      if (end_date < start_date) {
        return apiResponse.badRequest(
          res,
          "End date cannot be before start date"
        );
      }

      finalEndDate = end_date;
    }

    /* ================= CREATE EVENT ================= */

    const newEvent = await Event.create({
      vendor_id: vendorId,
      venue_name,
      venue_image,
      city_id: city_id || undefined,
      category_ids: parsedCategoryIds,
      start_time,
      end_time,
      address,
      latitude: latitude || null,
      longitude: longitude || null,
      start_date,
      end_date: finalEndDate,
      is_multi_day: is_multi_day === "true" || is_multi_day === true,
      about: about || "",
      gallery_images,
      artists: parsedArtists,

      // ✅ NEW FIELDS
      event_layout_images,
      terms_and_conditions: parsedTerms,
      faqs: parsedFaqs,
      prohibited_items: parsedProhibitedItems,

      is_active: true,
      is_deleted: false
    });

    return apiResponse.created(res, newEvent, "Event created successfully");

  } catch (error) {
    console.error("Create event error:", error);
    return apiResponse.serverError(res, "Server error", error.message);
  }
};



// ---------------- UPDATE EVENT --------------------
const updateEvent = async (req, res) => {
  try {
    const vendorId = req.vendor._id;
    const { id } = req.params;

    const {
      venue_name,
      city_id,
      category_ids,
      start_time,
      end_time,
      address,
      start_date,
      end_date,
      is_multi_day,
      about,
      artists,
      latitude,
      longitude,
      faqs,
      prohibited_items,
      terms_and_conditions,
      existing_gallery_images,
      existing_event_layout_images
    } = req.body;

    const eventExists = await Event.findOne({
      _id: id,
      vendor_id: vendorId,
      is_deleted: false
    });

    if (!eventExists) {
      return apiResponse.notFoundResponse(res, "Event not found");
    }

    const updateData = {};

    /* ================= BASIC FIELDS ================= */

    if (venue_name !== undefined) updateData.venue_name = venue_name;
    if (city_id !== undefined) updateData.city_id = city_id;
    if (address !== undefined) updateData.address = address;
    if (about !== undefined) updateData.about = about;
    if (latitude !== undefined) updateData.latitude = latitude;
    if (longitude !== undefined) updateData.longitude = longitude;
    if (terms_and_conditions !== undefined)
      updateData.terms_and_conditions = terms_and_conditions;

    if (start_time !== undefined) updateData.start_time = start_time;
    if (end_time !== undefined) updateData.end_time = end_time;

    /* ================= CATEGORY ================= */

    if (category_ids !== undefined) {
      try {
        let parsedCategoryIds = JSON.parse(category_ids);
        if (!Array.isArray(parsedCategoryIds)) {
          parsedCategoryIds = [parsedCategoryIds];
        }

        const categories = await Category.find({
          _id: { $in: parsedCategoryIds },
          is_deleted: false
        });

        if (categories.length !== parsedCategoryIds.length) {
          return apiResponse.badRequest(res, "Some categories not found");
        }

        updateData.category_ids = parsedCategoryIds;
      } catch (error) {
        return apiResponse.badRequest(res, "Invalid category format");
      }
    }

    /* ================= TERMS & CONDITIONS ================= */

    if (terms_and_conditions !== undefined) {
      try {
        const temp =
          typeof terms_and_conditions === "string"
            ? JSON.parse(terms_and_conditions)
            : terms_and_conditions;

        let parsedTerms = [];

        if (!Array.isArray(temp)) {
          parsedTerms = [{ item: temp }];
        } else {
          parsedTerms = temp.map((item) => {
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
        }

        updateData.terms_and_conditions = parsedTerms;

      } catch (error) {
        return apiResponse.badRequest(res, "Invalid terms and conditions format");
      }
    }

    /* ================= ARTISTS ================= */

    if (artists !== undefined) {
      try {
        let parsedArtists = JSON.parse(artists);
        if (!Array.isArray(parsedArtists)) {
          parsedArtists = [parsedArtists];
        }

        const artistImages =
          req.files?.artist_images?.map((f) => f.filename) || [];

        parsedArtists = parsedArtists.map((artist, index) => ({
          name: artist.name || "",
          title: artist.title || "",
          subtitle: artist.subtitle || "",
          image:
            artistImages[index] ||
            artist.image ||
            eventExists.artists?.[index]?.image ||
            ""
        }));

        updateData.artists = parsedArtists;
      } catch (error) {
        return apiResponse.badRequest(res, "Invalid artists format");
      }
    }

    /* ================= FAQ ================= */

    if (faqs !== undefined) {
      try {
        let parsedFaqs = JSON.parse(faqs);
        if (!Array.isArray(parsedFaqs)) {
          parsedFaqs = [parsedFaqs];
        }

        updateData.faqs = parsedFaqs.map((f) => ({
          question: f.question || "",
          answer: f.answer || ""
        }));
      } catch (error) {
        return apiResponse.badRequest(res, "Invalid FAQ format");
      }
    }

    /* ================= PROHIBITED ITEMS ================= */

    if (prohibited_items !== undefined) {
      try {
        let parsedItems = JSON.parse(prohibited_items);
        if (!Array.isArray(parsedItems)) {
          parsedItems = [parsedItems];
        }

        updateData.prohibited_items = parsedItems.map((item) => ({
          item: item.item || item || ""
        }));
      } catch (error) {
        return apiResponse.badRequest(res, "Invalid prohibited items format");
      }
    }

    /* ================= DATE LOGIC ================= */

    let newStartDate =
      start_date !== undefined ? start_date : eventExists.start_date;

    let multiDay =
      is_multi_day !== undefined
        ? is_multi_day === "true" || is_multi_day === true
        : eventExists.is_multi_day;

    let finalEndDate = newStartDate;

    if (multiDay) {
      const newEndDate =
        end_date !== undefined ? end_date : eventExists.end_date;

      if (!newEndDate) {
        return apiResponse.badRequest(res, "End date required for multi-day event");
      }

      if (newEndDate < newStartDate) {
        return apiResponse.badRequest(res, "End date cannot be before start date");
      }

      finalEndDate = newEndDate;
    }

    updateData.start_date = newStartDate;
    updateData.end_date = finalEndDate;
    updateData.is_multi_day = multiDay;

    /* ================= VENUE IMAGE ================= */

    if (req.files?.venue_image?.length > 0) {
      updateData.venue_image = req.files.venue_image[0].filename;
    }

    /* ================= GALLERY IMAGES ================= */

    const MAX_GALLERY_IMAGES = 10;

    const existingGallery =
      existing_gallery_images
        ? JSON.parse(existing_gallery_images)
        : eventExists.gallery_images || [];

    const newGallery =
      req.files?.gallery_images?.map((f) => f.filename) || [];

    if (existingGallery.length + newGallery.length > MAX_GALLERY_IMAGES) {
      return apiResponse.badRequest(
        res,
        `Total gallery images cannot exceed ${MAX_GALLERY_IMAGES}`
      );
    }

    updateData.gallery_images = [...existingGallery, ...newGallery];

    /* ================= EVENT LAYOUT IMAGES ================= */

    const existingLayouts =
      existing_event_layout_images
        ? JSON.parse(existing_event_layout_images)
        : eventExists.event_layout_images || [];

    const newLayouts =
      req.files?.event_layout_images?.map((f) => ({
        image_url: f.filename
      })) || [];

    if (newLayouts.length > 0) {
      // 👉 new image aayi → purani sab hatao
      updateData.event_layout_images = newLayouts;
    } else {
      // 👉 new image nahi aayi → existing hi rakho
      updateData.event_layout_images =
        existing_event_layout_images
          ? JSON.parse(existing_event_layout_images)
          : eventExists.event_layout_images || [];
    }

    /* ================= UPDATE ================= */

    const updatedEvent = await Event.findOneAndUpdate(
      { _id: id, vendor_id: vendorId },
      updateData,
      { new: true }
    );

    return apiResponse.ok(res, updatedEvent, "Event updated successfully");

  } catch (error) {
    console.error("Update event error:", error);
    return apiResponse.serverError(res, "Server error", error.message);
  }
};

// ---------------- GET ALL EVENTS --------------------
const getAllEvents = async (req, res) => {
  try {
    const vendorId = req.vendor?._id || null;

    const query = { is_deleted: false };
    if (vendorId) query.vendor_id = vendorId;

    const events = await Event.find(query)
      .populate("category_ids", "category_name")
      .sort({ createdAt: -1 });

    return apiResponse.ok(res, events, "Success");
  } catch (error) {
    return apiResponse.serverError(res, "Server error", error.message);
  }
};



const getEventById = async (req, res) => {
  try {
    let query = {
      _id: req.params.id,
      is_deleted: false
    };

    if (req.vendor) {
      query.vendor_id = req.vendor._id;
    }

    const event = await Event.findOne(query)
      .populate("category_ids", "category_name")
      .lean();

    if (!event) {
      return apiResponse.notFoundResponse(res, "Event not found");
    }

    const responseData = {
      _id: event._id,
      vendor_id: event.vendor_id,

      venue_name: event.venue_name || "",
      venue_image: event.venue_image || "",

      category_ids: event.category_ids || [],

      start_time: event.start_time || "",
      end_time: event.end_time || "",

      start_date: event.start_date || "",
      end_date: event.end_date || "",

      is_multi_day: event.is_multi_day || false,

      address: event.address || "",

      latitude: event.latitude ?? null,
      longitude: event.longitude ?? null,

      about: event.about || "",

      gallery_images: event.gallery_images || [],

      artists: event.artists || [],

      // ✅ NEW FIELDS
      event_layout_images: event.event_layout_images || [],
      terms_and_conditions: event.terms_and_conditions || "",
      faqs: event.faqs || [],
      prohibited_items: event.prohibited_items || [],

      is_active: event.is_active ?? true,
      is_deleted: event.is_deleted ?? false,

      createdAt: event.createdAt,
      updatedAt: event.updatedAt
    };

    return apiResponse.ok(res, responseData, "Event details fetched successfully");
  } catch (error) {
    console.error("Get event by id error:", error);
    return apiResponse.serverError(res, "Server error", error.message);
  }
};


// ---------------- DELETE EVENT --------------------
const deleteEvent = async (req, res) => {
  try {
    const vendorId = req.vendor._id;

    const deletedEvent = await Event.findOneAndUpdate(
      { _id: req.params.id, vendor_id: vendorId },
      { is_deleted: true },
      { new: true }
    );

    if (!deletedEvent) {
      return apiResponse.notFoundResponse(res, "Event not found");
    }

    return apiResponse.ok(res, deletedEvent, "Event deleted");
  } catch (error) {
    return apiResponse.serverError(res, "Server error", error.message);
  }
};

export default {
  createEvent,
  getAllEvents,
  getEventById,
  updateEvent,
  deleteEvent,
};