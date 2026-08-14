import { State } from "../../model/index.js";
import apiResponse from "../../utility/apiResponse.js";
import messages from "../../utility/messages.js";
import moment from 'moment';

const createState = async (req, res) => {
    const { state_name } = req.body
    try {
        const existState = await State.findOne({ state_name })
        if (existState) return apiResponse.badRequest(res, messages.STATE_ALREADY)
        const state = new State({ state_name })
        await state.save()
        return apiResponse.ok(res, state, messages.STATE_CREATED)

    } catch (err) {
        console.log(err.message)
        return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
    }
}


const updateState = async (req, res) => {
    const { id } = req.params
    const { state_name } = req.body
    try {
        const state = await State.findById(id)
        if (!state) return apiResponse.notFoundResponse(res, messages.STATE_NOT_FOUND);

        const existState = await State.findOne({ state_name, _id: { $ne: id } })
        if (existState) return apiResponse.badRequest(res, messages.STATE_ALREADY)

        const updateData = {}
        if (state_name) updateData.state_name = state_name
        updateData.updatedAt = Date.now()

        const updatedState = await State.findByIdAndUpdate(id, { $set: updateData }, { new: true });
        return apiResponse.ok(res, updatedState, messages.STATE_UPDATE_SUCCESSFULLY);

    } catch (err) {
        console.log(err.message)
        return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
    }
}

const getStates = async (req, res) => {
    try {
        const states = await State.find({ is_active: true, is_deleted: false }).sort({ createdAt: -1 });
        return apiResponse.ok(res, states, messages.SUCCESS);

    } catch (err) {
        console.log(err.message)
        return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
    }
}

const deleteState = async (req, res) => {
    const { id } = req.params
    try {
        const state = await State.findById(id)
        if (!state) return apiResponse.notFoundResponse(res, messages.STATE_NOT_FOUND);

        state.is_deleted = true
        state.is_active = false
        state.updatedAt = Date.now()

        await state.save()
        return apiResponse.ok(res, state, messages.STATE_DELETED_SUCCESSFULLY);

    } catch (err) {
        console.log(err.message)
        return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
    }
}

export default { createState, getStates, updateState, deleteState };