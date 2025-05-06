const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

// Set up multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: function (req, file, cb) {
        const filetypes = /jpeg|jpg|png|gif/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error("Only images allowed"));
    }
});

// Get all found items
router.get('/', async (req, res) => {
    try {
        const [foundItems] = await req.db.query(`
      SELECT * FROM found_item
      ORDER BY date_found DESC
    `);

        res.render('found-items', {
            title: 'Found Items',
            foundItems,
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

// Get found item by ID
router.get('/:id', async (req, res) => {
    try {
        const [foundItems] = await req.db.query(
            'SELECT * FROM found_item WHERE found_item_id = ?',
            [req.params.id]
        );

        if (foundItems.length === 0) {
            return res.status(404).render('error', {
                title: 'Not Found',
                message: 'Found item not found'
            });
        }

        // Get possible matched lost items
        const [similarLostItems] = await req.db.query(`
      SELECT l.*, u.name as reporter_name 
      FROM lost_item l 
      LEFT JOIN user u ON l.user_id = u.user_id
      WHERE (l.item_name LIKE ? OR l.category = ?)
      AND l.status = 'pending'
      LIMIT 10
    `, [`%${foundItems[0].item_name}%`, foundItems[0].category]);

        // If user is logged in, get their lost items for claim modal
        let userLostItems = [];
        if (req.user) {
            const [result] = await req.db.query(
                'SELECT * FROM lost_item WHERE user_id = ? AND status = "pending"',
                [req.user.user_id]
            );
            userLostItems = result;
        }

        res.render('found-item-details', {
            title: 'Found Item Details',
            foundItem: foundItems[0],
            similarLostItems,
            userLostItems,
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

// Create found item form
router.get('/new/item', verifyToken, (req, res) => {
    res.render('found-item-form', {
        title: 'Report Found Item',
        user: req.user
    });
});

// Create found item
router.post('/', verifyToken, upload.single('image'), async (req, res) => {
    try {
        const { item_name, description, category, date_found, location_found } = req.body;
        const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

        if (!(item_name && category && date_found && location_found)) {
            return res.status(400).render('error', {
                title: 'Form Error',
                message: 'Required fields are missing'
            });
        }

        const [result] = await req.db.query(`
      INSERT INTO found_item 
        (item_name, description, category, date_found, location_found, found_by, image_url) 
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
            item_name,
            description || null,
            category,
            date_found,
            location_found,
            req.user.email,
            imageUrl
        ]);

        // If user is an admin, create the management relationship
        if (req.user.role === 'admin') {
            await req.db.query(`
        INSERT INTO admin_manages_found_item (admin_id, found_item_id)
        VALUES (?, ?)
      `, [req.user.user_id, result.insertId]);
        }

        res.redirect('/found-items/' + result.insertId);
    } catch (error) {
        console.error(error);
        res.status(500).render('error', {
            title: 'Server Error',
            message: 'Internal server error'
        });
    }
});

// Update found item
router.put('/:id', verifyToken, upload.single('image'), async (req, res) => {
    try {
        const { item_name, description, category, date_found, location_found, status } = req.body;

        // Check if user is the one who found this item or an admin
        const [foundItems] = await req.db.query(
            'SELECT * FROM found_item WHERE found_item_id = ? AND found_by = ?',
            [req.params.id, req.user.email]
        );

        if (foundItems.length === 0 && req.user.role !== 'admin') {
            return res.status(403).render('error', {
                title: 'Forbidden',
                message: 'You are not authorized to update this item'
            });
        }

        let updateQuery = `
      UPDATE found_item SET
        item_name = ?,
        description = ?,
        category = ?,
        date_found = ?,
        location_found = ?,
        status = ?
    `;

        let params = [
            item_name,
            description || null,
            category,
            date_found,
            location_found,
            status || 'unclaimed'
        ];

        // If a new image was uploaded
        if (req.file) {
            updateQuery += ', image_url = ?';
            params.push(`/uploads/${req.file.filename}`);
        }

        updateQuery += ' WHERE found_item_id = ?';
        params.push(req.params.id);

        await req.db.query(updateQuery, params);

        res.redirect('/found-items/' + req.params.id);
    } catch (error) {
        console.error(error);
        res.status(500).render('error', {
            title: 'Server Error',
            message: 'Internal server error'
        });
    }
});

// Delete found item
router.delete('/:id', verifyToken, async (req, res) => {
    try {
        // Check if user is the one who found this item or an admin
        const [foundItems] = await req.db.query(
            'SELECT * FROM found_item WHERE found_item_id = ? AND found_by = ?',
            [req.params.id, req.user.email]
        );

        if (foundItems.length === 0 && req.user.role !== 'admin') {
            return res.status(403).render('error', {
                title: 'Forbidden',
                message: 'You are not authorized to delete this item'
            });
        }

        await req.db.query(
            'DELETE FROM found_item WHERE found_item_id = ?',
            [req.params.id]
        );

        res.redirect('/found-items');
    } catch (error) {
        console.error(error);
        res.status(500).render('error', {
            title: 'Server Error',
            message: 'Internal server error'
        });
    }
});

module.exports = router; 