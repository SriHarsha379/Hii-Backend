import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config();

const conn = async () => {
    try {
        const res = await mongoose.connect(process.env.MONGO_URI);
        if (res) {
            console.log("Connected to MongoDB");
        }
    } catch (error) {
        console.error("MongoDB connection error:", error);
    }
};

conn();
