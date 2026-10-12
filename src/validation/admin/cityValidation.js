import Joi from "joi";

const city_schema = Joi.object({
  city_name: Joi.string()
    .trim()
    .required()
    .messages({
      "string.empty": "City name cannot be empty",
      "any.required": "City name cannot be empty"
    }),

  state_id: Joi.string().optional().allow("", null),
  latitude: Joi.number().optional().allow("", null),
  longitude: Joi.number().optional().allow("", null)
});

export { city_schema };
