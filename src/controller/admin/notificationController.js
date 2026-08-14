import { Vendor, Notification, } from "../../model/index.js";
import apiResponse from "../../utility/apiResponse.js";
import messages from "../../utility/messages.js";
import helper from "../../utility/helper.js";
import dotenv from "dotenv";
dotenv.config();


const sendVendorNotification = async (req, res) => {
    try {
        const { title, message, select_arr, userType } = req.body;

        if (!title || !message) {
            return apiResponse.badRequest(res, "Title and message required");
        }

        let vendors = [];

        // 🔹 ALL VENDORS
        if (userType === "all") {
            vendors = await Vendor.find({ is_deleted: false, is_active: true }).select("_id");
        }

        // 🔹 SELECTED VENDORS
        else if (userType === "vendor") {
            if (!select_arr || !select_arr.length) {
                return apiResponse.badRequest(res, "Select at least one vendor");
            }

            vendors = await Vendor.find({
                _id: { $in: select_arr },
                is_deleted: false
            }).select("_id");
        }

        if (!vendors.length) {
            return apiResponse.notFoundResponse(res, "No vendors found");
        }

        // 🔥 Bulk Insert Notifications
        const notifications = vendors.map(vendor => ({
            vendor_user_id: vendor._id,
            other_user_id: null,
            title,
            message,
            read_status: 0,
            action: "broadcast"
        }));

        await Notification.insertMany(notifications);

        return apiResponse.ok(res, {}, "Notification sent to vendors");

    } catch (error) {
        return apiResponse.serverError(res, error.message);
    }
};


const getVendorNotifications = async (req, res) => {
    try {
        const vendor_id = req.vendor._id;
        const { page, limit } = req.query;

        const { limits, offset, pages } = helper.getPagination(page, limit);
        console.log("+++++++++++++++++++++++++++++", vendor_id)
        // 🔹 Count
        const totalCount = await Notification.countDocuments({
            vendor_user_id: vendor_id,
            is_deleted: 0
        });

        // 🔹 Fetch
        const notifications = await Notification.find({
            vendor_user_id: vendor_id,
            is_deleted: 0
        })
            .sort({ createdAt: -1 })
            .skip(offset)
            .limit(limits);

        // 🔹 Mark all as read
        await Notification.updateMany(
            {
                vendor_user_id: vendor_id,
                is_deleted: 0,
                read_status: 0
            },
            { $set: { read_status: 1 } }
        );

        // 🔹 Format response
        const formatted = notifications.map(item => ({
            notification_id: item._id,
            title: item.title,
            message: item.message,
            action: item.action,
            action_json: item.action_json,
            icon: "hii_dark_logo.png",
            read_status: item.read_status,
            createdAt: helper.formatTime(item.createdAt)
        }));

        return apiResponse.ok(res, {
            notifications: formatted,
            total_records: totalCount,
            total_pages: Math.ceil(totalCount / limit),
            current_page: Number(page)
        }, "Vendor notifications fetched");

    } catch (error) {
        return apiResponse.serverError(res, error.message);
    }
};

const getVendorUnreadCount = async (req, res) => {
    try {
        const vendor_id = req.vendor._id;

        if (!vendor_id) {
            return apiResponse.badRequest(res, "Vendor not found");
        }

        const unreadCount = await Notification.countDocuments({
            vendor_user_id: vendor_id,
            is_deleted: 0,
            read_status: 0
        });

        return apiResponse.ok(res, {
            unread_count: unreadCount
        }, "Unread notification count fetched");

    } catch (error) {
        return apiResponse.serverError(res, error.message);
    }
};

export default { sendVendorNotification, getVendorNotifications, getVendorUnreadCount };