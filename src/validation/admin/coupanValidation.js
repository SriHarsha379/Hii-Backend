import Joi from "joi";

const coupan_schema = Joi.object({
    coupan_code: Joi.string().required(),
    discount_percentage: Joi.number().min(0).max(100),
    expiry_date: Joi.date()
        .min(new Date().setHours(0, 0, 0, 0))
        .required()
        .messages({
            "date.base": "Expiry date must be a valid date",
            "date.min": "Expiry date must be today or in the future",
            "any.required": "Expiry date is required"
        })
});



export { coupan_schema }