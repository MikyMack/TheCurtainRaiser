// controllers/authController.js
const User = require('../models/User'); // Assuming you have a User model

exports.login = async (req, res) => {
    const { email, password } = req.body;
console.log(req.body);

  
    if (email === 'admin@curtainraiser.com' && password === 'admin@admin') {
        req.session.user = { email };
        res.redirect('/admin-dashboard');
    } else {
        res.render('login', { title: 'Admin Login', error: 'Invalid email or password' });
    }
};

exports.logout = (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.redirect('/admin-dashboard');
        }
        res.clearCookie('connect.sid');
        res.redirect('/login');
    });
};
