import express from "express";
import { validate } from "../../middleware/validate.js";
import { addEarningSchema } from "../../validation/admin/earningValidation.js";
import controller from "../../controller/admin/earningController.js";
import { allowAdminOrVendor, adminauth } from "../../middleware/authMiddleware.js";

const router = express.Router();

// Get all earnings (allow both admin and vendor)
router.get("/list", allowAdminOrVendor, controller.getAllEarnings);

// Get today's earnings (allow both admin and vendor)
router.get("/today", allowAdminOrVendor, controller.getTodaysEarning);

// Get earnings statistics (allow both admin and vendor)
router.get("/stats", allowAdminOrVendor, controller.getEarningsStats);

// Get vendor-specific earnings (allow both admin and vendor)
router.get("/vendor/:vendor_id", allowAdminOrVendor, controller.getVendorEarnings);

// Get tabular earnings report (allow both admin and vendor)
router.get("/report/tabular", allowAdminOrVendor, controller.getTabularEarningsReport);

// Manually add earning (admin only - keep as adminauth)
router.post("/add", adminauth, validate(addEarningSchema), controller.addEarning);

// Delete earning (admin only - keep as adminauth)
router.delete("/delete/:id", adminauth, controller.deleteEarning);

export default router;