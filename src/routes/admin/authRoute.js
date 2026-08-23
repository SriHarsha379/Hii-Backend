import express from 'express';
import authController from '../../controller/admin/authController.js';
import { validate } from '../../middleware/validate.js';
import { adminLoginSchema, changePasswordSchema, forgetPasswordSchema, forgetNewPasswordSchema } from '../../validation/admin/authValidation.js';
import { adminauth,allowAdminOrVendor, vendorauth } from '../../middleware/authMiddleware.js';
import upload from '../../middleware/upload.js';
const route = express.Router();
route
    // Admin login
    .post('/login', validate(adminLoginSchema), authController.loginAdmin)
    // NEW: second step of login when 2FA is enabled on the account
    .post('/verify-2fa', authController.verifyTwoFactorLogin)
    // NEW: 2FA setup/management for the logged-in admin
    .post('/2fa/setup', adminauth, authController.beginSetupTwoFactor)
    .post('/2fa/confirm', adminauth, authController.confirmSetupTwoFactor)
    .post('/2fa/disable', adminauth, authController.disableTwoFactor)
    // Update profile
    .put('/update', adminauth, upload.single("profile_image"), authController.updateAdminProfile)
    // Get admin details
    .get("/getDetails", adminauth, authController.getAdminDetails)
    // Change password
    .put("/change-password", adminauth, validate(changePasswordSchema), authController.changePassword)
    // Forget password - send email
    .post("/forget_password", validate(forgetPasswordSchema), authController.adminForgetPassword)
    // Forget password - set new password
    .put("/forget_new_password", validate(forgetNewPasswordSchema), authController.adminForgetNewPassword)
    // dashboard count
    .get("/getDashboardCounts", allowAdminOrVendor, authController.dashboardCounts)
    .get("/getDashboardCountsVendor",vendorauth,authController.dashboardCountsVendor)
export default route;