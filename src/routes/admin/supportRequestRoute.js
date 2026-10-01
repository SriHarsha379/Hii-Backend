import express from "express";
import supportRequestController from "../../controller/admin/supportRequestController.js";
import { allowAdminOrVendor } from "../../middleware/authMiddleware.js";

const route = express.Router();

route.get("/get_all", allowAdminOrVendor, supportRequestController.getAllRequests);
route.post("/update_status/:id", allowAdminOrVendor, supportRequestController.updateRequestStatus);
route.get("/categories", allowAdminOrVendor, supportRequestController.getCategories);
route.post("/my_request", allowAdminOrVendor, supportRequestController.createMyRequest);
route.get("/my_requests", allowAdminOrVendor, supportRequestController.getMyRequests);

export default route;
