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




const registerOrganiserSchema = Joi.object({
    name: Joi.string().trim().min(2).required()
        .messages({
            "string.empty": "Name is required.",
            "string.min": "Name must be at least 2 characters long."
        }),
    email: Joi.string()
        .email({ tlds: { allow: false } })
        .required()
        .messages({
            "string.empty": "Email is required.",
            "string.email": "Please enter a valid email address."
        }),
    password: Joi.string().min(6).required()
        .messages({
            "string.empty": "Password is required.",
            "string.min": "Password must be at least 6 characters long."
        }),
    role: Joi.string().valid("CLUB_ADMIN", "EVENT_ADMIN").required()
        .messages({
            "any.only": "Role must be CLUB_ADMIN or EVENT_ADMIN."
        }),
});



export { adminLoginSchema, changePasswordSchema, forgetPasswordSchema, forgetNewPasswordSchema, registerOrganiserSchema }