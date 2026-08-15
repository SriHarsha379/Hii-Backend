import express from "express";
import supportRequestController from "../../controller/admin/supportRequestController.js";
import { allowAdminOrVendor } from "../../middleware/authMiddleware.js";

const route = express.Router();

route.get("/get_all", allowAdminOrVendor, supportRequestController.getAllRequests);
route.post("/update_status/:id", allowAdminOrVendor, supportRequestController.updateRequestStatus);

export default route;
