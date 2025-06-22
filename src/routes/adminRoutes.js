const express = require('express');
const router = express.Router();
const { Job, Contract, Profile, sequelize } = require('../model');
const { Op } = require('sequelize');

/**
 * @swagger
 * /admin/best-profession:
 * get:
 * summary: Returns the profession that earned the most money within a date range.
 * description: Calculates the total money earned by each contractor profession for paid jobs within the specified start and end dates, returning the top profession.
 * parameters:
 * - in: query
 * name: start
 * schema:
 * type: string
 * format: date
 * required: true
 * description: Start date (e.g., YYYY-MM-DD).
 * - in: query
 * name: end
 * schema:
 * type: string
 * format: date
 * required: true
 * description: End date (e.g., YYYY-MM-DD).
 * responses:
 * 200:
 * description: The profession with the highest earnings.
 * content:
 * application/json:
 * schema:
 * type: object
 * properties:
 * totalEarned:
 * type: number
 * format: float
 * example: 5000.00
 * profession:
 * type: string
 * example: Programmer
 * 400:
 * description: Bad request (e.g., missing or invalid date parameters).
 * 404:
 * description: No professions found in the given date range.
 * 500:
 * description: Internal server error.
 */
router.get('/best-profession', async (req, res) => {
  const { start, end } = req.query;

  // --- Validation 1: Check for required date parameters ---
  if (!start || !end) {
    return res.status(400).json({ error: 'Bad Request: Both start and end dates are required.' });
  }

  // --- Validation 2: Validate date format ---
  const startDate = new Date(start);
  const endDate = new Date(end);

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return res.status(400).json({ error: 'Bad Request: Invalid date format. Use YYYY-MM-DD.' });
  }

  // Adjust endDate to include the entire day (up to the last millisecond)
  // This ensures that jobs paid on the `end` date are included.
  endDate.setHours(23, 59, 59, 999);

  try {
    const result = await Job.findAll({
      attributes: [
        // Sum the 'price' of paid jobs
        [sequelize.fn('sum', sequelize.col('price')), 'totalEarned'],
        // Group by the contractor's profession
        [sequelize.col('Contract.Contractor.profession'), 'profession'],
      ],
      where: {
        paid: true, // Only consider paid jobs
        paymentDate: {
          [Op.between]: [startDate, endDate], // Filter by payment date range
        },
      },
      include: {
        model: Contract,
        attributes: [], // We don't need Contract's own attributes
        include: {
          model: Profile,
          as: 'Contractor', // Include the Contractor profile
          where: { type: 'contractor' }, // Ensure it's a contractor profile
          attributes: [], // We don't need Contractor's own attributes (except profession for grouping)
        }
      },
      group: ['Contract.Contractor.profession'], // Group results by profession
      order: [[sequelize.fn('sum', sequelize.col('price')), 'DESC']], // Order by totalEarned descending
      limit: 1, // We only need the top earning profession
      raw: true // Return plain data objects, not Sequelize instances
    });

    // --- Handle no results found ---
    if (result.length === 0) {
      return res.status(404).json({ message: 'No professions found with earnings in the given date range.' });
    }

    // The result[0] will be the single best profession
    res.json(result[0]);

  } catch (error) {
    console.error('Error fetching best profession:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /admin/best-clients:
 * get:
 * summary: Returns clients who paid the most for jobs within a time period.
 * description: Fetches clients who have paid the most for jobs within the specified date range, with an optional limit.
 * parameters:
 * - in: query
 * name: start
 * schema:
 * type: string
 * format: date
 * required: true
 * description: Start date (e.g., YYYY-MM-DD).
 * - in: query
 * name: end
 * schema:
 * type: string
 * format: date
 * required: true
 * description: End date (e.g., YYYY-MM-DD).
 * - in: query
 * name: limit
 * schema:
 * type: integer
 * default: 2
 * description: The maximum number of clients to return.
 * responses:
 * 200:
 * description: A list of top clients by amount paid.
 * content:
 * application/json:
 * schema:
 * type: array
 * items:
 * type: object
 * properties:
 * id:
 * type: integer
 * example: 1
 * fullName:
 * type: string
 * example: Reece Moyer
 * paid:
 * type: number
 * format: float
 * example: 100.3
 * 400:
 * description: Bad request (e.g., missing or invalid date/limit parameters).
 * 404:
 * description: No clients found in the given date range.
 * 500:
 * description: Internal server error.
 */
router.get('/best-clients', async (req, res) => {
  const { start, end, limit = 2 } = req.query; // Default limit to 2

  // --- Validation 1: Check for required date parameters ---
  if (!start || !end) {
    return res.status(400).json({ error: 'Bad Request: Both start and end dates are required.' });
  }

  // --- Validation 2: Validate date format ---
  const startDate = new Date(start);
  const endDate = new Date(end);
  const parsedLimit = parseInt(limit, 10); // Parse limit to an integer

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return res.status(400).json({ error: 'Bad Request: Invalid date format. Use YYYY-MM-DD.' });
  }
  if (isNaN(parsedLimit) || parsedLimit <= 0) {
    return res.status(400).json({ error: 'Bad Request: Limit must be a positive integer.' });
  }

  // Adjust endDate to include the entire day
  endDate.setHours(23, 59, 59, 999);

  try {
    const result = await Job.findAll({
      attributes: [
        // Select client ID, first name, last name, and sum of paid prices
        [sequelize.col('Contract.Client.id'), 'id'],
        [sequelize.col('Contract.Client.firstName'), 'firstName'],
        [sequelize.col('Contract.Client.lastName'), 'lastName'],
        [sequelize.fn('sum', sequelize.col('price')), 'paid'],
      ],
      where: {
        paid: true, // Only consider paid jobs
        paymentDate: {
          [Op.between]: [startDate, endDate], // Filter by payment date range
        },
      },
      include: {
        model: Contract,
        attributes: [], // Don't need Contract's own attributes
        include: {
          model: Profile,
          as: 'Client', // Include the Client profile
          where: { type: 'client' }, // Ensure it's a client profile
          attributes: [], // Don't need Client's own attributes (except for those selected above)
        }
      },
      // Group by client ID, first name, and last name to get sums per client
      group: ['Contract.Client.id', 'Contract.Client.firstName', 'Contract.Client.lastName'],
      order: [[sequelize.fn('sum', sequelize.col('price')), 'DESC']], // Order by total paid descending
      limit: parsedLimit, // Apply the limit parameter
      raw: true // Return plain data objects
    });

    // --- Post-processing: Format to include 'fullName' and ensure 'paid' is float ---
    // As discussed, this is the most straightforward way to get 'fullName'
    const formattedResult = result.map(client => ({
      id: client.id,
      fullName: `${client.firstName} ${client.lastName}`, // Combine firstName and lastName
      paid: parseFloat(client.paid), // Ensure 'paid' is a float number
    }));

    if (formattedResult.length === 0) {
      return res.status(404).json({ message: 'No clients found with payments in the given date range.' });
    }

    res.json(formattedResult);

  } catch (error) {
    console.error('Error fetching best clients:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
