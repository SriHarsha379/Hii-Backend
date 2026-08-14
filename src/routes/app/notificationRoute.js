import express from "express";
import manageController from "../../controller/app/notificationController.js"
import { appAuth } from '../../middleware/authMiddleware.js';
const route = express.Router();


route
  .post('/update_notification_status', appAuth, manageController.updateNotificationStatus)
  .get('/get_all_notification', appAuth, manageController.getAllNotification)
  .post('/delete_single_notification', appAuth, manageController.deleteSingleNotification)
  .post('/clear_all_notification', appAuth, manageController.clearAllNotification)

  export default route