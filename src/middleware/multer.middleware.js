import multer from "multer";
import { ApiError } from "../utils/ApiError.js";

const storage = multer.memoryStorage();

export const uploadSingle = (fieldName, maxSizeMB = 10) => {
  const upload = multer({
    storage,
    limits: { fileSize: maxSizeMB * 1024 * 1024 },
  }).single(fieldName);

  return (req, res, next) => {
    upload(req, res, (err) => {
      console.log("multer reached")
      if (err) {
        return next(new ApiError(400, err.message));
      }

      if (!req.file) {
        return next(new ApiError(400, "No file uploaded"));
      }

      next();
    });
  };
};

export const uploadMultiple = (
  fieldName,
  maxFiles = 5,
  maxSizeMB = 10
) => {
  const upload = multer({
    storage,
    limits: { fileSize: maxSizeMB * 1024 * 1024 },
  }).array(fieldName, maxFiles);

  return (req, res, next) => {
    upload(req, res, (err) => {
      if (err) {
        return next(new ApiError(400, err.message));
      }

      if (!req.files || req.files.length === 0) {
        return next(new ApiError(400, "No files uploaded"));
      }

      next();
    });
  };
};
