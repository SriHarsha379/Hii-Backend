import Joi from "joi";

const state_schema = Joi.object({
    state_name: Joi.string().required(),

});

export { state_schema };
