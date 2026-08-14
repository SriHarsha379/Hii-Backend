// controllers/faqController.js

import { Service } from "../../model/index.js";
import apiResponse from "../../utility/apiResponse.js";
import messages from "../../utility/messages.js";
import helper from "../../utility/helper.js";

// ✅ Get All service
const getServices = async (req, res) => {
    try {
        const services = await Service.find({ is_active: true }).sort({ createdAt: -1 });
        return apiResponse.ok(res, services, messages.SUCCESS);
    } catch (err) {
        return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
    }
};

// ✅ Get service by ID
const getServiceById = async (req, res) => {
    try {
        const { id } = req.params;
        const services = await Service.findById(id);

        if (!services) {
            return apiResponse.notFoundResponse(res, messages.FAQ_NOT_FOUND);
        }

        return apiResponse.ok(res, services, messages.SUCCESS);
    } catch (err) {
        return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
    }
};

// ✅ Update service
const updateService = async (req, res) => {
    try {
        const { id } = req.params;
        let { title, description, session_count, fees } = req.body;

        // Get old service
        const service = await Service.findById(id);
        if (!service) return apiResponse.notFoundResponse(res, messages.SERVICES_NOT_FOUND[0]);
        // Handle image upload
        let image = service.image; // default old image
        if (req.file) {
            if (service.image && service.image !== req.file.filename) {
                helper.removeOldImage(service.image); // purani delete karo
            }
            image = req.file.filename;
        }

        // ✅ Update service
        const updatedService = await Service.findByIdAndUpdate(
            id,
            {
                title,
                description,
                session_count,
                fees,
                image
            },
            { new: true, runValidators: true }
        );

        return apiResponse.ok(res, updatedService, messages.SERVICE_UPDATE);
    } catch (err) {
        return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
    }
};



export default { updateService, getServices, getServiceById };
