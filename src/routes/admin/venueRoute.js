import express from "express";
import venueController from "../../controller/admin/venueController.js";
import { vendorauth, allowAdminOrVendor } from "../../middleware/authMiddleware.js";
import upload from "../../middleware/upload.js";

const route = express.Router();

// New route to get vendor's single venue
route.get("/my-venue", vendorauth, venueController.getVenueByVendor);

route.post(
  "/create_venue",
  allowAdminOrVendor,
  upload.fields([
    { name: "venue_image", maxCount: 1 },
    { name: "gallery_images", maxCount: 10 },
  ]),
  venueController.createVenue
);

route.get("/get_all_venues", allowAdminOrVendor, venueController.getAllVenues);

// Alias for frontend: support `/list` path under `/venues`
route.get("/list", allowAdminOrVendor, venueController.getAllVenues);

route.get("/get_venue_by_id/:id", allowAdminOrVendor, venueController.getVenueById);

route.put(
  "/update_venue/:id",
  allowAdminOrVendor,
  upload.fields([
    { name: "venue_image", maxCount: 1 },
    { name: "gallery_images", maxCount: 10 },
  ]),
  venueController.updateVenue
);

route.delete("/delete_venue/:id", allowAdminOrVendor, venueController.deleteVenue);

export default route;