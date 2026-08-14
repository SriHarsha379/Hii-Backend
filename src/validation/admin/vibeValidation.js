import Joi from "joi";

const vibe_schema = Joi.object({
    vibe: Joi.string().trim().min(1).required().messages({
        "string.empty": "Vibe heading is required",
        "string.min": "Vibe heading cannot be empty",
    }),
    description: Joi.string().trim().min(1).required().messages({
        "string.empty": "Vibe sub heading is required",
        "string.min": "Vibe sub heading cannot be empty",
    }),
});


export { vibe_schema }; 