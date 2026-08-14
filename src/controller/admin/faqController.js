import { Faq } from "../../model/index.js";
import apiResponse from "../../utility/apiResponse.js";
import messages from "../../utility/messages.js";


// Create Faq
const createFaq = async (req, res) => {
    try {
        let { question, answer, target } = req.body;

        if (!question || !answer) {
            return apiResponse.badRequest(res, "Question and Answer are required");
        }

        // Trim question
        question = question.trim();

        // Escape special regex characters
        const escapedQuestion = question.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        const existQuestion = await Faq.findOne({
            question: { $regex: new RegExp(`^${escapedQuestion}$`, 'i') },
            is_deleted: false
        });

        if (existQuestion) {
            return apiResponse.badRequest(res, messages.FAQ_ALREADY);
        }

        const faq = new Faq({
            question,
            answer: answer.trim(),
            target: target || "FOR_ALL"
        });

        await faq.save();

        return apiResponse.ok(res, faq, messages.FAQ_CREATED);

    } catch (err) {
        console.error("Create FAQ Error:", err);
        return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
    }
};


const getFaqs = async (req, res) => {
    try {
        let filters = { is_deleted: false };

        // OPTIONAL FILTER BY TARGET
        if (req.query.target) {
            filters.target = req.query.target; // FOR_ALL | FOR_VENDOR | FOR_USER
        }

        const faqs = await Faq.find(filters).sort({ createdAt: -1 });

        return apiResponse.ok(res, faqs, messages.SUCCESS);
    } catch (err) {
        console.error("Get FAQs Error:", err);
        return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
    }
};

const getFaqById = async (req, res) => {
    try {
        const faq = await Faq.findOne({
            _id: req.params.id,
            is_deleted: false
        });

        if (!faq)
            return apiResponse.notFoundResponse(res, messages.FAQ_NOT_FOUND);

        return apiResponse.ok(res, faq, messages.SUCCESS);
    } catch (err) {
        console.error("Get FAQ by ID Error:", err);
        return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
    }
};

const updateFaq = async (req, res) => {
    try {
        const { id } = req.params;
        const { question, answer, target } = req.body;

        // Check if FAQ exists
        const faq = await Faq.findOne({
            _id: id,
            is_deleted: false
        });

        if (!faq)
            return apiResponse.notFoundResponse(res, messages.FAQ_NOT_FOUND);

        // Check if question already exists (excluding current FAQ)
        if (question && question !== faq.question) {
            const existQuestion = await Faq.findOne({
                question: { $regex: new RegExp(`^${question}$`, 'i') },
                is_deleted: false,
                _id: { $ne: id }
            });

            if (existQuestion)
                return apiResponse.badRequest(res, messages.FAQ_ALREADY);
        }

        // Update FAQ
        faq.question = question || faq.question;
        faq.answer = answer || faq.answer;
        faq.target = target || faq.target;

        await faq.save();

        return apiResponse.ok(res, faq, messages.FAQ_UPDATED);
    } catch (err) {
        console.error("Update FAQ Error:", err);
        return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
    }
};

const deleteFaq = async (req, res) => {
    try {
        const faq = await Faq.findOne({
            _id: req.params.id,
            is_deleted: false
        });

        if (!faq)
            return apiResponse.notFoundResponse(res, messages.FAQ_NOT_FOUND);

        faq.is_deleted = true;
        faq.is_active = false;

        await faq.save();

        return apiResponse.ok(res, faq, messages.FAQ_DELETED);
    } catch (err) {
        console.error("Delete FAQ Error:", err);
        return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
    }
};

export default {
    createFaq,
    getFaqs,
    getFaqById,
    updateFaq,
    deleteFaq
};