import Joi from "joi";

export const vendorLoginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    "string.email": "INVALID_EMAIL",
    "any.required": "EMAIL_REQUIRED",
  }),
  password: Joi.string().required().messages({
    "any.required": "PASSWORD_REQUIRED",
  }),
}); 

export const changePasswordSchema = Joi.object({
  oldPassword: Joi.string().required().messages({
    "any.required": "OLD_PASSWORD_REQUIRED",
  }),
  newPassword: Joi.string().min(6).required().messages({
    "string.min": "PASSWORD_TOO_SHORT",
    "any.required": "NEW_PASSWORD_REQUIRED",
  }),
});

export const forgetPasswordSchema = Joi.object({
  email: Joi.string().email().required().messages({
    "string.email": "INVALID_EMAIL",
    "any.required": "EMAIL_REQUIRED",
  }),
});

export const forgetNewPasswordSchema = Joi.object({
  newPassword: Joi.string().min(6).required().messages({
    "string.min": "PASSWORD_TOO_SHORT",
    "any.required": "NEW_PASSWORD_REQUIRED",
  }),
  token: Joi.string().required().messages({
    "any.required": "TOKEN_REQUIRED",
  }),
});

export const updateVendorProfileSchema = Joi.object({
  name: Joi.string().optional(),
  email: Joi.string().email().optional().messages({
    "string.email": "INVALID_EMAIL",
  }),
  phone_number: Joi.string().pattern(/^[0-9]{10}$/).optional().messages({
    "string.pattern.base": "INVALID_PHONE_NUMBER",
  }),
  city: Joi.string().optional(),
  state: Joi.string().optional(),
}).unknown(true);