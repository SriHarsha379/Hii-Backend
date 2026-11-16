/** @format */
import express from "express";
import { adminauth } from "../../middleware/authMiddleware.js";

const route = express.Router();

/**
 * GET  /user-roles
 * Returns all available admin role names.
 * Extend with real CRUD role-management logic as the feature grows.
 */
route.get("/", adminauth, (req, res) => {
  res.json({
    success: true,
    message: "User roles fetched successfully",
    data: [
      "SUPER_ADMIN",
      "NORMAL_ADMIN",
      "CLUB_ADMIN",
      "EVENT_ADMIN",
      "CITY_ADMIN",
    ],
  });
});

export default route;
