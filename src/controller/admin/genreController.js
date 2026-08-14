import moment from "moment";
import { Genre } from "../../model/index.js";
import apiResponse from "../../utility/apiResponse.js";
import messages from "../../utility/messages.js";

const addGenre = async (req, res) => {
  try {
    const { name, description } = req.body;
    const image = req.file ? req.file.filename : null;

    const trimmedName = name.trim();

    // Check if genre exists (even deleted)
    const existingGenre = await Genre.findOne({ name: trimmedName });

    if (existingGenre) {

      // If already active
      if (!existingGenre.is_deleted) {
        return apiResponse.badRequest(res, messages.GENRE_ALREADY_EXISTS);
      }

      // If deleted → restore it
      existingGenre.is_deleted = false;
      existingGenre.is_active = true;
      existingGenre.description = description || existingGenre.description;
      existingGenre.image = image || existingGenre.image;

      await existingGenre.save();

      return apiResponse.ok(res, existingGenre, messages.GENRE_CREATED_SUCCESSFULLY);
    }

    // If completely new
    const genre = await Genre.create({
      name: trimmedName,
      description,
      image
    });

    return apiResponse.created(res, genre, messages.GENRE_CREATED_SUCCESSFULLY);

  } catch (err) {
    console.log(err.message);
    return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
  }
};


const getAllGenres = async (req, res) => {
  try {
    const { search, category, top_picks } = req.query;

    const filter = { is_active: true, is_deleted: false };

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { category: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    if (category) filter.category = category;
    if (top_picks === "true") filter.is_top_pick = true;

    const genres = await Genre.find(filter)
      .sort({ is_top_pick: -1, name: 1 })
      .lean();

    const data = genres.map((g) => ({
      ...g,
      createdAt: moment(g.createdAt).format("DD-MM-YYYY hh:mm A"),
      updatedAt: moment(g.updatedAt).format("DD-MM-YYYY hh:mm A"),
    }));

    return apiResponse.ok(res, data, messages.SUCCESS);
  } catch (err) {
    console.log(err.message);
    return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
  }
};


const getGenreById = async (req, res) => {
  try {
    const genre = await Genre.findOne({
      _id: req.params.id,
      is_deleted: false,
    }).lean();

    if (!genre) {
      return apiResponse.notFoundResponse(res, messages.GENRE_NOT_FOUND);
    }

    return apiResponse.ok(res, genre, messages.SUCCESS);
  } catch (err) {
    console.log(err.message);
    return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
  }
};


const updateGenre = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;
    const image = req.file ? req.file.filename : null;

    const genre = await Genre.findOne({ _id: id, is_deleted: false });

    if (!genre) {
      return apiResponse.notFoundResponse(res, messages.GENRE_NOT_FOUND);
    }

    if (name) {
      const existGenre = await Genre.findOne({
        name: { $regex: new RegExp(`^${name}$`, "i") },
        _id: { $ne: id },
        is_deleted: false,
      });

      if (existGenre) {
        return apiResponse.badRequest(res, messages.GENRE_ALREADY_EXISTS);
      }
    }

    genre.name = name || genre.name;
    genre.description = description ?? genre.description;
    if (image) genre.image = image;
    genre.updatedAt = Date.now();

    await genre.save();

    return apiResponse.ok(res, genre, messages.GENRE_UPDATED_SUCCESSFULLY);
  } catch (err) {
    console.log(err.message);
    return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
  }
};


const deleteGenre = async (req, res) => {
  try {
    const { id } = req.params;

    const genre = await Genre.findOne({ _id: id, is_deleted: false });

    if (!genre) {
      return apiResponse.notFoundResponse(res, messages.GENRE_NOT_FOUND);
    }

    genre.is_deleted = true;
    genre.is_active = false;
    genre.updatedAt = Date.now();

    await genre.save();

    return apiResponse.ok(res, null, messages.GENRE_DELETED_SUCCESSFULLY);
  } catch (err) {
    console.log(err.message);
    return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
  }
};


const getTopPicks = async (req, res) => {
  try {
    const genres = await Genre.find({
      is_top_pick: true,
      is_active: true,
      is_deleted: false,
    })
      .sort({ name: 1 })
      .lean();

    return apiResponse.ok(res, genres, messages.SUCCESS);
  } catch (err) {
    console.log(err.message);
    return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
  }
};


const getCategories = async (req, res) => {
  try {
    const vendor_id = req.vendor._id;

    const categories = await Genre.distinct('category', {
      vendor_id,
      is_active: true,
      is_deleted: false
    });

    return apiResponse.ok(res, categories, messages.SUCCESS);

  } catch (err) {
    console.log(err.message);
    return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
  }
};

export default {
  addGenre,
  getAllGenres,
  getGenreById,
  updateGenre,
  deleteGenre,
  getTopPicks,
  getCategories
};