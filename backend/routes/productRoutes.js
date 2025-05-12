// routes/productRoutes.js
const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const productController = require('../controllers/productController');


// Add Product
router.post('/add', upload.single('imageUrl'), productController.addProduct);

// Get all products (for admin dashboard)
router.get('/products', productController.getProducts);

router.get('/edit/:id', productController.editProduct); // Display the edit form

router.post('/update/:id', productController.updateProduct);

// Update Product
router.put('/:id', productController.updateProduct);

// Delete Product
router.get('/delete/:id', productController.deleteProduct);

// Toggle Product Listing (List/Unlist)
router.get('/toggle/:id', productController.toggleProductListing);

module.exports = router;
