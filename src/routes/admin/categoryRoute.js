/** @format */

import express from "express";
import categoryController from "../../controller/admin/categoryController.js";
import { adminauth, allowAdminOrVendor } from "../../middleware/authMiddleware.js";
import { validate } from "../../middleware/validate.js";
import {
  vendor_category_create_schema,
  vendor_category_update_schema,
} from "../../validation/admin/categoryValidation.js";

const route = express.Router();

route
  // GET → get all categories (ALLOW both admin AND vendor)
  .get("/get_category", allowAdminOrVendor, categoryController.getCategory)

  // POST → add category (admin only)
  .post(
    "/add_category",
    adminauth,
    validate(vendor_category_create_schema),
    categoryController.addCategory
  )

  // PUT → update category (admin only)
  .put(
    "/update_category/:id",
    adminauth,
    validate(vendor_category_update_schema),
    categoryController.editCategory
  )

  // DELETE → delete category (admin only)
  .delete(
    "/delete_category/:id",
    adminauth,
    categoryController.deleteCategory
  );

export default route;