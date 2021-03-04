import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";

export const storage = (() => {
  cloudinary.config({
    sign_url: process.env.CLOUDINARY_URL,
  });

  return new CloudinaryStorage({
    cloudinary,
    params: {
      folder: process.env.CLOUDINARY_FOLDER,
      allowed_formats: ["jpeg", "png", "jpg", "webp"],
    },
  });
})();
