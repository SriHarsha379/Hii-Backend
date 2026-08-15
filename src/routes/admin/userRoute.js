import express from 'express';
import userController from '../../controller/admin/userController.js';
import { allowAdminOrVendor } from '../../middleware/authMiddleware.js';
import upload from "../../middleware/upload.js";
const route = express.Router();

route
    .get("/get_all_user", allowAdminOrVendor, userController.getAllUsers)
    .get("/get_user_by_id/:id", allowAdminOrVendor, userController.getUserById)
    .post("/change_Status/:id", allowAdminOrVendor, userController.updateUserStatus)
    .get("/get_delete_user", allowAdminOrVendor, userController.getDeletedUsers);
route.get('/get_user_details/:id', allowAdminOrVendor, userController.getUserDetails);
route.post('/image_uplod', allowAdminOrVendor, upload.array('image'), userController.imageUpload);
// Get only user bookings
route.get('/get_user_bookings/:id', allowAdminOrVendor, userController.getUserBookings);

route
    .get("/get_all_user_reports", allowAdminOrVendor, userController.getUserReports)
    .post("/update_report_status", allowAdminOrVendor, userController.updateUserReportStatus);

export default route;
