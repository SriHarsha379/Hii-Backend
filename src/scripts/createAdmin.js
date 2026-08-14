import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import { Admin } from "../model/index.js"; // adjust path if needed

dotenv.config();
const createAdmin = async () => {
    try {
        // connect to DB
        await mongoose.connect('mongodb+srv://dev_db_user:FlhcqjbyH1HauTmb@cluster0.vcucve0.mongodb.net/nightlifeDB');
        console.log("✅ MongoDB connected");

        const email = "admin@gmail.com";   // change as needed
        const password = "Admin@123";        // change as needed

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
