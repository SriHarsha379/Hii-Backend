import Joi from "joi";

export const faq_schema = Joi.object({
    question: Joi.string().required(),
    answer: Joi.string().allow("", null),
    target: Joi.string().valid("FOR_ALL", "FOR_VENDOR", "FOR_USER").default("FOR_ALL")
});
