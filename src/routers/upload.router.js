import { Router } from 'express';
import admin from '../middleware/admin.mid.js';
import multer from 'multer';
import handler from 'express-async-handler';
import { BAD_REQUEST } from '../constants/httpStatus.js';
import { configCloudinary } from '../config/cloudinary.config.js';

import auth from '../middleware/auth.mid.js';

import authMid from '../middleware/auth.mid.js';
const router = Router();
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 } 
});
router.post(
  '/',
  admin,
  upload.single('image'),
  handler(async (req, res) => {
    const file = req.file;
    if (!file) {
      res.status(BAD_REQUEST).send();
      return;
    }

    const imageUrl = await uploadImageToCloudinary(req.file?.buffer);
    res.send({ imageUrl });
  })
);

const uploadImageToCloudinary = imageBuffer => {
  const cloudinary = configCloudinary();

  return new Promise((resolve, reject) => {
    if (!imageBuffer) reject(null);

    cloudinary.uploader
      .upload_stream((error, result) => {
        if (error || !result) reject(error);
        else resolve(result.url);
      })
      .end(imageBuffer);
  });
};
router.post(
  '/upload-thumbnail',
  authMid,            
  upload.single('thumbnail'),
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }

      // Upload to Cloudinary, auto-resize to 200×200 thumbnail
      const result = await cloudinary.uploader.upload_stream(
        {
          folder: 'thumbnails',
          transformation: [
            { width: 200, height: 200, crop: 'thumb', gravity: 'face' }
          ],
          resource_type: 'image'
        },
        (error, uploadResult) => {
          if (error) return next(error);
          // Respond with URL & size in bytes
          res.json({
            url: uploadResult.secure_url,
            bytes: uploadResult.bytes,
            public_id: uploadResult.public_id
          });
        }
      ).end(req.file.buffer);

    } catch (err) {
      next(err);
    }
  }
);
export default router;
