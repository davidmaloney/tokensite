import multer from "multer";
import sharp from "sharp";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import {
  AVATAR_MAX_BYTES,
  BANNER_MAX_BYTES,
  AVATAR_OUTPUT_SIZE,
  BANNER_OUTPUT_WIDTH,
  BANNER_OUTPUT_HEIGHT,
} from "../config/constants.js";

const UPLOAD_DIR = process.env.UPLOAD_DIR || "/data/uploads";
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: { fileSize: Math.max(AVATAR_MAX_BYTES, BANNER_MAX_BYTES) },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files are allowed."));
    }
    cb(null, true);
  },
});

export async function processAndSaveImage(buffer, type) {
  const id = uuidv4();
  const filename = `${id}.webp`;
  const outputPath = path.join(UPLOAD_DIR, filename);

  let pipeline = sharp(buffer);

  if (type === "avatar") {
    pipeline = pipeline
      .resize(AVATAR_OUTPUT_SIZE, AVATAR_OUTPUT_SIZE, { fit: "cover" })
      .webp({ quality: 85 });
  } else {
    pipeline = pipeline
      .resize(BANNER_OUTPUT_WIDTH, BANNER_OUTPUT_HEIGHT, { fit: "cover" })
      .webp({ quality: 82 });
  }

  await pipeline.toFile(outputPath);
  return `/media/${filename}`;
}
