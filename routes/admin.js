const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { verifyToken, verifyAdmin } = require('../middleware/auth');

// Admin dashboard
router.get('/dashboard', verifyToken, verifyAdmin, async (req, res) => {
    try {
        // Get counts
        const [lostItemCount] = await req.db.query(
            'SELECT COUNT(*) as count FROM lost_item'
        );

        const [foundItemCount] = await req.db.query(
            'SELECT COUNT(*) as count FROM found_item'
        );

        const [userCount] = await req.db.query(
            'SELECT COUNT(*) as count FROM user'
        );

        const [pendingClaimCount] = await req.db.query(
            'SELECT COUNT(*) as count FROM claim WHERE status = "pending"'
        );

        // Get recent claims
        const [recentClaims] = await req.db.query(`
      SELECT c.*, 
        u.name as user_name,
        l.item_name as lost_item_name,
        f.item_name as found_item_name
      FROM claim c
      LEFT JOIN user u ON c.user_id = u.user_id
      LEFT JOIN lost_item l ON c.lost_item_id = l.lost_item_id
      LEFT JOIN found_item f ON c.found_item_id = f.found_item_id
      WHERE c.status = 'pending'
      ORDER BY c.claim_date DESC
      LIMIT 5
    `);

        res.render('admin-dashboard', {
            title: 'Admin Dashboard',
            user: req.user,
            stats: {
                lostItemCount: lostItemCount[0].count,
                foundItemCount: foundItemCount[0].count,
                userCount: userCount[0].count,
                pendingClaimCount: pendingClaimCount[0].count
            },
            recentClaims
        });
    } catch (error) {
        console.error(error);
        res.status(500).render('error', {
            title: 'Server Error',
            message: 'Internal server error'
        });
    }
});

// Manage users
router.get('/users', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const [users] = await req.db.query(
            'SELECT user_id, name, email, username, phone_number FROM user'
        );

        res.render('admin-users', {
            title: 'Manage Users',
            users,
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

// Delete user
router.delete('/users/:id', verifyToken, verifyAdmin, async (req, res) => {
    try {
        await req.db.query(
            'DELETE FROM user WHERE user_id = ?',
            [req.params.id]
        );

        res.redirect('/admin/users');
    } catch (error) {
        console.error(error);
        res.status(500).render('error', {
            title: 'Server Error',
            message: 'Internal server error'
        });
    }
});

// Manage lost items
router.get('/lost-items', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const [lostItems] = await req.db.query(`
      SELECT l.*, u.name as reporter_name 
      FROM lost_item l 
      LEFT JOIN user u ON l.user_id = u.user_id
      ORDER BY l.date_lost DESC
    `);

        res.render('admin-lost-items', {
            title: 'Manage Lost Items',
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

// Manage found items
router.get('/found-items', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const [foundItems] = await req.db.query(
            'SELECT * FROM found_item ORDER BY date_found DESC'
        );

        res.render('admin-found-items', {
            title: 'Manage Found Items',
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

// Manage claims
router.get('/claims', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const [claims] = await req.db.query(`
      SELECT c.*, 
        u.name as user_name,
        l.item_name as lost_item_name,
        f.item_name as found_item_name
      FROM claim c
      LEFT JOIN user u ON c.user_id = u.user_id
      LEFT JOIN lost_item l ON c.lost_item_id = l.lost_item_id
      LEFT JOIN found_item f ON c.found_item_id = f.found_item_id
      ORDER BY c.status = 'pending' DESC, c.claim_date DESC
    `);

        res.render('admin-claims', {
            title: 'Manage Claims',
            claims,
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

// Admin profile
router.get('/profile', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const [admins] = await req.db.query(
            'SELECT * FROM admin WHERE admin_id = ?',
            [req.user.user_id]
        );

        if (admins.length === 0) {
            return res.status(404).render('error', {
                title: 'Not Found',
                message: 'Admin not found'
            });
        }

        const admin = admins[0];
        delete admin.password;

        res.render('admin-profile', {
            title: 'Admin Profile',
            adminProfile: admin,
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

// Update admin profile
router.post('/profile', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { name, email, phone_number, current_password, new_password } = req.body;

        const [admins] = await req.db.query(
            'SELECT * FROM admin WHERE admin_id = ?',
            [req.user.user_id]
        );

        if (admins.length === 0) {
            return res.status(404).render('error', {
                title: 'Not Found',
                message: 'Admin not found'
            });
        }

        // Check if updating password
        if (current_password && new_password) {
            const isValidPassword = await bcrypt.compare(current_password, admins[0].password);

            if (!isValidPassword) {
                return res.status(400).render('error', {
                    title: 'Password Error',
                    message: 'Current password is incorrect'
                });
            }

            const hashedPassword = await bcrypt.hash(new_password, 10);

            await req.db.query(`
        UPDATE admin SET
          name = ?,
          email = ?,
          phone_number = ?,
          password = ?
        WHERE admin_id = ?
      `, [
                name || admins[0].name,
                email || admins[0].email,
                phone_number || admins[0].phone_number,
                hashedPassword,
                req.user.user_id
            ]);
        } else {
            await req.db.query(`
        UPDATE admin SET
          name = ?,
          email = ?,
          phone_number = ?
        WHERE admin_id = ?
      `, [
                name || admins[0].name,
                email || admins[0].email,
                phone_number || admins[0].phone_number,
                req.user.user_id
            ]);
        }

        res.redirect('/admin/profile');
    } catch (error) {
        console.error(error);
        res.status(500).render('error', {
            title: 'Server Error',
            message: 'Internal server error'
        });
    }
});

module.exports = router; 