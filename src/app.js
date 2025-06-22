// const express = require('express');
// const bodyParser = require('body-parser');
// const {sequelize} = require('./model')
// const {getProfile} = require('./middleware/getProfile')
// const app = express();
// app.use(bodyParser.json());
// app.set('sequelize', sequelize)
// app.set('models', sequelize.models)

// /**
//  * FIX ME!
//  * @returns contract by id
//  */
// app.get('/contracts/:id',getProfile ,async (req, res) =>{
//     const {Contract} = req.app.get('models')
//     const {id} = req.params
//     const contract = await Contract.findOne({where: {id}})
//     if(!contract) return res.status(404).end()
//     res.json(contract)
// })

// process.on('uncaughtException', (err) => {
//     console.error('Uncaught Exception:', err);
//     process.exit(1);
// });
// module.exports = app;


// src/app.js
const express = require('express');
const { sequelize } = require('./model'); // Import the sequelize instance
const { getProfile } = require('./middleware/getProfile'); // Import our getProfile middleware
const profileRoutes = require('./routes/profileRoutes'); // Import the new profile routes
const cors = require('cors'); // Import cors to handle cross-origin requests from React app

const app = express();

// Middleware to parse JSON request bodies
app.use(express.json());

// Middleware to enable CORS (Cross-Origin Resource Sharing)
// This is crucial for your React frontend to be able to make requests to this backend.
// In a real production app, you might configure this more strictly.
app.use(cors());

app.set('sequelize', sequelize)
app.set('models', sequelize.models)


// --- Route Registration ---
// The /profiles route does not need the getProfile middleware for listing all profiles
app.use('/profiles', profileRoutes);

// Other routes that require authentication will use getProfile middleware
// We'll add these as we implement more APIs:
// app.use('/jobs', getProfile, jobRoutes);
// app.use('/balances', getProfile, balanceRoutes);
// app.use('/admin', adminRoutes); // Admin routes often have different auth or no auth

// Basic health check endpoint (optional but good practice)
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

module.exports = app; // Export the Express app instance
