// backend/src/routes/launch.js
// Hosts token logo images + a metadata JSON so launched coins have a real,
// permanent `uri` that wallets and explorers can read to show the logo.
// Files are tiny (a few KB each) and can be swept by your existing cleanup jobs.
// ES module style to match the rest of the backend.

import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import crypto from "crypto";

const router = express.Router();

const UPLOAD_DIR = process.env.UPLOAD_DIR || "/data/uploads";
const META_DIR = path.join(UPLOAD_DIR, "meta");
const IMG_DIR = path.join(UPLOAD_DIR, "img");
const PUBLIC_BASE = process.env.PUBLIC_BASE_URL || "https://shillit.fun";

for (const d of [UPLOAD_DIR, META_DIR, IMG_DIR]) {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
}

const upload = multer({
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB cap keeps storage tiny
  fileFilter: (_req, file, cb) => {
    if (/^image\/(png|jpe?g|gif|webp)$/.test(file.mimetype)) cb(null, true);
    else cb(new Error("Only PNG, JPG, GIF or WEBP images are allowed."));
  },
});

// POST /api/launch/metadata  (multipart: image, name, symbol)
// -> { uri, image }
router.post("/metadata", upload.single("image"), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No image provided." });
    const name = String(req.body.name || "").slice(0, 64);
    const symbol = String(req.body.symbol || "").slice(0, 16);

    const id = crypto.randomBytes(12).toString("hex");
    const ext = (req.file.mimetype.split("/")[1] || "png").replace("jpeg", "jpg");
    const imgName = `${id}.${ext}`;
    fs.writeFileSync(path.join(IMG_DIR, imgName), req.file.buffer);
    const imageUrl = `${PUBLIC_BASE}/uploads/img/${imgName}`;

    const metadata = { name, symbol, description: "", image: imageUrl, showName: true };
    const metaName = `${id}.json`;
    fs.writeFileSync(path.join(META_DIR, metaName), JSON.stringify(metadata));
    const uri = `${PUBLIC_BASE}/uploads/meta/${metaName}`;

    res.json({ uri, image: imageUrl });
  } catch (e) {
    res.status(500).json({ error: e.message || "Upload failed." });
  }
});

export default router;
