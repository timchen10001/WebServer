import cloudinary from "./cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";

export const storage = (() => {
  return new CloudinaryStorage({
    cloudinary,
    params: {
      folder: process.env.CLOUDINARY_FOLDER,
      allowed_formats: ["jpeg", "png", "jpg", "webp"],
    },
  });
})();
