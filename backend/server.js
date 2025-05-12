require('dotenv').config({ path: './backend/.env' });
const mongoose = require('mongoose');
const app = require('./app');  // Import your app setup

const PORT = process.env.PORT || 3012;
const MONGO_URI = process.env.MONGO_URI;

// Connect to MongoDB
mongoose.connect(MONGO_URI)
    .then(() => {
        console.log("MongoDB connected successfully");
    })
    .catch((err) => {
        console.error("Error connecting to MongoDB:", err);
    });

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
