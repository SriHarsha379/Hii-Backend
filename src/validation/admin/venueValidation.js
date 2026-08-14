import Joi from "joi";

// ✅ Create Venue Schema
const venueSchemaCreate = Joi.object({
  venue_name: Joi.string().trim().required(),
  category_ids: Joi.alternatives()
    .try(
      Joi.array().items(Joi.string()),  // Allow array of strings (category names or IDs)
      Joi.string()                      // Allow single string (category name or ID)
    )
    .required(),
  start_time: Joi.string().required(),
  end_time: Joi.string().required(),
  address: Joi.string().required(),
  latitude: Joi.number().required(),
  longitude: Joi.number().required(),
  about: Joi.string().required(),
  open_hours: Joi.alternatives()
    .try(Joi.array().items(Joi.string()), Joi.string())
    .optional(),
});

// ✅ Update Venue Schema
const venueSchemaUpdate = Joi.object({
  venue_name: Joi.string().trim().optional(),
  category_ids: Joi.alternatives()
    .try(
      Joi.array().items(Joi.string()),  // Allow array of strings (category names or IDs)
      Joi.string()                      // Allow single string (category name or ID)
    )
    .optional(),
  start_time: Joi.string().optional(),
  end_time: Joi.string().optional(),
  address: Joi.string().optional(),
  latitude: Joi.number().optional(),
  longitude: Joi.number().optional(),
  about: Joi.string().optional(),
  open_hours: Joi.alternatives()
    .try(Joi.array().items(Joi.string()), Joi.string())
    .optional(),
});

export { venueSchemaCreate, venueSchemaUpdate };
