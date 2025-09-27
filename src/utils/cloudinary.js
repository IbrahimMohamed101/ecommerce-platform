const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const logger = require('./logger');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Cloudinary storage for multer
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'ecommerce-platform',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    transformation: [{ width: 1000, height: 1000, crop: 'limit' }]
  }
});

// Multer upload middleware
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Check file type
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Single file upload middleware
const uploadSingle = upload.single('image');

// Multiple files upload middleware
const uploadMultiple = upload.array('images', 10); // Max 10 images

// Specific field upload middlewares
const uploadLogo = upload.single('logo');
const uploadBanner = upload.single('banner');
const uploadCategoryImage = upload.single('image');
const uploadProfileImage = upload.single('image');

// Upload buffer to Cloudinary
const uploadFromBuffer = (buffer, options = {}) => {
  return new Promise((resolve, reject) => {
    const defaultOptions = {
      folder: 'ecommerce-platform',
      allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
      transformation: [{ width: 1000, height: 1000, crop: 'limit' }]
    };

    const uploadOptions = { ...defaultOptions, ...options };

    cloudinary.uploader.upload_stream(uploadOptions, (error, result) => {
      if (error) {
        logger.error('Cloudinary upload error:', error);
        reject(error);
      } else {
        logger.info('Image uploaded successfully:', result.public_id);
        resolve(result);
      }
    }).end(buffer);
  });
};

// Delete image from Cloudinary
const deleteImage = (publicId) => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.destroy(publicId, { invalidate: true }, (error, result) => {
      if (error) {
        logger.error('Cloudinary delete error:', error);
        reject(error);
      } else {
        logger.info('Image deleted successfully:', publicId);
        resolve(result);
      }
    });
  });
};

// Delete multiple images
const deleteImages = async (publicIds) => {
  const results = [];
  for (const publicId of publicIds) {
    try {
      const result = await deleteImage(publicId);
      results.push({ publicId, success: true, result });
    } catch (error) {
      results.push({ publicId, success: false, error: error.message });
    }
  }
  return results;
};

// Get optimized image URL
const getOptimizedUrl = (publicId, options = {}) => {
  const defaultOptions = {
    quality: 'auto',
    fetch_format: 'auto',
    ...options
  };

  return cloudinary.url(publicId, defaultOptions);
};

// Generate image transformation
const getTransformedUrl = (publicId, transformations = {}) => {
  return cloudinary.url(publicId, transformations);
};

module.exports = {
  cloudinary,
  upload,
  uploadSingle,
  uploadMultiple,
  uploadLogo,
  uploadBanner,
  uploadCategoryImage,
  uploadProfileImage,
  uploadFromBuffer,
  deleteImage,
  deleteImages,
  getOptimizedUrl,
  getTransformedUrl
};