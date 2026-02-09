import { v2 as cloudinary } from "cloudinary";
import streamifier from "streamifier";


cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const uploadToCloudinary = (buffer, resourceType) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: resourceType,
      },
      (error, result) => {
        console.log({
          cloud: process.env.CLOUDINARY_CLOUD_NAME,
          key: !!process.env.CLOUDINARY_API_KEY,
          secret: !!process.env.CLOUDINARY_API_SECRET,
        });
        console.log(typeof cloudinary.uploader.upload_stream);

        if (error) {
          console.log("error at cloudinary", error)
          return reject(error);
        }

        resolve({
          secureUrl: result.secure_url,
          publicId: result.public_id,
          bytes: result.bytes,
        });
      }
    );

    // convert buffer → stream → cloudinary
    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
};

export const deleteFromCloudinary = async (publicId, resourceType) => {
  console.log("deleteFromCloudinary reached")
  if (!publicId) return;

  await cloudinary.uploader.destroy(publicId, {
    resource_type: resourceType,
  });
  console.log("after delete")
};
