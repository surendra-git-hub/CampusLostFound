const express = require('express');
const router = express.Router();

// Get recent lost items
router.get('/lost-items/recent', async (req, res) => {
    try {
        const [lostItems] = await req.db.query(`
      SELECT lost_item_id, item_name, description, category, date_lost
      FROM lost_item
      WHERE status = 'pending'
      ORDER BY date_lost DESC
      LIMIT 5
    `);

        res.json(lostItems);
    } catch (error) {
        console.error('Error fetching recent lost items:', error);
        res.status(500).json({ error: 'Failed to fetch recent lost items' });
    }
});

// Get recent found items
router.get('/found-items/recent', async (req, res) => {
    try {
        const [foundItems] = await req.db.query(`
      SELECT found_item_id, item_name, description, category, date_found, image_url
      FROM found_item
      WHERE status = 'unclaimed'
      ORDER BY date_found DESC
      LIMIT 5
    `);

        res.json(foundItems);
    } catch (error) {
        console.error('Error fetching recent found items:', error);
        res.status(500).json({ error: 'Failed to fetch recent found items' });
    }
});

// Search lost items
router.get('/lost-items/search', async (req, res) => {
    try {
        const { query } = req.query;

        if (!query) {
            return res.status(400).json({ error: 'Search query is required' });
        }

        const [lostItems] = await req.db.query(`
      SELECT l.*, u.name as reporter_name 
      FROM lost_item l
      LEFT JOIN user u ON l.user_id = u.user_id
      WHERE (l.item_name LIKE ? OR l.description LIKE ? OR l.category LIKE ?)
      AND l.status = 'pending'
      ORDER BY l.date_lost DESC
    `, [`%${query}%`, `%${query}%`, `%${query}%`]);

        res.json(lostItems);
    } catch (error) {
        console.error('Error searching lost items:', error);
        res.status(500).json({ error: 'Failed to search lost items' });
    }
});

// Search found items
router.get('/found-items/search', async (req, res) => {
    try {
        const { query } = req.query;

        if (!query) {
            return res.status(400).json({ error: 'Search query is required' });
        }

        const [foundItems] = await req.db.query(`
      SELECT *
      FROM found_item
      WHERE (item_name LIKE ? OR description LIKE ? OR category LIKE ?)
      AND status = 'unclaimed'
      ORDER BY date_found DESC
    `, [`%${query}%`, `%${query}%`, `%${query}%`]);

        res.json(foundItems);
    } catch (error) {
        console.error('Error searching found items:', error);
        res.status(500).json({ error: 'Failed to search found items' });
    }
});

module.exports = router; 