/** @format */

import moment from "moment";
import mongoose from "mongoose";
import { Category } from "../../model/index.js";
import apiResponse from "../../utility/apiResponse.js";
import messages from "../../utility/messages.js";

const CategoryController = {
  // Add Category
  addCategory: async (req, res) => {
    try {
      const { category_name, category_type } = req.body;

      if (!category_name || !category_name.trim()) {
        return apiResponse.badRequest(res, "Category name is required");
      }

      const existCategory = await Category.findOne({
        category_name: category_name.trim(),
        category_type,
        is_deleted: false,
      });

      if (existCategory) {
        return apiResponse.badRequest(res, messages.CATEGORY_ALREADY);
      }

      const category = new Category({
        category_name: category_name.trim(),
        category_type,
      });

      await category.save();

      return apiResponse.created(res, category, messages.CATEGORY_CREATED);
    } catch (err) {
      console.error("Add Category Error:", err);

      if (err.code === 11000) {
        return apiResponse.badRequest(res, messages.CATEGORY_ALREADY);
      }

      return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
    }
  },

  // Get all categories
  getCategory: async (req, res) => {
    try {
      const categories = await Category.find({
        is_active: true,
        is_deleted: false,
      }).sort({ category_name: 1 });

      const data = categories.map((cat) => ({
        _id: cat._id,
        category_name: cat.category_name,
        category_type: cat.category_type,
        category_type_label: cat.category_type === 1 ? "Event" : "Venue",
        is_active: cat.is_active,
        createdAt: moment(cat.createdAt).format("DD-MM-YYYY hh:mm A"),
        updatedAt: moment(cat.updatedAt).format("DD-MM-YYYY hh:mm A"),
      }));

      return apiResponse.ok(res, data, messages.SUCCESS);
    } catch (err) {
      console.error("Get Category Error:", err.message);
      return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
    }
  },

  // Delete category
  deleteCategory: async (req, res) => {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return apiResponse.badRequest(res, "Invalid category ID");
      }

      const category = await Category.findOne({
        _id: id,
        is_deleted: false,
      });

      if (!category) {
        return apiResponse.notFound(res, messages.CATEGORY_NOT_FOUND);
      }

      category.is_deleted = true;
      category.is_active = false;

      await category.save();

      return apiResponse.ok(
        res,
        { _id: id },
        ["Category deleted successfully"]
      );
    } catch (err) {
      console.error("Delete Category Error:", err.message);
      return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
    }
  },

  editCategory: async (req, res) => {
    try {
      const { id } = req.params;
      const { category_name, category_type } = req.body;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return apiResponse.badRequest(res, "Invalid category ID");
      }

      const category = await Category.findOne({
        _id: id,
        is_deleted: false,
      });

      if (!category) {
        return apiResponse.notFound(res, messages.CATEGORY_NOT_FOUND);
      }

      // Prepare updated values
      const updatedName = category_name?.trim() || category.category_name;
      const updatedType = category_type || category.category_type;

      // Check duplicate
      const existCategory = await Category.findOne({
        _id: { $ne: id },
        category_name: updatedName,
        category_type: updatedType,
        is_deleted: false,
      });

      if (existCategory) {
        return apiResponse.badRequest(res, messages.CATEGORY_ALREADY);
      }

      // Update
      category.category_name = updatedName;
      category.category_type = updatedType;
      category.updatedAt = Date.now();

      await category.save();

      return apiResponse.ok(
        res,
        category,
        messages.CATEGORY_UPDATE_SUCCESSFULLY
      );

    } catch (err) {
      console.error("Update Category Error:", err);

      if (err.code === 11000) {
        return apiResponse.badRequest(res, messages.CATEGORY_ALREADY);
      }

      return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
    }
  }

};




export default CategoryController;