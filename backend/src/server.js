import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { getDb } from "./db/index.js";
import { getOrCreateWalletAuthSecret } from "./services/secretService.js";
import { globalRateLimiter } from "./middleware/rateLimiter.js";
import { subdomainResolver } from "./middleware/subdomainResolver.js";
import { startExpiryJob } from "./jobs/expiryJob.js";
import { startCleanupJob } from "./jobs/cleanupJob.js";
import { runCleanup } from "./jobs/cleanupJob.js";
import { DOMAIN } from "./config/domain.js";
import { logger } from "./utils/logger.js";
import { upload, processAndSaveImage } from "./services/mediaService.js";

import pagesRouter from "./routes/pages.js";
import paymentsRouter from "./routes/payments.js";
import adminRouter from "./routes/admin.js";
import subdomainRouter from "./routes/subdomain.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = process.env.PORT || 4000;

getDb();
const secret = getOrCreateWalletAuthSecret();
logger.info("system_start", { domain: DOMAIN, mockMode: process.env.MOCK_MODE === "true" });

app.set("trust proxy", 1);

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      const allowed = [
        `https://${DOMAIN}`,
        `http://${DOMAIN}`,
        `http://localhost:3000`,
        `http://localhost:5173`,
      ];
      if (allowed.includes(origin) || origin.endsWith(`.${DOMAIN}`)) {
        return cb(null, true);
      }
      cb(null, false);
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(globalRateLimiter);
app.use(subdomainResolver);

app.post("/api/media/upload", upload.single("image"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded." });
  const type = req.body.type === "banner" ? "banner" : "avatar";
  try {
    const url = await processAndSaveImage(req.file.buffer, type);
    res.json({ url });
  } catch (err) {
    logger.error("media_upload_error", { err: err.message });
    res.status(500).json({ error: "Upload failed." });
  }
});

app.use("/api/pages", pagesRouter);
app.use("/api/payments", paymentsRouter);
app.use("/api/pricing", paymentsRouter);
app.use("/api/admin", adminRouter);

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", domain: DOMAIN, mock: process.env.MOCK_MODE === "true" });
});

app.use((req, res, next) => {
  if (!req.isMainDomain && req.subdomain) {
    return subdomainRouter(req, res, next);
  }
  next();
});

app.use("/media", (req, res) => {
  const UPLOAD_DIR = process.env.UPLOAD_DIR || "/data/uploads";
  const filename = path.basename(req.path);
  const filepath = path.join(UPLOAD_DIR, filename);
  const fs = await import("fs");
  if (!fs.default.existsSync(filepath)) return res.status(404).send("Not found");
  res.sendFile(filepath);
});

app.use((req, res) => {
  if (!req.isMainDomain && req.subdomain) {
    return subdomainRouter(req, res, () => res.status(404).send("Not found"));
  }
  res.status(404).json({ error: "Not found" });
});

app.use((err, req, res, next) => {
  logger.error("unhandled_error", { err: err.message, path: req.path });
  res.status(500).json({ error: "Internal server error." });
});

startExpiryJob();
startCleanupJob();
runCleanup().catch(() => {});

app.listen(PORT, "0.0.0.0", () => {
  logger.info("server_listening", { port: PORT });
});
