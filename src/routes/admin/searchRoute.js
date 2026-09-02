import express from "express";
import searchController from "../../controller/admin/searchController.js";
import { allowAdminOrVendor } from "../../middleware/authMiddleware.js";

const route = express.Router();

route.get("/", allowAdminOrVendor, searchController.search);

export default route;