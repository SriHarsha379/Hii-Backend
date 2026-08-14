import Joi from "joi";

const tabularReportSchema = Joi.object({
    s_date: Joi.string().required(),
    e_date: Joi.string().required()
}).messages({
    "any.required": "{#label} is required",
    "date.max": "{#label} cannot be a future date"
});

export { tabularReportSchema }