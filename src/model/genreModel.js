import mongoose from 'mongoose';
import helper from '../utility/helper.js';

const genreSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    category: {
        type: String,
        trim: true
    },
    image: {
        type: String,
        default: null
    },
    is_active: {
        type: Boolean,
        default: true
    },
    is_deleted: {
        type: Boolean,
        default: false
    },
    is_top_pick: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

genreSchema.post("find", function (docs) {
    docs.forEach(doc => {
        doc.createdAt = helper.dataHelper(doc.createdAt);
    });
});

genreSchema.post("findOne", function (doc) {
    if (doc) {
        doc.createdAt = helper.dataHelper(doc.createdAt);
    }
});

const Genre = mongoose.model("Genre", genreSchema);
export default Genre;
