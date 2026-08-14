import express from "express";
import vendorController from "../../controller/admin/vendorController.js";
import vendorAuthController from "../../controller/admin/vendorAuthController.js";
import { adminauth, vendorauth } from "../../middleware/authMiddleware.js";
import upload from "../../config/multer_config.js";

const route = express.Router();

route
  .get("/get_all_vendors", adminauth, vendorController.getAllVendors)

  .get("/get_vendor_by_id/:id", adminauth, vendorController.getVendorById)

  .post("/add_vendor", adminauth, upload.single("business_image"), vendorController.createVendor)

  .put("/update_vendor/:id", adminauth, upload.single("business_image"), vendorController.updateVendor)

  // Existing toggle endpoint with email
  .post("/change_Status/:id", adminauth, vendorController.updateVendorStatus)

  // New specific endpoints with email
  .put("/activate_vendor/:id", adminauth, vendorController.activateVendor)

  .put("/deactivate_vendor/:id", adminauth, vendorController.deactivateVendor)

  .delete("/delete_vendor/:id", adminauth, vendorController.deleteVendor)

  .get("/services", adminauth, vendorController.getVendorServices)
  .get("/bookings", adminauth, vendorController.getVendorBookings)
  .get("/earnings", adminauth, vendorController.getVendorEarnings)
  .get("/withdrawals", adminauth, vendorController.getVendorWithdrawals)
  .post("/forget-password", vendorAuthController.vendorForgetPassword)
  .get("/get_bank_details", vendorauth, vendorController.getBankDetails)
  .post("/add_bank_details", vendorauth, vendorController.addBankDetails)
  .put("/edit_bank_details", vendorauth, vendorController.editBankDetails)
  .delete("/delete_bank_details", vendorauth, vendorController.deleteBankDetails)

export default route;