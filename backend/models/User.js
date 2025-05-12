const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    username: { type: String, required: true },
    password: { type: String, required: true }
});

userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) {
        return next();
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

userSchema.methods.comparePassword = function(candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);

// Create a default admin user
(async () => {
    const existingAdmin = await User.findOne({ username: 'admin@curtainraiser.com' });
    if (!existingAdmin) {
        const admin = new User({ username: 'admin@curtainraiser.com', password: 'admin@admin' });
        await admin.save();
    }
})();

module.exports = User;
