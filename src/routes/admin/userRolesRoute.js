import express from "express";
import userRolesController from "../../controller/admin/userRolesController.js";
import { allowAdminOrVendor } from "../../middleware/authMiddleware.js";

const route = express.Router();
route.post("/batch", allowAdminOrVendor, userRolesController.getRolesBatch);
route.get("/:id", allowAdminOrVendor, userRolesController.getRolesForUser);
export default route;
