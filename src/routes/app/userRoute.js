import express from 'express';
import userController from '../../controller/app/userController.js';
import upload from '../../middleware/upload.js';
import { appAuth } from '../../middleware/authMiddleware.js';
import admin from "firebase-admin";

const route = express.Router();
route
  .post("/edit_profile", appAuth, upload.single("profile_image"), userController.editProfile)
  .post("/update_profile_visibility", appAuth, userController.updateProfileVisibility)
  .post("/update_gallery_visibility", appAuth, userController.updateGalleryItemVisibility)
  .get("/get_profile_visibility", appAuth, userController.getSwipeProfileSettings)
  .post("/update_my_visibility", appAuth, userController.updateMyVisibility)
  .post("/delete_account", appAuth, userController.deleteAccount)
  .get("/get_faq", appAuth, userController.getFaqForCustomer)
  .post("/report_problem", appAuth, upload.fields([{ name: "images" },
  { name: "videos"}, { name: "thumbnails"}]), userController.reportProblem)
  .get("/get_support_email", appAuth, userController.getSupportEmail)
  .post("/update_interests", appAuth, userController.updateUserInterests)
  .get("/my_profile_data", appAuth, userController.getMyProfile)
  .post('/enable_two_fa', appAuth, userController.enableTwoFA)
  .post("/upload_gallery", appAuth,
    upload.fields([{ name: "images" }, { name: "videos" }, { name: "thumbnails" }
    ]), userController.uploadUserGallery)
  .post('/update_hobbies', appAuth, userController.updateUserHobbies)
  .get("/recently_liked_items", appAuth, userController.getRecentLikedItems)
  .post("/update_social_account", appAuth, userController.updateSocialAccount)
  .post('/add_vibes', appAuth, userController.addUserVibes)
  .post('/add_event_preferences', appAuth, userController.addUserEventPreferences)
  .post("/delete_gallery_item", appAuth, userController.deleteUserGalleryItem)
  .post("/update_notification_setting", appAuth, userController.updateNotificationSetting)
  .post("/change_password", appAuth, userController.userChangePassword)
  .get("/get_my_visibility", appAuth, userController.getMyVisibility)
  .get("/get_notification_setting", appAuth, userController.getNotificationSettings)

route.get("/test-push/:token", async (req, res) => {
  try {
    const { token } = req.params;

    console.log("Testing token:", token);

    const message = {
      notification: {
        title: "Production Test",
        body: "Push notification is working 🚀",
      },
      token: token,
    };

    const response = await admin.messaging().send(message);

    console.log("FCM SUCCESS:", response);

    return res.json({
      success: true,
      response,
    });

  } catch (error) {
    console.log("FCM ERROR:", error);

    return res.status(500).json({
      success: false,
      error: error.message,
      fullError: error,
    });
  }
});

route.get('/admin_details',appAuth ,userController.admindetails)

route.post('/user_convertion_details',appAuth ,userController.checkConverationId)
export default route;

