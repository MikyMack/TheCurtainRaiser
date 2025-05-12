require('dotenv').config({ path: './backend/.env' });
const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const multer = require('multer'); 
const upload = require('./config/multer-config');
const cors = require('cors');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const flash = require('express-flash');
const cloudinary = require('./config/cloudinary');

const authRoutes = require('./routes/authRoutes');
const authMiddleware = require('./middleware/auth');
const authController = require('./controllers/authController');
const Service= require("./models/Service");
const Announcement= require("./models/Announcement");
const Gallery= require("./models/Gallery");
const { log } = require('console');

const app = express();
app.use(cors()); 
app.use(express.static(path.join(__dirname, '../assets')));
app.use('/uploads', express.static('uploads')); 

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(
    session({
        secret: process.env.SESSION_SECRET, 
        resave: false,
        saveUninitialized: false,
        store: MongoStore.create({ mongoUrl: process.env.MONGO_URI })
    })
);
app.use(flash());
// Routes
app.use('/api/auth', authRoutes);

// Routes for Rendering Views
app.get('/', async (req, res) => {
    try {
        const services = await Service.find({ isActive: true }).exec();
        const gallery = await Gallery.find().limit(12).exec(); 
        const announcements = await Announcement.find().sort({ createdAt: -1 }).limit(10).exec();
        
        res.render('index', { 
            title: 'Home',
            services,
            gallery,
            announcements
        });
    } catch (err) {
        res.render('index', { 
            title: 'Home',
            services: [],
            gallery: [],
            announcements: []
        });
    }
});

app.get('/about', (req, res) => {
    res.render('about', { title: 'About Us' });
});

app.get('/services', async (req, res) => {
    try {
        const services = await Service.find({ isActive: true }).exec();
        res.render('services', { 
            title: 'Services',
            services 
        });
    } catch (err) {
        console.error('Error fetching services:', err);
        res.render('services', { 
            title: 'Services',
            services: [] 
        });
    }
});

app.get('/gallery', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 16; // Items per page
        const skip = (page - 1) * limit;
        const category = req.query.category || 'all';
        
        // Build query based on category
        const query = {};
        if (category && category !== 'all') {
            query.category = category;
        }

        // Get all unique categories for filter
        const categories = await Gallery.distinct('category');
        
        // Get paginated results
        const [totalItems, galleryItems] = await Promise.all([
            Gallery.countDocuments(query),
            Gallery.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .exec()
        ]);

        const totalPages = Math.ceil(totalItems / limit);
        
        res.render('gallery', {
            title: 'Gallery',
            galleryItems,
            categories,
            currentCategory: category,
            currentPage: page,
            totalPages,
            hasNextPage: page < totalPages,
            hasPreviousPage: page > 1,
            nextPage: page + 1,
            previousPage: page - 1
        });
    } catch (err) {
        console.error('Error fetching gallery items:', err);
        res.render('gallery', {
            title: 'Gallery',
            galleryItems: [],
            categories: [],
            currentCategory: 'all',
            currentPage: 1,
            totalPages: 1
        });
    }
});

app.get('/contact', (req, res) => {
    res.render('contact', { title: 'Contact Us' });
});


app.get('/login', (req, res) => {
    res.render('login', { title: 'Admin Login' });
});

app.get('/logout', authController.logout);

app.get('/admin-dashboard', authMiddleware, async (req, res) => {
    try {
        const services = await Service.find({}).sort({ createdAt: -1 });
        
        res.render('admin-dashboard', { 
            title: 'Admin Dashboard',
            services: services,
            messages: {
                success: req.flash('success'),
                error: req.flash('error')
            }
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        req.flash('error', 'Error loading dashboard');
        res.redirect('/');
    }
});
app.get('/admin-announcements', authMiddleware, async (req, res) => {
    try {
        const announcement = await Announcement.find({}).sort({ createdAt: -1 });
        
        res.render('admin-announcements', { 
            title: 'Admin Dashboard',
            announcements: announcement,
            messages: {
                success: req.flash('success'),
                error: req.flash('error')
            }
        });
    } catch (error) {
        req.flash('error', 'Error loading dashboard');
        res.redirect('/');
    }
});


// Create Service - Process Form
app.post('/create-services', authMiddleware, upload.single('image'), async (req, res) => {
    try {
        const { name, description, points } = req.body;
        const pointsArray = points ? points.split('\n').filter(point => point.trim() !== '') : [];
        
        const newService = new Service({
            name,
            description,
            points: pointsArray,
            imageUrl: req.file ? req.file.path : null // Use Cloudinary URL
        });

        await newService.save();
        req.flash('success', 'Service created successfully');
        res.redirect('/admin-dashboard');
    } catch (error) {
        console.error(error);
        req.flash('error', 'Error creating service: ' + error.message);
        res.redirect('/services/add');
    }
});

// Update Service
app.post('/services/update/:id', authMiddleware, upload.single('image'), async (req, res) => {
    try {
        const { name, description, points } = req.body;
        const pointsArray = points ? points.split('\n').filter(point => point.trim() !== '') : [];
        
        // Get the existing service first
        const existingService = await Service.findById(req.params.id);
        
        const updateData = {
            name,
            description,
            points: pointsArray
        };

        if (req.file) {
            // Delete old image from Cloudinary if it exists
            if (existingService.imageUrl) {
                try {
                    const publicId = existingService.imageUrl.split('/').slice(-2).join('/').split('.')[0];
                    await cloudinary.uploader.destroy(publicId);
                } catch (err) {
                    console.error('Error deleting old image from Cloudinary:', err);
                }
            }
            updateData.imageUrl = req.file.path;
        }

        await Service.findByIdAndUpdate(req.params.id, updateData);
        req.flash('success', 'Service updated successfully');
        res.redirect('/admin-dashboard');
    } catch (error) {
        console.error(error);
        req.flash('error', 'Error updating service: ' + error.message);
        res.redirect(`/services/edit/${req.params.id}`);
    }
});
  
  // Delete Service
  app.post('/services/delete/:id', authMiddleware, async (req, res) => {
    try {
        // Get the service first to access the image URL
        const service = await Service.findById(req.params.id);
        
        if (service && service.imageUrl) {
            try {
                // Extract public ID from Cloudinary URL
                const publicId = service.imageUrl.split('/').slice(-2).join('/').split('.')[0];
                await cloudinary.uploader.destroy(publicId);
            } catch (err) {
                console.error('Error deleting image from Cloudinary:', err);
            }
        }
        
        // Delete the service from database
        await Service.findByIdAndDelete(req.params.id);
        req.flash('success', 'Service deleted successfully');
    } catch (error) {
        console.error(error);
        req.flash('error', 'Error deleting service');
    }
    res.redirect('/admin-dashboard');
});
  
  // Toggle Service Active Status
  app.post('/services/toggle-active/:id', authMiddleware, async (req, res) => {
    try {
      const service = await Service.findById(req.params.id);
      if (!service) {
        req.flash('error', 'Service not found');
        return res.redirect('/admin-dashboard');
      }
      
      service.isActive = !service.isActive;
      await service.save();
      
      req.flash('success', `Service marked as ${service.isActive ? 'Active' : 'Inactive'}`);
    } catch (error) {
      console.error(error);
      req.flash('error', 'Error updating service status');
    }
    res.redirect('/admin-dashboard');
  });


//   create announcements 
  app.post('/create-announcements', authMiddleware, upload.single('image'), async (req, res) => {
    try {
        const { title, description, date } = req.body;
        
        const newAnnouncement = new Announcement({
            title,
            description,
            date: date || Date.now(),
            imageUrl: req.file ? req.file.path : null
        });

        await newAnnouncement.save();
        req.flash('success', 'Announcement created successfully');
        res.redirect('/admin-announcements');
    } catch (error) {
        req.flash('error', 'Error creating announcement');
        res.redirect('/admin-announcements');
    }
});


// POST - Update announcement
app.post('/announcements/update/:id', authMiddleware, upload.single('image'), async (req, res) => {
    try {
        const { title, description, date } = req.body;
        const existingAnnouncement = await Announcement.findById(req.params.id);
        
        const updateData = {
            title,
            description,
            date: date || existingAnnouncement.date
        };

        if (req.file) {
            // Delete old image if exists
            if (existingAnnouncement.imageUrl) {
                try {
                    const publicId = existingAnnouncement.imageUrl
                        .split('/')
                        .slice(-2)
                        .join('/')
                        .split('.')[0];
                    await cloudinary.uploader.destroy(publicId);
                } catch (err) {
                    console.error('Error deleting old image:', err);
                }
            }
            updateData.imageUrl = req.file.path;
        }

        await Announcement.findByIdAndUpdate(req.params.id, updateData);
        req.flash('success', 'Announcement updated successfully');
        res.redirect('/admin-announcements');
    } catch (error) {
        console.error(error);
        req.flash('error', 'Error updating announcement');
        res.redirect(`/admin-announcements`);
    }
});

// POST - Delete announcement
app.post('/announcements/delete/:id', authMiddleware, async (req, res) => {
    try {
        const announcement = await Announcement.findById(req.params.id);
        
        if (announcement?.imageUrl) {
            try {
                const publicId = announcement.imageUrl
                    .split('/')
                    .slice(-2)
                    .join('/')
                    .split('.')[0];
                await cloudinary.uploader.destroy(publicId);
            } catch (err) {
                console.error('Error deleting image:', err);
            }
        }
        
        await Announcement.findByIdAndDelete(req.params.id);
        req.flash('success', 'Announcement deleted successfully');
    } catch (error) {
        console.error(error);
        req.flash('error', 'Error deleting announcement');
    }
    res.redirect('/admin-announcements');
});

// GET - Display all gallery items with categories and pagination
app.get('/admin-gallery', authMiddleware, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 16;
        const skip = (page - 1) * limit;
        const currentCategory = req.query.category || 'All';

        const categoryFilter = currentCategory === 'All' ? {} : { category: currentCategory };

        const [galleryItems, categories, totalItems] = await Promise.all([
            Gallery.find(categoryFilter).sort({ createdAt: -1 }).skip(skip).limit(limit),
            Gallery.distinct('category'),
            Gallery.countDocuments(categoryFilter)
        ]);

        const totalPages = Math.ceil(totalItems / limit);

        res.render('admin-gallery', {
            title: 'Gallery Management',
            galleryItems: galleryItems || [], 
            categories: categories || [], 
            currentCategory,
            currentPage: page,
            totalPages,
            hasNextPage: page < totalPages,
            hasPreviousPage: page > 1,
            nextPage: page + 1,
            previousPage: page - 1,
            messages: {
                success: req.flash('success'),
                error: req.flash('error')
            }
        });
    } catch (error) {
        console.error(error);
        req.flash('error', 'Error loading gallery');
        res.redirect('/admin-dashboard');
    }
});

// POST - Create new gallery item
app.post('/create-gallery', authMiddleware, upload.single('image'), async (req, res) => {
    try {
        const { title, category } = req.body;
        
        if (!req.file) {
            throw new Error('Image is required');
        }

        const newGalleryItem = new Gallery({
            title,
            imageUrl: req.file.path,
            category
        });

        await newGalleryItem.save();
        req.flash('success', 'Gallery item added successfully');
        res.redirect('/admin-gallery');
    } catch (error) {
        console.error(error);
        req.flash('error', 'Error adding gallery item: ' + error.message);
        res.redirect('/admin-gallery');
    }
});

// POST - Update gallery item
app.post('/gallery/update/:id', authMiddleware, upload.single('image'), async (req, res) => {
    try {
        const { title, category } = req.body;
        const existingItem = await Gallery.findById(req.params.id);
        
        const updateData = {
            title,
            category
        };

        if (req.file) {
            // Delete old image from Cloudinary
            if (existingItem.imageUrl) {
                try {
                    const publicId = existingItem.imageUrl
                        .split('/')
                        .slice(-2)
                        .join('/')
                        .split('.')[0];
                    await cloudinary.uploader.destroy(publicId);
                } catch (err) {
                    console.error('Error deleting old image:', err);
                }
            }
            updateData.imageUrl = req.file.path;
        }

        await Gallery.findByIdAndUpdate(req.params.id, updateData);
        req.flash('success', 'Gallery item updated successfully');
        res.redirect('/admin-gallery');
    } catch (error) {
        console.error(error);
        req.flash('error', 'Error updating gallery item');
        res.redirect('/admin-gallery');
    }
});

// POST - Delete gallery item
app.post('/gallery/delete/:id', authMiddleware, async (req, res) => {
    try {
        const galleryItem = await Gallery.findById(req.params.id);
        
        if (galleryItem?.imageUrl) {
            try {
                const publicId = galleryItem.imageUrl
                    .split('/')
                    .slice(-2)
                    .join('/')
                    .split('.')[0];
                await cloudinary.uploader.destroy(publicId);
            } catch (err) {
                console.error('Error deleting image:', err);
            }
        }
        
        await Gallery.findByIdAndDelete(req.params.id);
        req.flash('success', 'Gallery item deleted successfully');
    } catch (error) {
        console.error(error);
        req.flash('error', 'Error deleting gallery item');
    }
    res.redirect('/admin-gallery');
});



app.use((err, req, res, next) => {
    console.error('Error:', err); 
    
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(413).send('File size exceeds the limit of 5 MB');
        }
        return res.status(400).send('File upload error: ' + err.message);
    } else if (err.message === 'Only image files are allowed!') {
        return res.status(400).send('Only image files are allowed!');
    }
    
    // Handle other types of errors
    res.status(500).send('Something went wrong!');
});



module.exports = app;