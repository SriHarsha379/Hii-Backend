import jwt from "jsonwebtoken";
import userManager from "../utility/userSocketManager.js";
import { Conversation, Chat, UserBlock, User, Friendship } from "../model/index.js";
import mongoose from "mongoose";
import helper from "../utility/helper.js"
import sendNotification from "../utility/notification.js";

/* ==========================================================
   CACHED USER → CONVERSATION USERS
========================================================== */
const userConversationCache = new Map();

async function loadConversationUsers(userId) {

  const cacheKey = `${userId}`;

  if (userConversationCache.has(cacheKey)) {
    return userConversationCache.get(cacheKey);
  }

  const conversations = await Conversation.find({
    $or: [
      { sender_id: userId },
      { receiver_id: userId }
    ],
  })
    .select("_id sender_id receiver_id")
    .lean();

  const users = new Map(); // avoid duplicates

  for (const c of conversations) {

    const isSender = c.sender_id.toString() === userId.toString();
    const otherId = isSender ? c.receiver_id : c.sender_id;

    users.set(otherId.toString(), {
      userId: otherId.toString(),
      conversation_id: c._id.toString()   // ✅ added
    });
  }

  const result = Array.from(users.values());

  userConversationCache.set(cacheKey, result);

  return result;
}

async function isUserBlockedBetween(senderId, receiverId) {
  if (!senderId || !receiverId) return false;

  const blocked = await UserBlock.exists({
    is_blocked: true,
    $or: [
      { blocked_by: senderId, blocked_user: receiverId },
      { blocked_by: receiverId, blocked_user: senderId }
    ]
  });

  return Boolean(blocked);
}



/* ==========================================================
   SOCKET CONFIG
========================================================== */
function configureSocket(io) {
  const WORLD_ROOM = "world_chat";

  /* ---------------- TOKEN VALIDATION ---------------- */
  io.use((socket, next) => {
    const token = socket.handshake?.query?.token;
    if (!token) return next(new Error("Token required"));

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      //   socket.user_type = decoded.role
      next();
    } catch {
      next(new Error("Invalid token"));
    }
  });

  /* ---------------- CONNECTION ---------------- */
  io.on("connection", async (socket) => {

    const userId = socket.userId;

    socket.emit("connected", {
      socketId: socket.id,
      userId: socket.userId,
      status: 200,
    });

    /* Track online user */
    userManager.addUser(socket.id, userId, socket.user_type);



    /* ======================================================
       ONE-TO-ONE CHAT
    ====================================================== */



    socket.on("join_chat", async ({ user_id, conversation_id }) => {
      if (!user_id || !conversation_id) return;
      userManager.addActiveChat(user_id, conversation_id, socket.id);
      // send online    message 

      /* Notify related users (PRIVATE CHAT) */
      const relatedUsers = await loadConversationUsers(userId);
      for (const user of relatedUsers) {
        const activeUser = userManager.getActiveUserById(user.userId);
        // ✅ If user is online
        if (activeUser) {

          io.to(activeUser.socketId).emit("user_status", {
            userId: userId,
            // conversation_id: user.conversation_id,
            status: "online"
          });
        }
        // // ❌ If user is offline
        // else {

        //     io.emit("user_status", {
        //     userId: user.userId,
        //     conversation_id: user.conversation_id,
        //     status: "offline"
        //    });

        // }
      }
    });

    socket.on("leave_chat", async ({ user_id }) => {
      if (!user_id) return;
      userManager.removeActiveChat(user_id);

      // check offline user 
      const relatedUsers = await loadConversationUsers(userId);
      for (const user of relatedUsers) {
        const activeUser = userManager.getActiveUserById(user.userId);
        // ✅ If user is online
        if (activeUser) {

          io.to(activeUser.socketId).emit("user_status", {
            userId: userId,
            // conversation_id: user.conversation_id,
            status: "offline"
          });
        }
      }
    });


    socket.on('user_status', ({ user_id, check_user_id }) => {
      const activeUser = userManager.getActiveUserById(user_id);
      const checked = userManager.getActiveUserById(check_user_id);
      if (activeUser && checked) {
        io.to(activeUser.socketId).emit("user_status", {
          userId: check_user_id,
          // conversation_id: user.conversation_id,
          status: "online"
        });
      }
      else {
        if(activeUser && checked){
       io.to(activeUser.socketId).emit("user_status", {
          userId: check_user_id,
          // conversation_id: user.conversation_id,
          status: "offline"
        });
        }
      
      }


    })

    /* ✅ PRIVATE MESSAGE (FIXED – NOT GLOBAL) */
    socket.on("send_message", async (data) => {
      console.log('-------------send_message-', data);
      if (!data.sender_id || !data.receiver_id) return;
      if (data.sender_id?.toString() !== userId?.toString()) return;

      const hasBlockedRelation = await isUserBlockedBetween(
        data.sender_id,
        data.receiver_id
      );

      const shouldDeliverToReceiver = !hasBlockedRelation;
      const { date, time } = helper.dataHelperchat(new Date());

      const sender_user = userManager.getUserById(data.sender_id);
      const receive_user = userManager.getUserById(data.receiver_id);
      const isReceiverOnline = Boolean(receive_user && receive_user.socketId);
      const is_onchat_screen = userManager.getActiveUserById(data.receiver_id);

      let newObj = {
        sender_id: data.sender_id,
        receiver_id: data.receiver_id,
        conversation_id: data.conversation_id || null,
        receiver_model: data.receiver_model,
        sender_model: data.sender_model,
        receiver_image: data.receiver_image,
        receiver_name: data.receiver_name,
        sender_name: data.sender_name,
        sender_image: data.sender_image,
        message: data.message || "",
        type: data.type || "message",
        files: data.files || [],
        is_event: Boolean(data.is_event),
        approve_event: Boolean(data.approve_event),
        reject_event: Boolean(data.reject_event),
        event_object:
          data.event_object && typeof data.event_object === "object"
            ? data.event_object
            : {},
        is_seen: Boolean(is_onchat_screen && shouldDeliverToReceiver),
        date,
        time,
        is_user :data.is_user ==true ?true:false
      };

      // Emit quickly so UI is not delayed by notification or DB work.
      if (shouldDeliverToReceiver && isReceiverOnline) {
        io.to(receive_user.socketId).emit("receive_message", { newObj });
      }

      if (sender_user && sender_user.socketId) {
        io.to(sender_user.socketId).emit("send_message", { newObj });
      }

      let conversation_data = {};
      conversation_data.last_message = data.message;
      conversation_data.sender_id = data.sender_id;
      conversation_data.receiver_id = data.receiver_id;
      conversation_data.sender_model = data.sender_model;
      conversation_data.receiver_image = data.receiver_image;
      conversation_data.sender_image = data.sender_image;
      conversation_data.receiver_name = data.receiver_name;
      conversation_data.sender_name = data.sender_name;
      conversation_data.receiver_model = data.receiver_model;
      conversation_data.message_type = data.type;
      conversation_data.conversation_id = data.conversation_id;
      conversation_data.date = date;
      conversation_data.time = time;

      // Fire-and-forget notification for offline receiver.
      if (
        shouldDeliverToReceiver &&
        !isReceiverOnline &&
        data.sender_model == "User" &&
        data.receiver_model == "User"
      ) {
        User.findById(data.receiver_id)
          .select("player_id msg_chats_notify")
          .lean()
          .then((receiverUser) => {
            if (receiverUser?.msg_chats_notify === false) return;
            return sendNotification(
              "new_message",
              receiverUser?.player_id,
              {
                user_id: data.receiver_id,
                other_user_id: data.sender_id,
                sender_name: data.sender_name || "Someone",
                sender_image: data.sender_image || "",
                user_name: data.sender_name || "Someone",
                user_image: data.sender_image || "",
                conversation_id: data.conversation_id || "",
                message_preview: data.message || "",
                action: "new_message",
                isDb: false
              }
            );
          })
          .catch((error) => {
            console.log("sendNotification error:", error);
          });
      }

      // Save and update last conversation asynchronously.
      sendMessage(newObj, conversation_data)
        .then(async (lastMessage) => {
          conversation_data.conversation_id = lastMessage.conversation_id;

          if (lastMessage?.status) {
            const receiverOnChat = userManager.getActiveUserById(data.receiver_id);
            let unreadCount = 0;

            if (!receiverOnChat) {
              unreadCount = await Chat.countDocuments({
                conversation_id: conversation_data.conversation_id,
                receiver_id: data.receiver_id,
                is_seen: false
              });
            }

            conversation_data.is_seen = Boolean(newObj.is_seen);
            conversation_data.isseen = Boolean(newObj.is_seen);

            if (sender_user && sender_user.socketId) {
              io.to(sender_user.socketId).emit("last_conversation", {
                conversation_data: { ...conversation_data, unreadCount: 0 }
              });
            }

            if (shouldDeliverToReceiver && receive_user && receive_user.socketId) {
              io.to(receive_user.socketId).emit("last_conversation", {
                conversation_data: { ...conversation_data, unreadCount }
              });
            }
          }
        })
        .catch((error) => {
          console.log("sendMessage pipeline error:", error);
        });
    });
    //=============================Get message Emit===========================
    socket.on("get_message_list", async (data) => {
      if (!data.conversation_id) return;
        let  result = await getMessage(data)
        console.log('------------------message',result);
            const user = userManager.getUserById(data.user_id);
            if( user && user.socketId) io.to(user.socketId).emit("get_message_list", result);
    });

    //===========================Get message Emit end====================================

    //=============================Get get_conversation_list Emit===========================
    socket.on("get_conversation_list", async (data) => {

      if (!data.user_id) return;
        let  result = await getConversation(data)
        console.log('----------------result',result);
            const user = userManager.getUserById(data.user_id);
            if( user && user.socketId) io.to(user.socketId).emit("get_conversation_list", result);
    });

    //===========================Get get_conversation_list Emit end====================================

    //==============================Delete Message Emit ============================
    socket.on("message_deleted", async (data) => {
      if (!data.user_id) return;
            const user = userManager.getUserById(data.user_id);
            // call function 
            console.log('==================message_deleted',data);
            let  result  = await   deleteMessage(data)
            if(user.socketId) io.to(user.socketId).emit("delete_message", result);
    });
    //==============================Delete Message Emit End=======================

    
    //==============================recendFirendsList Message Emit ============================
    socket.on("recend_firends_list", async (data) => {
      if (!data.user_id) return;
            const user = userManager.getUserById(data.user_id);
            // call function 
            console.log('==================message_deleted',data);
            let  result  = await   recendFirendsList(data)
            if(user.socketId) io.to(user.socketId).emit("recend_firends_list", result);
    });
    //==============================recendFirendsList Message Emit End=======================

    /* Typing indicator (private) */
    socket.on("typing_start", ({ toUserId }) => {
      const target = userManager.getUserById(toUserId);
      if (target) {
        io.to(target.socketId).emit("typing", { userId });
      }
    });

    socket.on("typing_stop", ({ toUserId }) => {
      const target = userManager.getUserById(toUserId);
      if (target) {
        io.to(target.socketId).emit("stop_typing", { userId });
      }
    });
    //=================================||======================================== send  booking to  drive 
   //==============================Delete Message Emit ============================
    socket.on("event_update", async (data) => {
      if (!data.user_id) return;
            const user = userManager.getUserById(data.user_id);
            // call function 
            console.log('==================event_update',data);
            let  result  = await   eventApprove(data)
         if(user){
             if(user.socketId) io.to(user.socketId).emit("event_update", result);
         }
    });



    //===========================Booking Emit  Start ===================================================
    socket.on("stop_typing", ({ toUserId }) => {
      const target = userManager.getUserById(toUserId);
      if (target) {
        io.to(target.socketId).emit("stop_typing", { userId });
      }
    });



    /* ======================================================
           DISCONNECT
        ====================================================== */
    socket.on("disconnect", async () => {
      const removed = userManager.removeUser(socket.id)?.removedUser;


      if (!removed) return;

      const relatedUsers = await loadConversationUsers(userId);

      for (const uid of relatedUsers) {
        const target = userManager.removeActiveChat(uid);
        // send meit  for offline 
      }
    });
  });

  configureSocket.io = io;
}

// chat  code 

const sendMessage = async (data, obj) => {
  try {

    let is_first = false
    let conversation_id = obj?.conversation_id
    // Find or create conversation
    let conversation = conversation_id
      ? await Conversation.findById(conversation_id)
      : null;

    if (!conversation) {
      is_first = true
      conversation = new Conversation({
        sender_id: data.sender_id,
        receiver_id: data.receiver_id,
        sender_model: data.sender_model,
        receiver_model: data.receiver_model,
        is_user: data.is_user,
        last_message: data.message,
        message_type: data.type
      });
    } else {
      is_first = false
      // Update existing conversation
      Object.assign(conversation, {
        last_message: data.message,
        
        sender_id: data.sender_id,
        receiver_id: data.receiver_id,
        sender_model: data.sender_model,
        receiver_model: data.receiver_model,
         is_user: data.is_user,
        message_type: data.type
      });
    }

    // Save conversation and create chat in parallel
    const [savedConversation] = await Promise.all([
      conversation.save(),
      Chat.create({ ...data, conversation_id: conversation._id })
    ]);

    return {
      status: true,
      message: "Message sent",
      conversation_id: savedConversation._id,
      is_first: is_first
    };

  } catch (error) {
    console.error('Send message error:', error);
    return { status: false, message: "Failed to send message" };
  }
};

const getMessage = async (data) => {
  try {
    const { conversation_id, page = 1, limit = 30, user_id } = data;
    if (!conversation_id) return { messages: [], block_status: false };

    const skip = (page - 1) * limit;

    const conversation = await Conversation.findById(conversation_id)
      .select("sender_id receiver_id")
      .lean();

    let block_status = false;
    let blocked_by_me = false;
    let blocked_by_user = false;
    let blocked_user_id = null;

    if (conversation && user_id) {
      const isSender =
        conversation.sender_id?.toString() === user_id?.toString();

      const otherUserId = isSender
        ? conversation.receiver_id
        : conversation.sender_id;

      blocked_user_id = otherUserId ? otherUserId.toString() : null;

      if (otherUserId) {
        const [blockedByMe, blockedByUser] = await Promise.all([
          UserBlock.exists({
            blocked_by: user_id,
            blocked_user: otherUserId,
            is_blocked: true,
          }),
          UserBlock.exists({
            blocked_by: otherUserId,
            blocked_user: user_id,
            is_blocked: true,
          }),
        ]);

        blocked_by_me = Boolean(blockedByMe);
        blocked_by_user = Boolean(blockedByUser);
        block_status = blocked_by_me || blocked_by_user;
      }
    }

    // 🚫 If blocked → return empty messages
    if (block_status) {
      return {
        messages: [],
        block_status,
        blocked_by_me,
        blocked_by_user,
        blocked_user_id,
      };
    }

    // ✅ Mark messages as seen
    await Chat.updateMany(
      {
        conversation_id,
        sender_id: { $ne: user_id },
        is_seen: false,
        delete_user_id: { $ne: user_id },
      },
      { $set: { is_seen: true } }
    );

    const messages = await Chat.find({
      conversation_id,
      delete_user_id: { $ne: user_id },
    })
      .populate("sender_id", "name email profile_image")
      .populate("receiver_id", "name email profile_image")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return {
      messages,
      block_status,
      blocked_by_me,
      blocked_by_user,
      blocked_user_id,
    };
  } catch (error) {
    console.log("---------------------error", error);
    return { messages: [], block_status: false };
  }
};

const deleteMessage = async (data) => {
  try {
    const { message_id, user_id } = data;

    if (!message_id || !user_id) return;
    // update delete_user_id
    const deletedMsg = await Chat.findByIdAndUpdate(
      message_id,
      { delete_user_id: user_id },
      { new: true }
    );
    return deletedMsg


  } catch (error) {
    console.log("❌ deleteMessage error:", error);
  }
};
let getConversation = async ({ page = 1, limit = 30, user_id ,user_type}) => {
  try {
    const skip = (page - 1) * limit;
    const userObjectId = new mongoose.Types.ObjectId(user_id);
    // const blockRelations = await UserBlock.find({
    //   is_blocked: true,
    //   $or: [
    //     { blocked_by: userObjectId },
    //     { blocked_user: userObjectId }
    //   ]
    // })
    //   .select("blocked_by blocked_user")
    //   .lean();

    // const excludedIds = [];
    // for (const b of blockRelations) {
    //   if (b.blocked_by.toString() === userObjectId.toString()) {
    //     excludedIds.push(b.blocked_user);
    //   } else {
    //     excludedIds.push(b.blocked_by);
    //   }
    // }
    let is_user =false
if(user_type =="User") {
is_user =true
}
    // 1️⃣ Get Conversations
    const conversations = await Conversation.find({is_user:is_user,
      $and: [
        {
          $or: [
            { sender_id: userObjectId },
            { receiver_id: userObjectId },
          ],
        },
        // {
        //   $nor: [
        //     { sender_id: userObjectId, receiver_id: { $in: excludedIds } },
        //     { receiver_id: userObjectId, sender_id: { $in: excludedIds } }
        //   ]
        // }
      ],
    })
      .populate("sender_id", "name email profile_image")
      .populate("receiver_id", "name email profile_image")
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean({ virtuals: true }); // ✅ enable virtuals
console.log('----------conversations',conversations);
    // ✅ Add unread count in each conversation
    const conversationIds = conversations.map((convo) => convo._id);
    let unreadCountMap = new Map();

    if (conversationIds.length) {
      const unreadCounts = await Chat.aggregate([
        {
          $match: {
            conversation_id: { $in: conversationIds },
            receiver_id: userObjectId,
            is_seen: false,
          },
        },
        {
          $group: {
            _id: "$conversation_id",
            count: { $sum: 1 },
          },
        },
      ]);

        unreadCountMap = new Map(
        unreadCounts.map((item) => [item._id.toString(), item.count])
      );
    }

    for (const convo of conversations) {
      convo.unreadCount = unreadCountMap.get(convo._id.toString()) || 0;
    }
console.log('conversations',conversations);
    return conversations;

  } catch (error) {
    console.log("Conversation Error:", error);
    return [];
  }
};

const recendFirendsList = async (data) => {
  try {
    const user_id = data.user_id;

    // last 48 hours time
    const last48Hours = new Date(Date.now() - 48 * 60 * 60 * 1000);

    const friends = await Friendship.find({
      status: "accepted",
      createdAt: { $gte: last48Hours },
      $or: [
        { user_id_1: user_id },
        { user_id_2: user_id }
      ]
    })
      .populate("user_id_1", "name profile_image")
      .populate("user_id_2", "name profile_image");

    const result = [];

    for (const f of friends) {

      const friend =
        f.user_id_1._id.toString() === user_id.toString()
          ? f.user_id_2
          : f.user_id_1;

      const conversation = await Conversation.findOne({
        $or: [
          { sender_id: user_id, receiver_id: friend._id },
          { sender_id: friend._id, receiver_id: user_id }
        ]
      });

      result.push({
        friend_id: friend._id,
        name: friend.name,
        image: friend.profile_image,
        conversation_id: conversation ? conversation._id : null,
      });
    }

  return result
  } catch (error) {
    console.log("Error:", error);

  }
};

const eventApprove = async (data) => {
  try {
    const { message_id, user_id, is_approve } = data;

    if (!message_id || !user_id || typeof is_approve !== "boolean") return;

    const updateData = is_approve
      ? { approve_event: true, reject_event: false }
      : { approve_event: false, reject_event: true };

    const update = await Chat.findByIdAndUpdate(
      message_id,
      updateData,
      { new: true }
    );

    return update;

  } catch (error) {
    console.log("❌ update error:", error);
  }
};
export default configureSocket;
