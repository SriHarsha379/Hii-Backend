import Joi from "joi";


const signupStepOneSchema = Joi.object({
  phone_number: Joi.string()
    .required()
    .messages({
      "string.empty": "Phone number is required",
      "any.required": "Phone number is required"
    }),

  email: Joi.string()
    .email()
    .required()
    .messages({
      "string.empty": "Email is required",
      "string.email": "Please enter a valid email address",
      "any.required": "Email is required"
    }),

  first_name: Joi.string()
    .min(2)
    .allow("", null)
    .optional()
    .messages({
      "string.empty": "First name is required",
      "string.min": "First name must be at least 2 characters",
      "any.required": "First name is required"
    }),

  last_name: Joi.string()
    .min(2)
    .allow("", null)
    .optional()
    .messages({
      "string.min": "Last name must be at least 2 characters"
    }),

  username: Joi.string()
    .min(3)
    .max(30)
    .pattern(/^[a-zA-Z0-9._]+$/)
    .required()
    .messages({
      "string.empty": "Username is required",
      "string.min": "Username must be at least 3 characters",
      "string.max": "Username must be less than 30 characters",
      "string.pattern.base":
        "Username can contain letters, numbers, dot (.) and underscore (_)",
      "any.required": "Username is required"
    }),

  dob: Joi.date()
    .required()
    .messages({
      "date.base": "Date of birth must be valid",
      "any.required": "Date of birth is required"
    }),

  gender: Joi.string()
    .valid("Male", "Female", "Other")
    .required()
    .messages({
      "any.only": "Gender must be Male, Female or Other",
      "any.required": "Gender is required"
    }),

  city_id: Joi.string()
    .required()
    .messages({
      "string.empty": "City is required",
      "any.required": "City is required"
    }),

  referral_code: Joi.string()
    .allow("", null)
    .optional(),

  password: Joi.string()
    .min(6)
    .allow("", null)
    .optional()
    .messages({
      "string.empty": "Password is required",
      "string.min": "Password must be at least 6 characters",
      "any.required": "Password is required"
    }),

  player_id: Joi.string()
    .allow(null, "")
    .optional(),

  device_type: Joi.string()
    .allow(null, "")
    .optional()
});



const signupStepTwoSchema = Joi.object({
  preferred_cities: Joi.array().items(
    Joi.object({
      city_id: Joi.string().hex().length(24).required(),
      latitude: Joi.number().required(),
      longitude: Joi.number().required(),
      radius: Joi.number().positive().required()
    })
  ).max(4).optional(),

  latitude: Joi.number().min(-90).max(90).optional(),
  longitude: Joi.number().min(-180).max(180).optional(),
  radius: Joi.number().positive().optional(),

  bio: Joi.string().allow("", null).optional(),

  instagram_account: Joi.string().uri().allow("", null).optional(),
  spotify_account: Joi.string().uri().allow("", null).optional(),
  snapchat_account: Joi.string().allow("", null).optional(),

  hobbies: Joi.array().items(Joi.string()).optional()
})
  .min(1)
  .unknown(true);



const signupStepThreeSchema = Joi.object({
  another_email: Joi.string().email().optional(),

  music_genre: Joi.string().allow("", null).optional(),
  custom_music_genres: Joi.string().allow("", null).optional(),

  event_preferences: Joi.string().allow("", null).optional(),
  custom_event_preferences: Joi.string().allow("", null).optional(),

  vibes: Joi.string().allow("", null).optional(),
  custom_vibes: Joi.string().allow("", null).optional(),

  // ✅ FIX HERE
  // vibe_checks: Joi.array()
  //   .items(
  //     Joi.object({
  //       question_id: Joi.string().allow(null, "").optional(),
  //       answer: Joi.string().allow(null, "").optional()
  //     })
  //   )
  //   .optional(),

  sexuality: Joi.string().required(),
  interested_in: Joi.string().optional(),

  pronouns: Joi.string().allow("", null).optional()
});






const appLoginSchema = Joi.object({
  email: Joi.string().optional(),
  phone_number: Joi.string().optional(),
  password: Joi.string().optional(),
  login_type: Joi.string().optional(),
  device_type: Joi.string().optional(),
  player_id: Joi.string().optional(),
  social_id: Joi.string().optional(),
});

const otpVerifySchema = Joi.object({
  otp: Joi.string().required(),
});

const addDetailsSchema = Joi.object({
  f_name: Joi.string().required(),
  l_name: Joi.string().required(),
  dob: Joi.date().required(),
  height: Joi.number().required(),
  weight: Joi.number().required(),
  gender: Joi.string().required()
});

const addEmailSchema = Joi.object({
  email: Joi.string().required()
})

const userSchema = Joi.object({
  otp: Joi.string().required()
})


const userIdSchema = Joi.object({
  user_id: Joi.string().required()
})


const resetPassSchema = Joi.object({
  new_password: Joi.string().required(),
})

const loginVerifySchema = Joi.object({
  email: Joi.string().optional(),
  mobile: Joi.string().optional(),
  password: Joi.string().required(),
});

const userValidationSchema = Joi.object({
  user_id: Joi.string().required(),
  f_name: Joi.string().required(),
  l_name: Joi.string().required(),
  dob: Joi.date().optional(),
  height: Joi.number().required(),
  weight: Joi.number().required(),
  gender: Joi.string().required(),
});


const contactUsSchema = Joi.object({
  email: Joi.string().required(),
  message: Joi.string().required(),
});

const passwordSchema = Joi.object({
  old_password: Joi.string().required(),
  new_password: Joi.string().required()
})


const contentSchema = Joi.object({
  content_id: Joi.string().required(),
  content_type: Joi.number().required(),
});

const serviceIdSchema = Joi.object({
  service_id: Joi.string().required(),
  'any.required': 'Service ID is required',
  'string.empty': 'Service ID cannot be empty'
})

const cardDetailSchema = Joi.object({
  card_holder_name: Joi.string().required(),
  card_number: Joi.string().required(),
  expiry_month: Joi.number().required(),
  expiry_year: Joi.number().required(),
  cvv: Joi.string().required(),
});


const serviceBookSchema = Joi.object({
  service_id: Joi.string().required(),
  coupon_code: Joi.string().optional(),
  country_code: Joi.string().required(),
  mobile: Joi.string().required(),
  email: Joi.string().required(),
  f_name: Joi.string().required(),
  l_name: Joi.string().required(),
  transaction_id: Joi.string().required()
});

const deleteAccountSchema = Joi.object({
  delete_reason: Joi.string().required(),
});

const answerSchema = Joi.object({
  service_id: Joi.string().required(),
  booking_id: Joi.string().required(),
  questionAnswers: Joi.array()
    .items(
      Joi.object({
        question: Joi.string().required(),
        answer: Joi.string().required(),
      })
    )
    .min(1) // at least one Q&A required
    .required(),
});

const cardSchema = Joi.object({
  card_id: Joi.string().required()
})



const socialLoginSchema = Joi.object({
  social_type: Joi.string().required(),
  social_id: Joi.string().required(),
  social_email: Joi.string().required(),
  device_type: Joi.string().required(),
  player_id: Joi.string().required(),
});

export {
  signupStepOneSchema,
  signupStepTwoSchema,
  signupStepThreeSchema,
  appLoginSchema,
  otpVerifySchema,
  addDetailsSchema,
  addEmailSchema,
  userSchema,
  userIdSchema,
  resetPassSchema,
  loginVerifySchema,
  userValidationSchema,
  contactUsSchema,
  passwordSchema,
  contentSchema,
  serviceIdSchema,
  cardDetailSchema,
  serviceBookSchema,
  deleteAccountSchema,
  answerSchema,
  cardSchema,
  socialLoginSchema
};
