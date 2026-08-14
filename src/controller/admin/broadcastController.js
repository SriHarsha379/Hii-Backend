import { User } from "../../model/index.js";
import apiResponse from "../../utility/apiResponse.js";
import messages from "../../utility/messages.js";
import sendNotification from "../../utility/notification.js"; // 

// ✅ Get All Users (only id + name, non-deleted)
const getAllUsers = async (req, res) => {
    try {
        const users = await User.find({
            is_deleted: false,
            is_profile_completed: true,
            is_verified: true
        })
            .select("first_name last_name _id")
            .sort({ createdAt: -1 });

        const usersWithFullName = users.map(user => ({
            id: user._id,
            name: `${user.first_name || ""} ${user.last_name || ""}`.trim()
        }));

        return apiResponse.ok(res, usersWithFullName, messages.USER_LIST_FETCHED);
    } catch (err) {
        return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
    }
};

// ✅ Send Broadcast Message (Selected / All)
const sendBroadcastMessageAllUser = async (req, res) => {
    const { title, message, userType, select_arr } = req.body;
    const senderId = req.user.id; // Admin/System ID

    try {
        let users = [];

        if (userType === "user") {
            users = await User.find({
                _id: { $in: select_arr },
                is_deleted: false,
                is_profile_completed: true,
                is_verified: true
            }).select("first_name last_name _id player_id").lean();
        } else if (userType === "all") {
            users = await User.find({
                is_deleted: false,
                is_profile_completed: true,
                is_verified: true
            }).select("first_name last_name _id player_id").lean();
        }

        if (!users || users.length === 0) {
            return apiResponse.ok(res, [], messages.USER_NOT_FOUND);
        }

        for (let user of users) {

            if (!user.player_id) continue;

            await sendNotification(
                "broadcast",                 // ✅ type
                user.player_id,              // ✅ playerId
                {
                    senderId: process.env.SYSTEM_USER_ID || '68bfc207763a6ea41378177a',
                    other_user_id: user._id,
                    action: "Broadcast",
                    title: title,
                    message: message,
                    fullName: "Admin"
                },
                0 // ✅ userType (0 = customer)
            );
        }

        return apiResponse.ok(res, messages.BROADCAST_SENT_SUCESSFULLY);

    } catch (error) {
        console.error("Broadcast error:", error);
        return apiResponse.serverError(res, messages.SERVER_ERROR, error.message);
    }
};


export default { getAllUsers, sendBroadcastMessageAllUser };
