const express = require('express');
const router = express.Router();
const { Job, Contract, Profile, sequelize } = require('../model');
const { Op } = require('sequelize');
const { ContractStatus } = require('../enums');

/**
 * @swagger
 * /jobs/unpaid:
 * get:
 * summary: Get all unpaid jobs for a user (client or contractor).
 * description: Returns a list of unpaid jobs for the authenticated user, but only for active contracts (`in_progress`).
 * security:
 * - profile_id: []
 * responses:
 * 200:
 * description: A list of unpaid jobs.
 * content:
 * application/json:
 * schema:
 * type: array
 * items:
 * $ref: '#/components/schemas/Job'
 * 401:
 * description: Unauthorized - No profile_id header or invalid profile_id.
 * 500:
 * description: Internal server error.
 */
router.get('/unpaid', async (req, res) => {
  const profile = req.profile;

  try {
    const jobs = await Job.findAll({
        where: {
            // Updated condition to consider both 'false' (0) and 'NULL' for unpaid jobs
            [Op.or]: [
              { paid: false }, // Matches paid = 0
              { paid: null }    // Matches paid IS NULL
            ]
          },
      include: [
        {
          model: Contract,
          // Only include contracts that are 'in_progress'
          // AND where the current profile is either the Client or the Contractor
          where: {
            status: ContractStatus.IN_PROGRESS,
            [Op.or]: [ // Use Op.or for logical OR condition
              { ClientId: profile.id },
              { ContractorId: profile.id }
            ]
          },
          // Optionally, include the client and contractor profiles within the contract
          // This can be useful for frontend display, but make sure not to fetch sensitive data unnecessarily.
          include: [
            { model: Profile, as: 'Client' },
            { model: Profile, as: 'Contractor' }
          ]
        }
      ]
    });

    if (!jobs || jobs.length === 0) {
      return res.status(404).json({ message: 'No unpaid jobs found for this profile on active contracts.' });
    }

    res.json(jobs);
  } catch (error) {
    console.error('Error fetching unpaid jobs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


router.get('/paid-and-unpaid', async (req, res) => {
  const profile = req.profile;

  try {
    const jobs = await Job.findAll({
      include: [
        {
          model: Contract,
          // Only include contracts that are 'in_progress'
          // AND where the current profile is either the Client or the Contractor
          where: {
            status: ContractStatus.IN_PROGRESS,
            [Op.or]: [ // Use Op.or for logical OR condition
              { ClientId: profile.id },
              { ContractorId: profile.id }
            ]
          },
          // Optionally, include the client and contractor profiles within the contract
          // This can be useful for frontend display, but make sure not to fetch sensitive data unnecessarily.
          include: [
            { model: Profile, as: 'Client' },
            { model: Profile, as: 'Contractor' }
          ]
        }
      ]
    });

    if (!jobs || jobs.length === 0) {
      return res.status(404).json({ message: 'No jobs found for this profile on active contracts.' });
    }

    res.json(jobs);
  } catch (error) {
    console.error('Error fetching jobs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


/**
 * @swagger
 * /jobs/{job_id}/pay:
 * post:
 * summary: Pay for a job.
 * description: Allows a client to pay for a specific job. The client's balance must be sufficient, and the payment is transferred to the contractor. This operation is atomic (uses a transaction).
 * parameters:
 * - in: path
 * name: job_id
 * schema:
 * type: integer
 * required: true
 * description: The ID of the job to pay.
 * security:
 * - profile_id: []
 * responses:
 * 200:
 * description: Payment successful.
 * content:
 * application/json:
 * schema:
 * type: object
 * properties:
 * message:
 * type: string
 * example: Payment successful
 * 400:
 * description: Bad request (e.g., job already paid, insufficient balance, not a client).
 * 401:
 * description: Unauthorized - No profile_id header or invalid profile_id.
 * 403:
 * description: Forbidden - Not the client for this job, or contractor trying to pay.
 * 404:
 * description: Not Found - Job not found.
 * 500:
 * description: Internal server error.
 */
router.post('/:job_id/pay', async (req, res) => {
    const { job_id } = req.params;
    const client = req.profile; // The authenticated profile is expected to be the paying client
  
    // --- Validation 1: Only clients can pay ---
    if (client.type !== 'client') {
      return res.status(403).json({ error: 'Forbidden: Only clients can pay for jobs.' });
    }
  
    // Start a database transaction.
    // This ensures that all operations (deducting from client, adding to contractor, marking job paid)
    // are treated as a single, atomic unit. If any part fails, the entire transaction is rolled back.
    const t = await sequelize.transaction();
  
    try {
      // --- Step 1: Find the Job and its associated Contract, Client, and Contractor within the transaction ---
      const job = await Job.findOne({
        where: { id: job_id },
        include: {
          model: Contract,
          include: [
            { model: Profile, as: 'Client' },     // Include the client associated with the contract
            { model: Profile, as: 'Contractor' }  // Include the contractor associated with the contract
          ]
        },
        transaction: t // Pass the transaction object
      });
  
      // --- Validation 2: Check if Job exists ---
      if (!job) {
        await t.rollback(); // Rollback if job not found
        return res.status(404).json({ error: 'Job not found.' });
      }
  
      // --- Validation 3: Check if Job is already paid ---
      // Note: We check `job.paid` which can be `true` (1) or `false` (0) or `null`.
      // If it's not strictly false, consider it already paid for this operation.
      if (job.paid === true) { // Explicitly check for true (1)
        await t.rollback();
        return res.status(400).json({ error: 'Job has already been paid.' });
      }
  
      // --- Validation 4: Check if the authenticated client is the actual client for this job's contract ---
      if (job.Contract.ClientId !== client.id) {
        await t.rollback();
        return res.status(403).json({ error: 'Forbidden: You are not the client for this job.' });
      }
  
      // --- Validation 5: Check if client has sufficient balance ---
      if (client.balance < job.price) {
        await t.rollback();
        return res.status(400).json({ error: 'Bad Request: Insufficient balance to pay for this job.' });
      }
  
      // --- Step 2: Perform the payment operations (within the transaction) ---
      const contractor = job.Contract.Contractor;
  
      // Deduct amount from client's balance
      await client.update({ balance: client.balance - job.price }, { transaction: t });
  
      // Add amount to contractor's balance
      await contractor.update({ balance: contractor.balance + job.price }, { transaction: t });
  
      // Mark the job as paid and record the payment date
      // Sequelize automatically converts JS Date objects to database-compatible formats.
      await job.update({ paid: true, paymentDate: new Date() }, { transaction: t });
  
      // --- Step 3: Commit the transaction if all operations succeed ---
      await t.commit();
      res.json({ message: 'Payment successful' });
  
    } catch (error) {
      // --- Step 4: Rollback the transaction if any error occurs ---
      await t.rollback();
      console.error('Error processing payment for job:', job_id, error);
      res.status(500).json({ error: 'Internal server error during payment processing.' });
    }
  });

module.exports = router; // Export the router instance
