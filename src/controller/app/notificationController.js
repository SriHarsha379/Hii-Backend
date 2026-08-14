import { User, Notification, } from "../../model/index.js";
import apiResponse from "../../utility/apiResponse.js";
import messages from "../../utility/messages.js";
import helper from "../../utility/helper.js";
import dotenv from "dotenv";
dotenv.config();


//update notification status 
const updateNotificationStatus = async (req, res) => {
  const user_id = req.userId

  const { notification_status, payment_status, blog_status } = req.body;
  try {
    await User.updateOne(
      { _id: user_id },
      {
        $set: {
          notification_push: notification_status,
          notification_payment: payment_status,
          notification_blog_post: blog_status,
        },
      });
    const userData = await helper.getUserData(user_id);

    return apiResponse.ok(res, userData, messages.STATUS_UPDATED);
  } catch (error) {
    return apiResponse.serverError(res, messages.SERVER_ERROR, error.message);
  }
}

// get all notifications
const getAllNotification = async (req, res) => {
  try {
    const { page, limit } = req.query;
    const { limits, offset, pages } = helper.getPagination(page, limit);

    const user_id = req.userId;

    // 🔹 Get date before 7 days
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    // 🔹 Count total notifications
    const totalCount = await Notification.countDocuments({
      other_user_id: user_id,
      is_deleted: 0,
      action: { $ne: "new_message" }
    });

    // 🔹 Fetch all notifications (paginated + sorted)
    const fetchNotifications = await Notification.find({
      other_user_id: user_id,
      is_deleted: 0,
      action: { $ne: "new_message" }
    })
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limits);

    // 🔹 Mark unread notifications as read
    await Notification.updateMany(
      {
        other_user_id: user_id,
        is_deleted: 0,
        read_status: 0,
        action: { $ne: "new_message" }
      },
      { $set: { read_status: 1 } }
    );

    // 🔹 Separate recent & older notifications
    const recent_notifications = [];
    const older_notifications = [];

    fetchNotifications.forEach((item) => {
      const formattedNotification = {
        notification_id: item._id,
        action: item.action,
        action_json: item.action_json,
        title: item.title,
        message: item.message,
        icon: item.icon,
        read_status: item.read_status,
        createtime: helper.formatTime(item.createdAt),
      };

      if (new Date(item.createdAt) >= oneWeekAgo) {
        recent_notifications.push(formattedNotification);
      } else {
        older_notifications.push(formattedNotification);
      }
    });

    // 🔹 Get pagination data using helper
    const paginationData = helper.getPagingData(
      totalCount,
      {
        recent_notifications,
        older_notifications
      },
      pages,
      limits
    );

    // 🔹 Final response
    const result = {
      recent_notifications: paginationData.item.recent_notifications,
      older_notifications: paginationData.item.older_notifications,
      total_records: paginationData.totalItems,
      total_pages: paginationData.totalPages,
      current_page: paginationData.currentPage
    };

    return apiResponse.ok(res, result, messages.NOTIFICATION_FOUND);
  } catch (error) {
    return apiResponse.serverError(res, messages.SERVER_ERROR, error.message);
  }
};

//  delete single notification
const deleteSingleNotification = async (req, res) => {
  const user_id = req.userId;
  const { notification_id } = req.body;
  try {
    const check = await Notification.findOneAndUpdate(
      { _id: notification_id, other_user_id: user_id },
      { $set: { is_deleted: 1 } },
      { new: true }
    );
    if (!check)
      return apiResponse.notFoundResponse(
        res,
        messages.NOTIFICATION_NOT_FOUND
      );
    return apiResponse.ok(res, {}, messages.NOTIFICATION_DELETED);
  } catch (error) {
    return apiResponse.serverError(res, messages.SERVER_ERROR, error.message);
  }
}

// clear all notification
const clearAllNotification = async (req, res) => {
  const user_id = req.userId;
  try {
    const notifications = await Notification.find({ other_user_id: user_id, is_deleted: 0 });

    if (!notifications.length)
      return apiResponse.notFoundResponse(res, messages.NO_NOTIFICATION_FOUND);
    const result = await Notification.updateMany(
      {
        other_user_id: user_id,
        is_deleted: 0,
      },
      {
        $set: { is_deleted: 1 },
      }
    );
    return apiResponse.notificationResponse(res, messages.ALL_NOTIFICATIONS_DELETED);
  } catch (error) {
    console.error("Error in clearAllNotification:", error);
    return apiResponse.serverError(res, messages.SERVER_ERROR, error.message);
  }
};


export default {
  updateNotificationStatus, getAllNotification, deleteSingleNotification, clearAllNotification,
};
