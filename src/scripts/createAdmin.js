import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import { Admin } from "../model/index.js"; // adjust path if needed

dotenv.config();
const createAdmin = async () => {
    try {
        // connect to DB
        await mongoose.connect(process.env.MONGO_URI);
        console.log("✅ MongoDB connected");

        const email = "admin@gmail.com";   // change as needed
        const password = process.env.NEW_ADMIN_PASSWORD; // run: NEW_ADMIN_PASSWORD=... node src/scripts/createAdmin.js

        if (!password || password.length < 10) {
            console.log("Set NEW_ADMIN_PASSWORD (10+ characters) when running this script.");
            process.exit(1);
        }
        if (!password || password.length < 10) {
            console.log("Set NEW_ADMIN_PASSWORD (10+ characters) when running this script.");
            process.exit(1);
        }
        // check if admin already exists
        const existingAdmin = await Admin.findOne({ email });
        if (existingAdmin) {
            console.log("⚠️ Admin already exists:", existingAdmin.email);
            process.exit(0);
        }

        // hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // create admin
        const admin = await Admin.create({
            email,
            password: hashedPassword,
            name : 'admin'
        });

        console.log("🎉 Admin created successfully:", admin.email);
        process.exit(0);
    } catch (err) {
        console.error("❌ Error creating admin:", err.message);
        process.exit(1);
    }
};

createAdmin();
