const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');

// Get all lost items
router.get('/', async (req, res) => {
    try {
        const [lostItems] = await req.db.query(`
      SELECT l.*, u.name as reporter_name 
      FROM lost_item l 
      LEFT JOIN user u ON l.user_id = u.user_id
      ORDER BY l.date_lost DESC
    `);

        res.render('lost-items', {
            title: 'Lost Items',
            lostItems,
            user: req.user
        });
    } catch (error) {
        console.error(error);
        res.status(500).render('error', {
            title: 'Server Error',
            message: 'Internal server error'
        });
    }
});

// Get lost item by ID
router.get('/:id', async (req, res) => {
    try {
        const [lostItems] = await req.db.query(`
      SELECT l.*, u.name as reporter_name 
      FROM lost_item l 
      LEFT JOIN user u ON l.user_id = u.user_id
      WHERE l.lost_item_id = ?
    `, [req.params.id]);

        if (lostItems.length === 0) {
            return res.status(404).render('error', {
                title: 'Not Found',
                message: 'Lost item not found'
            });
        }

        // Get possible matched found items
        const [matchedItems] = await req.db.query(`
      SELECT * FROM found_item 
      WHERE item_name LIKE ? OR category = ?
      AND status = 'unclaimed'
    `, [`%${lostItems[0].item_name}%`, lostItems[0].category]);

        res.render('lost-item-details', {
            title: 'Lost Item Details',
            lostItem: lostItems[0],
            matchedItems,
            user: req.user
        });
    } catch (error) {
        console.error(error);
        res.status(500).render('error', {
            title: 'Server Error',
            message: 'Internal server error'
        });
    }
});

// Create lost item form
router.get('/new/item', verifyToken, (req, res) => {
    res.render('lost-item-form', {
        title: 'Report Lost Item',
        user: req.user
    });
});

// Create lost item
router.post('/', verifyToken, async (req, res) => {
    try {
        const { item_name, description, category, date_lost, location_lost } = req.body;

        if (!(item_name && category && date_lost && location_lost)) {
            return res.status(400).render('error', {
                title: 'Form Error',
                message: 'Required fields are missing'
            });
        }

        const [result] = await req.db.query(`
      INSERT INTO lost_item 
        (user_id, item_name, description, category, date_lost, location_lost, reported_by) 
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
            req.user.user_id,
            item_name,
            description || null,
            category,
            date_lost,
            location_lost,
            req.user.email
        ]);

        res.redirect('/lost-items/' + result.insertId);
    } catch (error) {
        console.error(error);
        res.status(500).render('error', {
            title: 'Server Error',
            message: 'Internal server error'
        });
    }
});

// Update lost item
router.put('/:id', verifyToken, async (req, res) => {
    try {
        const { item_name, description, category, date_lost, location_lost, status } = req.body;

        // Check if user owns this lost item
        const [lostItems] = await req.db.query(
            'SELECT * FROM lost_item WHERE lost_item_id = ? AND user_id = ?',
            [req.params.id, req.user.user_id]
        );

        if (lostItems.length === 0) {
            return res.status(403).render('error', {
                title: 'Forbidden',
                message: 'You are not authorized to update this item'
            });
        }

        await req.db.query(`
      UPDATE lost_item SET
        item_name = ?,
        description = ?,
        category = ?,
        date_lost = ?,
        location_lost = ?,
        status = ?
      WHERE lost_item_id = ?
    `, [
            item_name,
            description || null,
            category,
            date_lost,
            location_lost,
            status || 'pending',
            req.params.id
        ]);

        res.redirect('/lost-items/' + req.params.id);
    } catch (error) {
        console.error(error);
        res.status(500).render('error', {
            title: 'Server Error',
            message: 'Internal server error'
        });
    }
});

// Delete lost item
router.delete('/:id', verifyToken, async (req, res) => {
    try {
        // Check if user owns this lost item
        const [lostItems] = await req.db.query(
            'SELECT * FROM lost_item WHERE lost_item_id = ? AND user_id = ?',
            [req.params.id, req.user.user_id]
        );

        if (lostItems.length === 0) {
            return res.status(403).render('error', {
                title: 'Forbidden',
                message: 'You are not authorized to delete this item'
            });
        }

        await req.db.query(
            'DELETE FROM lost_item WHERE lost_item_id = ?',
            [req.params.id]
        );

        res.redirect('/lost-items');
    } catch (error) {
        console.error(error);
        res.status(500).render('error', {
            title: 'Server Error',
            message: 'Internal server error'
        });
    }
});

module.exports = router; 