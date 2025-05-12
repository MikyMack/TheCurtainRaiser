
const cloudinary = require('cloudinary').v2;

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

exports.extractPublicId = function(url) {
    if (!url) return null;
    
    try {
        const cleanUrl = url.split('?')[0];
        const parts = cleanUrl.split('/');
        const uploadIndex = parts.findIndex(part => part === 'upload');
        if (uploadIndex === -1) return null;
        const relevantParts = parts.slice(uploadIndex + 2);
        return relevantParts.join('/').replace(/\..+$/, '');
    } catch (err) {
        console.error('Error parsing Cloudinary URL:', err);
        return null;
    }
};

module.exports = cloudinary;
