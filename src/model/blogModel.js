
 import mongoose from "mongoose";
const BlogSchema = new mongoose.Schema(
    {
        title: { type: String, required: true, trim: true },
        description: { type: String, required: true },
        image: { type: String, required: true },
        author_name: { type: String, required: true },
        is_active: { type: Boolean, default: true }
    },
    { timestamps: true }
);

const Blog = mongoose.model("Blog", BlogSchema);
export default Blog;
