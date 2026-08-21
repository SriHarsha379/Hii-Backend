import express from "express";
import analyticsController from "../../controller/admin/analyticsController.js";
import { allowAdminOrVendor } from "../../middleware/authMiddleware.js";

const route = express.Router();

route.get("/extended", allowAdminOrVendor, analyticsController.getExtendedStats);
route.get("/club-overview", allowAdminOrVendor, analyticsController.getClubOverviewStats);

export default route;