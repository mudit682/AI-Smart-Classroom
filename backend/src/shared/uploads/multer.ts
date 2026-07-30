import multer from "multer";
import { env } from "../../config/env.js";

export const upload = multer({
  dest: env.UPLOAD_DIR,
  limits: {
    fileSize: 10 * 1024 * 1024
  }
});

