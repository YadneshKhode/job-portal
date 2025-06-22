const app = require('./app'); // Import the Express app instance
const { sequelize } = require('./model'); // Import the sequelize instance

const PORT = process.env.PORT || 3001; // Use environment variable for port or default to 3001

/**
 * @function start
 * @description Initializes the database connection and starts the Express server.
 */
async function start() {
  try {
    // Test the database connection
    await sequelize.authenticate();
    console.log('Connection to DB has been established successfully.');

    // Start the Express server
    app.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
    });

  } catch (error) {
    console.error(`ERROR: An error occurred during server startup: ${error.message}`);
    // Exit the process with an error code if startup fails
    process.exit(1);
  }
}

// Call the start function to kick off the application
start();