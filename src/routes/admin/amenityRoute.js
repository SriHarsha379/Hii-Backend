import express from "express";
import amenityController from "../../controller/admin/amenityController.js";
import { adminauth } from "../../middleware/authMiddleware.js";
import upload from "../../middleware/upload.js";
import { validate } from "../../middleware/validate.js";
import {
  amenitySchemaCreate,
  amenitySchemaUpdate,
} from "../../validation/admin/amenityValidation.js";

const route = express.Router();

route
  .get("/get_amenities", adminauth, amenityController.getAllAmenities)
  .get("/get_amenity_by_id/:id", adminauth, amenityController.getAmenityById)
  .post(
    "/create_amenity",
    adminauth,
    upload.single("amenity_icon"),
    validate(amenitySchemaCreate),
    amenityController.createAmenity
  )
  .put(
    "/update_amenity/:id",
    adminauth,
    upload.single("amenity_icon"),
    validate(amenitySchemaUpdate),
    amenityController.updateAmenity
  )
  .delete("/delete_amenity/:id", adminauth, amenityController.deleteAmenity);

export default route;
