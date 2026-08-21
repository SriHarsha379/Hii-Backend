import express from "express";
import eventController from "../../controller/admin/eventController.js";
import { vendorauth, allowAdminOrVendor } from "../../middleware/authMiddleware.js";
import upload from "../../middleware/upload.js";

const route = express.Router();

route.post(
  "/create_event",
  allowAdminOrVendor,
  upload.fields([
    { name: "venue_image", maxCount: 1 },
    { name: "artist_images", maxCount: 20 },
    { name: "gallery_images", maxCount: 10 },
    { name: "event_layout_images", maxCount: 1 }
  ]),
  eventController.createEvent
);

route.get("/get_all_event", allowAdminOrVendor, eventController.getAllEvents);

// Alias for frontend: support `/list` under `/events`
route.get("/list", allowAdminOrVendor, eventController.getAllEvents);

route.get("/get_event_by_id/:id", allowAdminOrVendor, eventController.getEventById);

route.put(
  "/update_event/:id",
  allowAdminOrVendor,
  upload.fields([
    { name: "venue_image", maxCount: 1 },
    { name: "artist_image", maxCount: 1 },  // Added artist image
    { name: "gallery_images", maxCount: 10 },
    { name: "event_layout_images", maxCount: 1 }
  ]),
  eventController.updateEvent
);

route.delete("/delete_event/:id", allowAdminOrVendor, eventController.deleteEvent);

// Featured Events — was entirely missing (no route, no model field).
route.get("/featured", allowAdminOrVendor, eventController.getFeaturedEvents);
route.post("/feature/:id", allowAdminOrVendor, eventController.featureEvent);
route.post("/unfeature/:id", allowAdminOrVendor, eventController.unfeatureEvent);

export default route;