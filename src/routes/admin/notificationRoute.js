import express from "express";
import manageController from "../../controller/admin/notificationController.js"
import { allowAdminOrVendor, vendorauth } from '../../middleware/authMiddleware.js';
const route = express.Router();


route
  .post('/send_notification', allowAdminOrVendor, manageController.sendVendorNotification)
  .get('/all', allowAdminOrVendor, manageController.getVendorNotifications)
  .get('/unread_count', allowAdminOrVendor, manageController.getVendorUnreadCount)

  export default route