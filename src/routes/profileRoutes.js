// src/routes/profileRoutes.js
const express = require('express');
const router = express.Router();
const { Profile } = require('../model'); // Adjust path relative to profileRoutes.js

/**
 * @swagger
 * /profiles:
 * get:
 * summary: Returns a list of all profiles (client and contractor).
 * responses:
 * 200:
 * description: A list of profiles.
 * content:
 * application/json:
 * schema:
 * type: array
 * items:
 * $ref: '#/components/schemas/Profile'
 * 500:
 * description: Internal server error.
 */
router.get('/', async (req, res) => {
  try {
    const profiles = await Profile.findAll();
    // For security, you might want to omit sensitive fields like 'balance'
    // for general profile listing if not explicitly needed, but the assignment doesn't specify.
    res.json(profiles);
  } catch (error) {
    console.error('Error fetching profiles:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
