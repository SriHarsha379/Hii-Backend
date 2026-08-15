import express from "express";
import activityLogController from "../../controller/admin/activityLogController.js";
import { allowAdminOrVendor } from "../../middleware/authMiddleware.js";

const route = express.Router();

route.get("/get_all", allowAdminOrVendor, activityLogController.getAllLogs);

export default route;
