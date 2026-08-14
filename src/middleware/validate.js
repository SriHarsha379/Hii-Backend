import apiResponse from "../utility/apiResponse.js";
import messages from "../utility/messages.js";

// ✅ Generic Joi validator middleware
export const validate = (schema, property = "body") => {
    return (req, res, next) => {
        // Allow unknown keys so clients can send extra fields (e.g., status, transaction_id)
        const { error } = schema.validate(req[property] || {}, { abortEarly: false, allowUnknown: true });

        if (error) {
            const errors = error.details.map((err) => err.message.replace(/"/g, ""));
            return apiResponse.badRequest(res, errors, messages.VALIDATION_ERROR);
        }

        next();
    };
};
