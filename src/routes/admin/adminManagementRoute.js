import express from "express";
import adminManagementController from "../../controller/admin/adminManagementController.js";
import { adminauth } from "../../middleware/authMiddleware.js";

const route = express.Router();

// FIXED: /admins had no route at all — Admins.tsx's entire "list admins" +
// "add admin" feature was calling a nonexistent endpoint. Restricted to
// Super Admin inside the controller itself (any authenticated admin
// reaches these, but only SUPER_ADMIN gets a real response).
route.get("/", adminauth, adminManagementController.getAllAdmins);
route.post("/", adminauth, adminManagementController.createAdmin);

export default route;