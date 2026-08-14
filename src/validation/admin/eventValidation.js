import Joi from "joi";

const eventSchema = Joi.object({
    venue_name: Joi.string().required(),
    // Accept category_ids as either a JSON string or array
    category_ids: Joi.alternatives().try(
        Joi.array().items(Joi.string()).required(),
        Joi.string().required()
    ).required(),
    start_time: Joi.date().required(),
    end_time: Joi.date().required(),
    address: Joi.string().required(),
    latitude: Joi.string().required(),
    longitude: Joi.string().required(),
    date: Joi.date().required(),
    about: Joi.string().required(),
    gallery_images: Joi.array().items(Joi.string()),
    is_active: Joi.boolean().default(true),
    is_deleted: Joi.boolean().default(false)
});

export { eventSchema };

