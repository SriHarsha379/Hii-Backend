import express from "express";
import genreController from "../../controller/admin/genreController.js";
import { adminauth } from "../../middleware/authMiddleware.js";
import upload from "../../middleware/upload.js";

const route = express.Router();

route
  .post(
    "/add_genre",
    adminauth,
    upload.single("image"),
    genreController.addGenre
  )
  .get("/get_all_genres", adminauth, genreController.getAllGenres)
  .get("/get_genre_by_id/:id", adminauth, genreController.getGenreById)
  .put(
    "/update_genre/:id",
    adminauth,
    upload.single("image"),
    genreController.updateGenre
  )
  .delete("/delete_genre/:id", adminauth, genreController.deleteGenre)
  .get("/get_top_picks", adminauth, genreController.getTopPicks)
  .get("/get_categories", adminauth, genreController.getCategories);

export default route;
