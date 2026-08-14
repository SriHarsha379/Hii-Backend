import express from 'express';
// import userController from '../../controller/admin/userController.js';
// import { allowAdminOrVendor } from '../../middleware/authMiddleware.js';
// import multer from 'multer';
// import upload from "../../config/multer_config.js";
const route = express.Router();

// TEMPORARILY DISABLED — userController.js is missing exports for:
// getAllUsers, getUserById, updateUserStatus, getDeletedUsers, getUserDetails,
// imageUpload, getUserBookings, getUserReports, updateUserReportStatus
// Re-enable once those are added back to userController.js's export default { ... }

export default route;
