import express from "express";
import adminManagementController from "../../controller/admin/adminManagementController.js";
import { adminauth } from "../../middleware/authMiddleware.js";
import upload from "../../config/multer_config.js";

const route = express.Router();

// FIXED: /admins had no route at all — Admins.tsx's entire "list admins" +
// "add admin" feature was calling a nonexistent endpoint. Restricted to
// Super Admin inside the controller itself (any authenticated admin
// reaches these, but only SUPER_ADMIN gets a real response).
route.get("/", adminauth, adminManagementController.getAllAdmins);
route.post("/", adminauth, adminManagementController.createAdmin);
route.patch("/:id/status", adminauth, adminManagementController.toggleAdminStatus);
route.delete("/:id", adminauth, adminManagementController.deleteAdmin);
// NEW: nothing existed for an admin to update their own avatar — the
// "Change Photo" hover overlay on Settings.tsx had no file input or
// backend support at all.
route.patch("/me/avatar", adminauth, upload.single("profile_image"), adminManagementController.updateOwnAvatar);

export default route;