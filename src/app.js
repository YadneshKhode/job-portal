const express = require('express');
const { sequelize } = require('./model'); 
const { getProfile } = require('./middleware/getProfile');
const profileRoutes = require('./routes/profileRoutes');
const jobRoutes = require('./routes/jobRoutes'); 
const balanceRoutes = require('./routes/balanceRoutes');
const adminRoutes = require('./routes/adminRoutes');

const cors = require('cors'); // Import cors to handle cross-origin requests from React app

const app = express();

app.use(express.json());
app.use(cors());

app.set('sequelize', sequelize)
app.set('models', sequelize.models)

// --- Route Registration ---
app.use('/profiles', profileRoutes);
app.use('/jobs', getProfile, jobRoutes);
app.use('/balances', getProfile, balanceRoutes);
app.use('/admin', adminRoutes);

// Basic health check endpoint
app.get('/healthz', (req, res) => {
  res.status(200).send('OK');
});

// Error handling middleware
// This should be the last middleware added
app.use((err, req, res, next) => {
    console.error('Global Error Handler:', err.stack);
    res.status(err.status || 500).json({
        error: err.message || 'An unexpected error occurred.'
    });
});

process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    process.exit(1);
});

module.exports = app;
