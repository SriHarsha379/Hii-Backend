import mongoose from "mongoose";
import dotenv from "dotenv";
import Genre from "./src/model/genreModel.js";

dotenv.config();

await mongoose.connect(process.env.MONGO_URI);

console.log("DB:", mongoose.connection.name);
console.log("HOST:", mongoose.connection.host);

const genres = await Genre.find({});

console.log("TOTAL GENRES:", genres.length);

genres.forEach((g) => {
  console.log(
    g._id.toString(),
    "|",
    g.name,
    "|",
    g.category
  );
});

process.exit(0);
