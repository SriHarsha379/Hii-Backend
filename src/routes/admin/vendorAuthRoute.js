import express from "express";
import vendorAuthController from "../../controller/admin/vendorAuthController.js";
import { vendorauth } from "../../middleware/authMiddleware.js";
import upload from "../../middleware/upload.js"

const router = express.Router();

/* =========================
   AUTH
========================= */

// Login
router.post("/login", vendorAuthController.vendorLogin);

// Forget password (send reset link)
router.post("/forget-password", vendorAuthController.vendorForgetPassword);

// Reset password
router.post("/reset-password", vendorAuthController.vendorForgetNewPassword);

/* =========================
   PROTECTED ROUTES
========================= */

// Get logged-in vendor profile (basic)
router.get("/profile", vendorauth, (req, res) => {
  res.json({
    success: true,
    vendor: req.vendor,
  });
});

// Get vendor full details (with populate)
router.get(
  "/details",
  vendorauth,
  vendorAuthController.getVendorDetails
);

// Update vendor profile
router.put(
  "/update-profile",
  vendorauth,
  upload.single("business_image"),
  vendorAuthController.updateVendorProfile
);

// Change password
router.post(
  "/change-password",
  vendorauth,
  vendorAuthController.changeVendorPassword
);

export default router;
