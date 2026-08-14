import Joi from "joi";

export const createVendorSchema = Joi.object({
  name: Joi.string().required().messages({
    "string.empty": "NAME_REQUIRED",
    "any.required": "NAME_REQUIRED",
  }),

  email: Joi.string().email().required().messages({
    "string.email": "INVALID_EMAIL",
    "string.empty": "EMAIL_REQUIRED",
    "any.required": "EMAIL_REQUIRED",
  }),

  phone_number: Joi.string()
    .pattern(/^[0-9]{10}$/)
    .required()
    .messages({
      "string.pattern.base": "INVALID_PHONE_NUMBER",
      "any.required": "PHONE_NUMBER_REQUIRED",
    }),

  city: Joi.string().required().messages({
    "any.required": "CITY_REQUIRED",
  }),

  state: Joi.string().required().messages({
    "any.required": "STATE_REQUIRED",
  }),

  address: Joi.string().required().messages({
    "string.empty": "ADDRESS_REQUIRED",
    "any.required": "ADDRESS_REQUIRED",
  }),

  landmark: Joi.string().allow("").optional(),

  password: Joi.string().min(6).required().messages({
    "string.min": "PASSWORD_TOO_SHORT",
    "any.required": "PASSWORD_REQUIRED",
  }),

  confirm_password: Joi.string()
    .valid(Joi.ref("password"))
    .required()
    .messages({
      "any.only": "PASSWORD_NOT_MATCHED",
      "any.required": "CONFIRM_PASSWORD_REQUIRED",
    }),
}).unknown(true);

// ✅ ADD THIS UPDATE SCHEMA
export const updateVendorSchema = Joi.object({
  name: Joi.string().optional().messages({
    "string.empty": "NAME_REQUIRED",
  }),

  email: Joi.string().email().optional().messages({
    "string.email": "INVALID_EMAIL",
    "string.empty": "EMAIL_REQUIRED",
  }),

  phone_number: Joi.string()
    .pattern(/^[0-9]{10}$/)
    .optional()
    .messages({
      "string.pattern.base": "INVALID_PHONE_NUMBER",
    }),

  city: Joi.string().optional(),
  state: Joi.string().optional(),

  address: Joi.string().optional().messages({
    "string.empty": "ADDRESS_REQUIRED",
  }),

  landmark: Joi.string().allow("").optional(),

  password: Joi.string().min(6).optional().messages({
    "string.min": "PASSWORD_TOO_SHORT",
  }),

  // Remove confirm_password from update since it's not always required
}).unknown(true);