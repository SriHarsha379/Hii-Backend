import { Blog } from "../../model/index.js";
import apiResponse from "../../utility/apiResponse.js";
import messages from "../../utility/messages.js";
import helper from "../../utility/helper.js";
import { User } from "../../model/index.js";
import sendNotification from "../../utility/notification.js"; // 

// ✅ Add Blog
const addBlog = async (req, res) => {
    try {
        // If an image is uploaded, save the filename in request body
        if (req.file) req.body.image = req.file.filename;

        // Create blog in MongoDB
        const data = await Blog.create(req.body);

        // 📱 Send Push Notifications in the background
        (async () => {
            try {
                // Fetch all eligible users who opted for blog notifications
                const users = await User.find({
                    is_deleted: false,
                    is_profile_completed: true,
                    is_verified: true,
                    notification_blog_post: true
                }).select("_id player_id").lean();

                if (!users || users.length === 0) {
                    console.log("No users found for blog notification");
                    return;
                }

                const action = "New Blog";
                const title = "HII Services";
                const message = `New Blog has been added: ${data.title}`;
                const action_data = { action_id: data._id, type: "blog" };

                // Send notifications in parallel to all users
                await Promise.all(
                    users.map(user =>
                        sendNotification(
                            process.env.SYSTEM_USER_ID || '68bfc207763a6ea41378177a', // sender/system ID
                            user._id,      // target user ID
                            user.player_id, // device/player ID

                            title,
                            message,
                            action,
                            action_data
                        ).catch(err => {
                            console.error(`Notification failed for user ${user._id}:`, err);
                        })
                    )
                );

                console.log(`Push notifications sent to ${users.length} users`);
            } catch (notificationError) {
                console.error('Error sending blog notifications:', notificationError);
            }
        })();

        // ✅ Send response to client immediately
        return apiResponse.ok(res, data, messages.BLOG_CREATED);

    } catch (err) {
        return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
    }
};


// ✅ Get All Blogs
const getAllBlogs = async (req, res) => {
    try {
        const blogs = await Blog.find({ is_active: true }).sort({ createdAt: -1 });
        return apiResponse.ok(res, blogs, messages.SUCCESS);
    } catch (err) {
        return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
    }
};
// ✅ Get Single Blog by ID
const getBlogById = async (req, res) => {
    try {
        const { id } = req.params;
        const blog = await Blog.findById(id);
        if (!blog) return apiResponse.notFoundResponse(res, messages.NOT_FOUND);
        return apiResponse.ok(res, blog, messages.SUCCESS);
    } catch (err) {
        return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
    }
};

const updateBlog = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, author_name } = req.body;

        const blog = await Blog.findById(id);
        if (!blog) return apiResponse.notFoundResponse(res, messages.BLOG_NOT_FOUND);

        const updateData = {};
        if (title) updateData.title = title;
        if (description) updateData.description = description;
        if (author_name) updateData.author_name = author_name;

        // Agar nayi image mili hai to hi update kare
        if (req.file) {
            if (blog.image && blog.image !== req.file.filename) {
                helper.removeOldImage(blog.image); // purani delete karo
            }
            updateData.image = req.file.filename;
        }

        const updatedBlog = await Blog.findByIdAndUpdate(
            id,
            { $set: updateData },
            { new: true }
        );

        return apiResponse.ok(res, updatedBlog, messages.BLOG_UPDATED);
    } catch (err) {
        return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
    }
};


// ✅ Delete Blog (soft delete)
const deleteBlog = async (req, res) => {
    try {
        const { id } = req.params;
        const blog = await Blog.findById(id);
        if (!blog) return apiResponse.notFoundResponse(res, messages.BLOG_NOT_FOUND);

        blog.is_active = false; // soft delete
        await blog.save();

        return apiResponse.ok(res, blog, messages.BLOG_DELETED);
    } catch (err) {
        return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
    }
};


export default { addBlog, getAllBlogs, getBlogById, updateBlog, deleteBlog };
