/** @format */

import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ Store files inside "src/uploads"
const uploadDir = path.join(__dirname, "../../uploads");

// Ensure uploads folder exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  },
});

// ✅ Allow images + videos
const fileFilter = (req, file, cb) => {
  const imageTypes = /jpeg|jpg|png|gif|webp|bmp|tiff|tif|svg|ico|avif|heic|heif|jfif|pjpeg|pjp|apng|giff/i;
  const videoTypes = /mp4|mov|avi|mkv|webm/;

  const ext = path.extname(file.originalname).toLowerCase().substring(1);

  if (imageTypes.test(ext) || videoTypes.test(ext)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Only image and video files are allowed (jpg, png, webp, mp4, mov)"
      )
    );
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 5 MB
  fileFilter,
});

export default upload;
