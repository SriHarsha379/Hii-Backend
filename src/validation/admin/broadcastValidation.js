import Joi from "joi";
const broadcastSchema = Joi.object({
    title: Joi.string().trim().required().messages({
        "string.empty": "Title is required",
        "any.required": "Title is required"
    }),
    message: Joi.string().trim().required().messages({
        "string.empty": "Message is required",
        "any.required": "Message is required"
    }),
    userType: Joi.string().valid("user", "all", "club_manager").required().messages({
        "any.only": "User type must be either 'user', 'all' or 'club_manager'",
        "any.required": "User type is required"
    }),
    select_arr: Joi.alternatives().conditional("userType", {
        is: "user",
        then: Joi.array()
            .items(Joi.string().regex(/^[0-9a-fA-F]{24}$/).message("Invalid user ID format"))
            .min(1)
            .required()
            .messages({
                "array.base": "Selected user list must be an array",
                "array.min": "Selected user list is required",
                "any.required": "Selected user list is required"
            }),
        otherwise: Joi.array().optional()
    })
});

export { broadcastSchema }