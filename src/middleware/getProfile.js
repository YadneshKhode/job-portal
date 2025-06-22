const { Profile } = require('../model');

async function getProfile(req, res, next) {
    const profileId = req.headers.profile_id || 0;
    if (!profileId) {
        return res.status(401).json({ error: 'Unauthorized: No profile_id header provided' });
    }

    try {
        const profile = await Profile.findOne({ where: { id: profileId } });
        if (!profile) {
            return res.status(401).json({ error: 'Unauthorized: Invalid profile_id' });
        }
        req.profile = profile; 
        next();
    } catch (error) {
        console.error('Error fetching profile in getProfile middleware:', error);
        res.status(500).json({ error: 'Internal server error during authentication' });
    }
}

module.exports = { getProfile };
