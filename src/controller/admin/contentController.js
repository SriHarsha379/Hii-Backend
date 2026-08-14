import { Content } from "../../model/index.js";
import apiResponse from "../../utility/apiResponse.js";
import messages from "../../utility/messages.js";

// ✅ Get All Content
const getAllContent = async (req, res) => {
    try {
        const contents = await Content.find({ delete_flag: 0 }).sort({ createdAt: -1 });
        return apiResponse.ok(res, contents, messages.SUCCESS);
    } catch (err) {
        console.error('Error fetching content:', err);
        return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
    }
};

// ✅ Update Content by content_type
const updateContentByType = async (req, res) => {
    try {
        const { content_type, content } = req.body;

        // Enhanced validation
        if (content_type === undefined || content_type === null) {
            return apiResponse.badRequest(res, messages.CONTENT_TYPE_REQUIRED);
        }

        if (content === undefined || content === null) {
            return apiResponse.badRequest(res, "Content is required");
        }

        const existingContent = await Content.findOne({ content_type, delete_flag: 0 });

        if (!existingContent) {
            return apiResponse.notFoundResponse(res, messages.CONTENT_NOT_FOUND);
        }

        existingContent.content = content;
        existingContent.updatedAt = new Date();
        
        await existingContent.save();
        
        return apiResponse.ok(res, existingContent, messages.CONTENT_UPDATED);
    } catch (err) {
        console.error('Error updating content:', err);
        return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
    }
};

// ✅ Create New Content
const createContent = async (req, res) => {
    try {
        const { content_type, content } = req.body;

        if (content_type === undefined || content_type === null) {
            return apiResponse.badRequest(res, "Content type is required");
        }

        const exists = await Content.findOne({ content_type, delete_flag: 0 });

        if (exists) {
            return apiResponse.badRequest(res, "Content for this type already exists");
        }

        const newContent = await Content.create({
            content_type,
            content,
        });

        return apiResponse.ok(res, newContent, "Content created successfully");
    } catch (err) {
        console.error("Error creating content:", err);
        return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
    }
};


export default { getAllContent, updateContentByType, createContent };