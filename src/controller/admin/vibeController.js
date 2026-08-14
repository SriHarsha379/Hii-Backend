import moment from "moment";
import { Vibe } from "../../model/index.js";
import apiResponse from "../../utility/apiResponse.js";
import messages from "../../utility/messages.js";


const addVibe = async (req, res) => {
    let { vibe, description } = req.body;
    const image = req.file ? req.file.filename : null;

    try {
        // ✅ Trim inputs to avoid space-only
        vibe = vibe?.trim();
        description = description?.trim();

        // ✅ Validation
        if (!vibe) return apiResponse.badRequest(res, "Vibe heading is required");
        if (!description) return apiResponse.badRequest(res, "Vibe sub heading is required");
        if (!image) return apiResponse.badRequest(res, "Image file is required");

        // ✅ Check duplicate (case-insensitive)
        const existVibe = await Vibe.findOne({
            vibe: { $regex: `^${vibe}$`, $options: "i" },
            is_deleted: false
        });
        if (existVibe) return apiResponse.badRequest(res, messages.VIBE_ALREADY_EXISTS);

        // ✅ Create new vibe
        const vibeData = new Vibe({ vibe, description, image });
        await vibeData.save();

        // ✅ Format createdAt
        const responseData = {
            ...vibeData.toObject(),
            createdAt: moment(vibeData.createdAt).format("DD-MM-YYYY hh:mm A")
        };

        return apiResponse.ok(res, responseData, messages.VIBE_CREATED);

    } catch (err) {
        console.log(err.message);
        return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
    }
};


const deleteVibe = async (req, res) => {
    const { id } = req.params
    try {
        const cat = await Vibe.findById(id)
        if (!cat) return apiResponse.notFoundResponse(res, messages.VIBE_NOT_FOUND);

        cat.is_deleted = true
        cat.is_active = false
        cat.updatedAt = Date.now()

        await cat.save()
        return apiResponse.ok(res, cat, messages.VIBE_DELETED_SUCCESSFULLY);

    } catch (err) {
        console.log(err.message)
        return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
    }
}

const getAllVibe = async (req, res) => {
    try {
        const vibe = await Vibe.find({ is_active: true, is_deleted: false })
            .sort({ createdAt: -1 })
            .lean();

        const data = vibe.map(vibeData => ({
            ...vibeData,
            createdAt: moment(vibeData.createdAt).format("DD-MM-YYYY hh:mm A")
        }));

        return apiResponse.ok(res, data, messages.SUCCESS);

    } catch (err) {
        console.log(err.message);
        return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
    }
};

const editVibe = async (req, res) => {
    const { id } = req.params;
    let { vibe, description } = req.body;
    const image = req.file ? req.file.filename : null;

    try {
        // ✅ Trim values
        vibe = vibe?.trim();
        description = description?.trim();

        // ✅ Empty validation
        if (!vibe)
            return apiResponse.badRequest(res, "Vibe heading is required");

        if (!description)
            return apiResponse.badRequest(res, "Vibe sub heading is required");

        // ✅ Check if vibe exists
        const vibeData = await Vibe.findById(id);
        if (!vibeData)
            return apiResponse.notFoundResponse(res, messages.VIBE_NOT_FOUND);

        // ✅ Check duplicate (case-insensitive + excluding current ID)
        const existVibe = await Vibe.findOne({
            vibe: { $regex: `^${vibe}$`, $options: "i" },
            _id: { $ne: id },
            is_deleted: false
        });

        if (existVibe)
            return apiResponse.badRequest(res, messages.VIBE_ALREADY);

        // ✅ Prepare update data
        const updateData = {
            vibe,
            description,
            updatedAt: Date.now()
        };

        if (image) {
            updateData.image = image;
        }

        // ✅ Update record
        const updatedVibe = await Vibe.findByIdAndUpdate(
            id,
            { $set: updateData },
            { new: true }
        );

        return apiResponse.ok(
            res,
            updatedVibe,
            messages.VIBE_UPDATE_SUCCESSFULLY
        );

    } catch (err) {
        console.log(err.message);
        return apiResponse.serverError(res, messages.SERVER_ERROR, err.message);
    }
};


export default { addVibe, deleteVibe, getAllVibe, editVibe }