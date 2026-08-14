import { VibeCheckQuestion } from "../../model/index.js";
import apiResponse from "../../utility/apiResponse.js";
import messages from "../../utility/messages.js";


// Helper to escape special regex characters
const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// ✅ Create VibeCheck Question
const createVibeCheckQuestion = async (req, res) => {
    try {
        let { question, description } = req.body;

        // Trim whitespaces
        question = question?.trim();
        description = description?.trim();

        // Validate empty/blank
        if (!question) {
            return apiResponse.badRequest(res, "Question cannot be empty");
        }

        if (!description) {
            return apiResponse.badRequest(res, "Description cannot be empty");
        }

        // Escape special characters in question for regex
        const escapedQuestion = escapeRegex(question);

        // Check duplicate question (case-insensitive)
        const existQuestion = await VibeCheckQuestion.findOne({
            question: { $regex: `^${escapedQuestion}$`, $options: "i" },
            is_deleted: false
        });

        if (existQuestion) {
            return apiResponse.badRequest(res, messages.VIBECHECK_ALREADY);
        }

        // Get the highest order to place new at end
        const highestOrder = await VibeCheckQuestion.findOne({ is_deleted: false }).sort({ order: -1 });
        const newOrder = highestOrder ? highestOrder.order + 1 : 1;

        const vibeCheckQuestion = new VibeCheckQuestion({
            question,
            description,
            order: newOrder
        });

        await vibeCheckQuestion.save();
        return apiResponse.ok(res, vibeCheckQuestion, messages.VIBECHECK_CREATED);

    } catch (err) {
        console.log(err.message);
        return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
    }
};


// ✅ Get All VibeCheck Questions
const getVibeCheckQuestions = async (req, res) => {
    try {
        const vibeCheckQuestions = await VibeCheckQuestion.find({
            is_active: true,
            is_deleted: false
        }).sort({ order: 1, createdAt: -1 });

        return apiResponse.ok(res, vibeCheckQuestions, messages.SUCCESS);
    } catch (err) {
        return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
    }
};

// ✅ Get VibeCheck Question by ID
const getVibeCheckQuestionById = async (req, res) => {
    try {
        const { id } = req.params;
        const vibeCheckQuestion = await VibeCheckQuestion.findOne({
            _id: id,
            is_deleted: false
        });

        if (!vibeCheckQuestion) {
            return apiResponse.notFoundResponse(res, messages.VIBECHECK_NOT_FOUND);
        }

        return apiResponse.ok(res, vibeCheckQuestion, messages.SUCCESS);
    } catch (err) {
        return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
    }
};

// ✅ Update VibeCheck Question
const updateVibeCheckQuestion = async (req, res) => {
    try {
        const { id } = req.params;
        const { question, description } = req.body;

        const vibeCheckQuestion = await VibeCheckQuestion.findOneAndUpdate(
            {
                _id: id,
                is_deleted: false
            },
            {
                question,
                description,
                updatedAt: Date.now()
            },
            {
                new: true,
                runValidators: true
            }
        );

        if (!vibeCheckQuestion) {
            return apiResponse.notFoundResponse(res, messages.VIBECHECK_NOT_FOUND);
        }

        return apiResponse.ok(res, vibeCheckQuestion, messages.VIBECHECK_UPDATED);
    } catch (err) {
        return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
    }
};

// ✅ Delete VibeCheck Question (Soft Delete)
const deleteVibeCheckQuestion = async (req, res) => {
    try {
        const { id } = req.params;
        const vibeCheckQuestion = await VibeCheckQuestion.findOne({
            _id: id,
            is_deleted: false
        });

        if (!vibeCheckQuestion) {
            return apiResponse.notFoundResponse(res, messages.VIBECHECK_NOT_FOUND);
        }

        // Soft delete - set is_deleted to true
        vibeCheckQuestion.is_deleted = true;
        vibeCheckQuestion.is_active = false;
        await vibeCheckQuestion.save();

        return apiResponse.ok(res, vibeCheckQuestion, messages.VIBECHECK_DELETED);
    } catch (err) {
        return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
    }
};

// ✅ Toggle Active Status
const toggleActiveStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const vibeCheckQuestion = await VibeCheckQuestion.findOne({
            _id: id,
            is_deleted: false
        });

        if (!vibeCheckQuestion) {
            return apiResponse.notFoundResponse(res, messages.VIBECHECK_NOT_FOUND);
        }

        vibeCheckQuestion.is_active = !vibeCheckQuestion.is_active;
        await vibeCheckQuestion.save();

        const message = vibeCheckQuestion.is_active
            ? "VibeCheck question activated successfully"
            : "VibeCheck question deactivated successfully";

        return apiResponse.ok(res, vibeCheckQuestion, message);
    } catch (err) {
        return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
    }
};

export default {
    createVibeCheckQuestion,
    getVibeCheckQuestions,
    getVibeCheckQuestionById,
    updateVibeCheckQuestion,
    deleteVibeCheckQuestion,
    toggleActiveStatus
};