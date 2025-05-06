const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { verifyToken } = require('../middleware/auth');

// User dashboard
router.get('/dashboard', verifyToken, async (req, res) => {
    try {
        // Get user's lost items
        const [lostItems] = await req.db.query(
            'SELECT * FROM lost_item WHERE user_id = ? ORDER BY date_lost DESC',
            [req.user.user_id]
        );

        // Get user's claims
        const [claims] = await req.db.query(`
      SELECT c.*, 
        l.item_name as lost_item_name,
        f.item_name as found_item_name
      FROM claim c
      LEFT JOIN lost_item l ON c.lost_item_id = l.lost_item_id
      LEFT JOIN found_item f ON c.found_item_id = f.found_item_id
      WHERE c.user_id = ?
      ORDER BY c.claim_date DESC
    `, [req.user.user_id]);

        res.render('user-dashboard', {
            title: 'Dashboard',
            user: req.user,
            lostItems,
            claims
        });
    } catch (error) {
        console.error(error);
        res.status(500).render('error', {
            title: 'Server Error',
            message: 'Internal server error'
        });
    }
});

// User profile
router.get('/profile', verifyToken, async (req, res) => {
    try {
        // Get user details
        const [users] = await req.db.query(
            'SELECT * FROM user WHERE user_id = ?',
            [req.user.user_id]
        );

        if (users.length === 0) {
            return res.status(404).render('error', {
                title: 'Not Found',
                message: 'User not found'
            });
        }

        // Don't send password to the client
        const user = users[0];
        delete user.password;

        res.render('user-profile', {
            title: 'Profile',
            userProfile: user,
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

// Update user profile
router.post('/profile', verifyToken, async (req, res) => {
    try {
        const { name, email, phone_number, current_password, new_password } = req.body;

        // Get user details
        const [users] = await req.db.query(
            'SELECT * FROM user WHERE user_id = ?',
            [req.user.user_id]
        );

        if (users.length === 0) {
            return res.status(404).render('error', {
                title: 'Not Found',
                message: 'User not found'
            });
        }

        // Check if updating password
        if (current_password && new_password) {
            // Verify current password
            const isValidPassword = await bcrypt.compare(current_password, users[0].password);

            if (!isValidPassword) {
                return res.status(400).render('error', {
                    title: 'Password Error',
                    message: 'Current password is incorrect'
                });
            }

            // Hash new password
            const hashedPassword = await bcrypt.hash(new_password, 10);

            // Update user with new password
            await req.db.query(`
        UPDATE user SET
          name = ?,
          email = ?,
          phone_number = ?,
          password = ?
        WHERE user_id = ?
      `, [
                name || users[0].name,
                email || users[0].email,
                phone_number || users[0].phone_number,
                hashedPassword,
                req.user.user_id
            ]);
        } else {
            // Update user without changing password
            await req.db.query(`
        UPDATE user SET
          name = ?,
          email = ?,
          phone_number = ?
        WHERE user_id = ?
      `, [
                name || users[0].name,
                email || users[0].email,
                phone_number || users[0].phone_number,
                req.user.user_id
            ]);
        }

        res.redirect('/users/profile');
    } catch (error) {
        console.error(error);
        res.status(500).render('error', {
            title: 'Server Error',
            message: 'Internal server error'
        });
    }
});

module.exports = router; 