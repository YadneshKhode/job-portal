const express = require('express');
const router = express.Router();
const { Job, Contract, sequelize } = require('../model');
const { Op } = require('sequelize');
const { ContractStatus } = require('../enums');

/**
 * @swagger
 * /balances/deposit/{userId}:
 * post:
 * summary: Deposit money into a client's balance.
 * description: Allows a client to deposit money into their account. A client cannot deposit more than 25% of the total amount of unpaid jobs they have at the time of deposit.
 * parameters:
 * - in: path
 * name: userId
 * schema:
 * type: integer
 * required: true
 * description: The ID of the client to deposit money into.
 * requestBody:
 * required: true
 * content:
 * application/json:
 * schema:
 * type: object
 * properties:
 * amount:
 * type: number
 * format: float
 * example: 100.50
 * security:
 * - profile_id: []
 * responses:
 * 200:
 * description: Deposit successful.
 * content:
 * application/json:
 * schema:
 * type: object
 * properties:
 * message:
 * type: string
 * example: Deposit successful
 * newBalance:
 * type: number
 * format: float
 * example: 1234.50
 * 400:
 * description: Bad request (e.g., invalid amount, deposit limit exceeded).
 * 401:
 * description: Unauthorized - No profile_id header or invalid profile_id.
 * 403:
 * description: Forbidden - Not authorized to deposit to this user, or user is not a client.
 * 500:
 * description: Internal server error.
 */
router.post('/deposit/:userId', async (req, res) => {
  const { userId } = req.params;
  let { amount } = req.body;

  const clientProfile = req.profile;

  // --- Validation 1: Ensure authenticated user is the target user for deposit ---
  // Convert userId from params to a number for strict comparison
  if (clientProfile.id !== parseInt(userId, 10)) {
    return res.status(403).json({ error: 'Forbidden: You can only deposit into your own account.' });
  }

  // --- Validation 2: Only clients can deposit ---
  if (clientProfile.type !== 'client') {
    return res.status(403).json({ error: 'Forbidden: Only clients can deposit money.' });
  }

  // --- Validation 3: Validate deposit amount ---
  amount = parseFloat(amount); // Parse amount from request body to a float

  if (isNaN(amount) || amount <= 0) {
    return res.status(400).json({ error: 'Bad Request: Deposit amount must be a positive number.' });
  }

  // Optional: Round to 2 decimal places for currency to avoid floating point issues
  amount = parseFloat(amount.toFixed(2));
  if (amount <= 0) { // Check again after rounding if it became 0 or less
      return res.status(400).json({ error: 'Bad Request: Deposit amount must be positive after rounding.' });
  }


  const t = await sequelize.transaction(); // Start a transaction

  try {
    // --- Step 1: Calculate total amount of unpaid jobs for this client ---
    // We need to find all unpaid jobs belonging to this client's active contracts.
    const unpaidJobs = await Job.findAll({
      attributes: ['price'], // Only need the price for summation
      where: {
        [Op.or]: [ // Check for both false (0) and null for unpaid status
            { paid: false },
            { paid: null }
        ],
      },
      include: {
        model: Contract,
        attributes: [], // Don't need Contract attributes for this sum
        where: {
          ClientId: clientProfile.id, // Only contracts where this client is the Client
          status: ContractStatus.IN_PROGRESS,
        },
      },
      transaction: t, // Include in the transaction
      raw: true // Get plain data for easy summation
    });

    // Sum the prices of all found unpaid jobs
    const totalJobsToPay = unpaidJobs.reduce((sum, job) => sum + parseFloat(job.price), 0);

    // --- Step 2: Apply the 25% deposit limit rule ---
    const maxDepositAllowed = totalJobsToPay * 0.25;

    // Note: The assignment specifies "25% of the total of jobs to pay at the time of deposit".
    // This calculation correctly applies that. If there are no unpaid jobs, maxDepositAllowed will be 0.
    if (amount > maxDepositAllowed) {
      await t.rollback();
      return res.status(400).json({
        error: `Bad Request: Cannot deposit more than 25% of your total jobs to pay ($${maxDepositAllowed.toFixed(2)}).`
      });
    }

    // --- Step 3: Update the client's balance ---
    await clientProfile.update({ balance: clientProfile.balance + amount }, { transaction: t });

    // --- Step 4: Commit the transaction ---
    await t.commit();
    res.json({
      message: 'Deposit successful',
      newBalance: parseFloat(clientProfile.balance) // Return the updated balance
    });

  } catch (error) {
    // --- Step 5: Rollback the transaction on error ---
    await t.rollback();
    console.error('Error processing deposit for user:', userId, error);
    res.status(500).json({ error: 'Internal server error during deposit processing.' });
  }
});

module.exports = router;
