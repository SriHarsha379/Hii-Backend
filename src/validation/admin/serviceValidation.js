import Joi from "joi";

const service_schema = Joi.object({
    title: Joi.string()
        .pattern(/^(?!\d+$).+/)   // ❌ Reject karega agar pura number hai
        .message("Title cannot be only numbers")
        .optional(),

    description: Joi.string()
        .pattern(/^(?!\d+$).+/)   // ❌ Reject karega agar pura number hai
        .message("Description cannot be only numbers")
        .optional(),

    image: Joi.string().optional(),
    fees: Joi.number().optional(),
    session_count: Joi.number().optional(),
});

export { service_schema };
