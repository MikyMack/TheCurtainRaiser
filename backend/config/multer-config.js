const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('./cloudinary'); // Make sure this is properly configured

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'Thecurtainraiser_images',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif'],
    transformation: [{ width: 800, height: 600, crop: 'limit' }],
    public_id: (req, file) => {
      const timestamp = Date.now();
      return `${timestamp}-${file.originalname.split('.')[0]}`;
    }
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
  }
});

module.exports = upload;