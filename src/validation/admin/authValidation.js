import Joi from "joi";

// const adminLoginSchema = Joi.object({
//     email: Joi.string().email().required(),
//     password: Joi.string().min(6).required()
// });

const adminLoginSchema = Joi.object({
    email: Joi.string().required(),
    password: Joi.string().min(6).required()
});

const changePasswordSchema = Joi.object({
    newPassword: Joi.string().min(6).max(15).required()
        .messages({
            "string.min": "New Password length must be at least 6 characters long"
        }),
    oldPassword: Joi.string().min(6).required()
        .messages({
            "string.min": "Current Password length must be at least 6 characters long"
        })
});


const forgetPasswordSchema = Joi.object({
    email: Joi.string()
        .email({ tlds: { allow: false } })
        .required()
        .messages({
            "string.empty": "Email is required.",
            "string.email": "Please enter a valid email address."
        }),
});
const forgetNewPasswordSchema = Joi.object({
    token: Joi.string()
        .required()
        .messages({
            "string.empty": "token is required.",
        }),
    newPassword: Joi.string()
        .min(6)
        .required()
        .messages({
            "string.empty": "New password is required.",
            "string.min": "Password must be at least 6 characters long."
        }),
});




export { adminLoginSchema, changePasswordSchema, forgetPasswordSchema, forgetNewPasswordSchema }