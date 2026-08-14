import express from 'express';
import vendorAuthController from '../../controller/admin/vendorAuthController.js';
import { vendorauth } from '../../middleware/authMiddleware.js';
import upload from '../../middleware/upload.js';
import { validate } from '../../middleware/validate.js';
import { 
  vendorLoginSchema, 
  changePasswordSchema, 
  forgetPasswordSchema, 
  forgetNewPasswordSchema,
  updateVendorProfileSchema 
} from '../../validation/admin/vendorAuthValidation.js';

const route = express.Router();

route
    // Update vendor profile
    .put('/update-profile', vendorauth, upload.single("business_image"), validate(updateVendorProfileSchema), vendorAuthController.updateVendorProfile)
    // Get vendor details
    .get("/get-details", vendorauth, vendorAuthController.getVendorDetails)

    // Change password
    .put("/change-password", vendorauth, validate(changePasswordSchema), vendorAuthController.changeVendorPassword)

export default route;
