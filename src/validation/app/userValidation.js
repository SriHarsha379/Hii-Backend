import Joi from "joi";

const user_schema = Joi.object({
    phone_number: Joi.string()
        .pattern(/^[0-9]{10,15}$/) // only digits, 10-15 length
        .required()
        .messages({
            "string.pattern.base": "Phone number must be digits only",
            "string.empty": "Phone number is required"
        }),

    email: Joi.string()
        .email()
        .required()
        .messages({
            "string.email": "Please provide a valid email",
            "string.empty": "Email is required"
        }),

    password: Joi.string()
        .min(6)
        .max(20)
        .required()
        .messages({
            "string.min": "Password must be at least 6 characters",
            "string.max": "Password must not exceed 20 characters",
            "string.empty": "Password is required"
        }),

    first_name: Joi.string().allow("", null),
    last_name: Joi.string().allow("", null),

    birthdate: Joi.date()
        .less("now")
        .messages({
            "date.less": "Birthdate must be in the past"
        }),

    age: Joi.number()
        .integer()
        .min(0)
        .max(120)
        .messages({
            "number.base": "Age must be a number",
            "number.min": "Age cannot be negative",
            "number.max": "Age cannot exceed 120"
        }),

    weight: Joi.number().min(1).max(500).allow(null),
    height: Joi.number().min(30).max(300).allow(null),

    gender: Joi.string().valid("Male", "Female", "Other").allow(null),

    profile_image: Joi.string().uri().allow("", null),

});

export { user_schema };
