import { Interest } from "../../model/index.js";
import apiResponse from "../../utility/apiResponse.js";
import messages from "../../utility/messages.js";

const createInterest = async (req, res) => {
    const { interest } = req.body;
    console.log("REQ BODY:", req.body);

    try {
        const existInterest = await Interest.findOne({
            interest: { $regex: new RegExp(`^${interest}$`, 'i') },
            is_deleted: false
        });

        if (existInterest)
            return apiResponse.badRequest(res, messages.INTEREST_ALREADY);

        const interestData = new Interest({ interest });
        await interestData.save();

        return apiResponse.ok(res, interestData, messages.INTEREST_CREATED);

    } catch (err) {
        console.log(err.message);
        return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
    }
};

const getInterest = async (req, res) => {
    try {
        const interestData = await Interest.find({
            is_active: true,
            is_deleted: false
        }).sort({ createdAt: -1 });

        return apiResponse.ok(res, interestData, messages.SUCCESS);

    } catch (err) {
        console.log(err.message);
        return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
    }
};

const deleteInterest = async (req, res) => {
    const { id } = req.params;

    try {
        const interestData = await Interest.findById(id);

        if (!interestData)
            return apiResponse.notFoundResponse(res, messages.INTEREST_NOT_FOUND);

        interestData.is_deleted = true;
        interestData.is_active = false;
        interestData.updatedAt = Date.now();

        await interestData.save();

        return apiResponse.ok(res, interestData, ["Intrest deleted successfully"]);

    } catch (err) {
        console.log(err.message);
        return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
    }
};

const updateInterest = async (req, res) => {
    const { id } = req.params;
    let { interest } = req.body;

    try {
        // ✅ Trim input
        interest = interest?.trim();

        // ✅ Empty validation
        if (!interest) {
            return apiResponse.badRequest(res, "Interest is required");
        }

        const interestData = await Interest.findById(id);

        if (!interestData)
            return apiResponse.notFoundResponse(res, messages.INTEREST_NOT_FOUND);

        // ✅ Check duplicate (case-insensitive)
        const existInterest = await Interest.findOne({
            interest: { $regex: `^${interest}$`, $options: "i" },
            _id: { $ne: id },
            is_deleted: false
        });

        if (existInterest)
            return apiResponse.badRequest(res, messages.INTEREST_ALREADY);

        const updatedInterestData = await Interest.findByIdAndUpdate(
            id,
            {
                $set: {
                    interest,
                    updatedAt: Date.now()
                }
            },
            { new: true }
        );

        return apiResponse.ok(
            res,
            updatedInterestData,
            messages.INTEREST_UPDATE_SUCCESSFULLY
        );

    } catch (err) {
        console.log(err.message);
        return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
    }
};


export default {
    createInterest,
    getInterest,
    deleteInterest,
    updateInterest
};
