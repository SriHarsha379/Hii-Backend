import express from 'express';
import genreController from '../../controller/admin/genreController.js';
import { adminauth } from '../../middleware/authMiddleware.js';
import { validate } from '../../middleware/validate.js';
import { genre_schema, genre_update_schema } from '../../validation/admin/genreValidation.js';
import upload from '../../middleware/upload.js';

const route = express.Router();

route
    // Get all genres with optional search and filters
    .get('/get_all_genres', adminauth, genreController.getAllGenres)
    
    // Get top picks
    .get('/top_picks', adminauth, genreController.getTopPicks)
    
    // Get all categories
    .get('/categories', adminauth, genreController.getCategories)
    
    // Get genre by ID
    .get('/get_genre/:id', adminauth, genreController.getGenreById)
    
    // Add new genre
    .post('/add_genre', adminauth, upload.single('image'), validate(genre_schema), genreController.addGenre)
    
    // Update genre
    .put('/update_genre/:id', adminauth, upload.single('image'), validate(genre_update_schema), genreController.updateGenre)
    
    // Delete genre
    .delete('/delete_genre/:id', adminauth, genreController.deleteGenre);

export default route;