import Joi from "joi";

const interest_schema = Joi.object({
  interest: Joi.string()
    .trim()      // remove spaces
    .min(1)      // must have at least 1 character
    .required()
    .messages({
      "string.empty": "Interest cannot be empty",
      "string.min": "Interest cannot be empty",
      "any.required": "Interest is required"
    })
});

export { interest_schema };
