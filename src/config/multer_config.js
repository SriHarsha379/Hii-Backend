import multer from "multer";
import path from "path";
import fs from "fs";
// ✅ Upload folder check (auto create if missing)
const uploadPath = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath, { recursive: true });
}

// ✅ Multer storage config
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadPath); // Uploads folder
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        const name = path.basename(file.originalname, ext).replace(/\s+/g, "_");
        cb(null, `${Date.now()}-${name}${ext}`);
    },
});

// ✅ File filter (optional: allow only image/video)
const fileFilter = (req, file, cb) => {
    cb(null, true); // Allow all files
};

// ✅ Multer instance
const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 500 * 1024 * 1024 }, // 10 MB max
});

export default upload;
