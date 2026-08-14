import admin from '../config/firebase_config.js';
import { Notification } from '../model/index.js';
import dotenv from "dotenv";
dotenv.config()
const sendNotification = async (type, playerId, extraData = {}, badge = 0) => {
  let title = "Hii";
  let message = "You have a new notification";
  let icon = null;
  switch (type) {
    case 'welcome':
      title = 'Welcome';
      message = '🎉 You are in! Welcome to Hii ';
      icon = '🎉'
      break;

    case 'someone_liked_you':
      title = 'Someone Liked You ❤️';
      message = `${extraData.full_name} liked your profile. Check it out 👀`;
      icon = '❤️';
      break;

    case 'its_match':
      title = "It's a Match 🎉";
      message = `You and ${extraData.full_name} liked each other! Start chatting now 💬`;
      icon = '🔥';
      break;

    case 'new_message':
      title = `${extraData.sender_name || "New Message"}`;
      message = extraData.message_preview || "You have a new message";
      icon = '💬';
      break;

    case 'venue_booking_confirmed':
      title = 'Ticket Confirmed 🎟️';
      message = `Your booking has been confirmed successfully.`;
      icon = '🎟️';
      break;

    case 'event_booking_confirmed':
      title = 'Ticket Confirmed 🎟️';
      message = `Your booking has been confirmed successfully.`;
      icon = '🎟️';
      break;

    case 'new_booking':
      message = `📢 New booking received. Booking id #${extraData.booking_code}!`;
      break;

    case 'booking_cancelled':
      message = `#${extraData.booking_code} Booking cancelled by the customer.`
      break;


    case 'booking_accepted':
      message = `Booking accepted by the driver.`
      break;


    case 'driver_arrived':
      message = `Driver arrived on the pickup location.`
      break;

    case 'booking_picked':
      message = `Item picked by driver.`
      break;


    case 'booking_delivered':
      message = `Item successfully delivered on the drop location.`
      break;

    case 'broadcast':
      message = `📢 Broadcast from ${extraData?.fullName || 'Admin'}
        Title: "${extraData?.title}"
        Message: ${extraData?.message || 'You got a new announcement'}`;
      break;


    case 'account_approved':
      message = '✅ Your account has been approved by admin. You can now start using the app.';
      break;

    case 'account_rejected':
      message = '❌ Your account has been rejected by admin. Please contact support.';
      break;


    case 'payment_received':
      message = `💰 Payment received for your booking (Booking: ${extraData.booking_code})`;
      break;

    case 'withdrawal_approved':
      message = `✅ Your withdrawal request has been approved (Amount: ₹${extraData.amount}, TXN: ${extraData.transaction_id})`;
      break;

    case 'withdrawal_rejected':
      message = `❌ Your withdrawal request has been rejected (Amount: ₹${extraData.amount}). Reason: ${extraData.reject_reason}`;
      break;

    case 'profile_completion':
      title = extraData.percentage >= 100 ? 'Profile Complete 🎉' : 'Your Profile is Almost Ready ✨';
      message = extraData.percentage >= 100
        ? `Nice work — your profile is 100% complete!`
        : `Your profile is ${extraData.percentage}% complete.${extraData.next_step ? ` ${extraData.next_step} to finish it up.` : ''}`;
      icon = '✨';
      break;

    default:
      message = '🔔 You have a new notification!';
  }

  const finalExtraData = {
    ...extraData,
    type,
    action: extraData.action || type,
  };

  // Pick receiver user id for DB row
  const receiverUserId =
    extraData.user_id ||
    extraData.receiver_id ||
    extraData.target_user_id ||
    extraData.senderId ||
    null;

  // Message pushes should not appear in notification center.
  if (type !== "new_message") {
    await Notification.create({
      user_id: receiverUserId,
      other_user_id: extraData.other_user_id || null,
      action: finalExtraData.action,
      action_json: finalExtraData,
      title: title || "",
      message: message || "",
      icon: icon || null,
      read_status: 0,
      is_deleted: 0,
    });
  }

  if (!playerId) {
    console.log("❌ No FCM token found");
    return { success: false, error: "No FCM token" };
  }

  try {
    const isSilentMessage = type === "new_message";
    const messagePayload = {
      token: String(playerId),
      ...(isSilentMessage
        ? {}
        : {
          notification: {
            title: String(title || "Hii"),
            body: String(message || "You have a new notification"),
          },
        }),
      data: Object.fromEntries(
        Object.entries({
          title: String(title || "Hii"),
          body: String(message || "You have a new notification"),
          message: String(message || "You have a new notification"),
          icon: String(icon || ""),
          badge: String(badge || 0),
          ...finalExtraData,
        }).map(([k, v]) => [k, String(v ?? "")])
      ),
      android: {
        priority: "high",
      },
      apns: {
        headers: {
          "apns-priority": isSilentMessage ? "5" : "10",
          "apns-push-type": isSilentMessage ? "background" : "alert",
        },
        payload: {
          aps: isSilentMessage
            ? { contentAvailable: true }
            : {
              alert: {
                title: String(title || ""),
                body: String(message || ""),
              },
              sound: "default",
              badge: Number(badge || 0),
            },
        },
      },
    };

    // Send ONLY ONCE
    const response = await admin.messaging().send(messagePayload);
    console.log("🚀 Firebase Push Sent:", response);

    return { success: true, data: response };
  } catch (error) {
    console.log("❌ Firebase Push Failed:", error.message);
    return { success: false, error: error.message };
  }
};

export default sendNotification;