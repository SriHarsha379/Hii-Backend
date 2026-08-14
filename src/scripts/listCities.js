import mongoose from "mongoose";
import dotenv from "dotenv";
import { City } from "../model/index.js";

dotenv.config();

const listCities = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const cities = await City.find({}).sort({ city_name: 1 });
    console.log(`\nTotal cities: ${cities.length}\n`);
    cities.forEach((c) => {
      console.log(`${c.is_active ? "✅" : "⛔"} ${c.city_name}  (id: ${c._id})`);
    });
    process.exit(0);
  } catch (err) {
    console.error("Error:", err.message);
    process.exit(1);
  }
};

listCities();
