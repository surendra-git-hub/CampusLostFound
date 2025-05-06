const express = require('express');
const router = express.Router();
const { verifyToken, verifyAdmin } = require('../middleware/auth');

// Get all claims (admin only)
router.get('/', verifyToken, verifyAdmin, async (req, res) => {
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
      ORDER BY c.claim_date DESC
    `);

        res.render('claims', {
            title: 'Claims',
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

// Get claim by ID
router.get('/:id', verifyToken, async (req, res) => {
    try {
        const [claims] = await req.db.query(`
      SELECT c.*, 
        u.name as user_name, u.email as user_email,
        l.item_name as lost_item_name, l.description as lost_item_description,
        f.item_name as found_item_name, f.description as found_item_description,
        f.image_url as found_item_image
      FROM claim c
      LEFT JOIN user u ON c.user_id = u.user_id
      LEFT JOIN lost_item l ON c.lost_item_id = l.lost_item_id
      LEFT JOIN found_item f ON c.found_item_id = f.found_item_id
      WHERE c.claim_id = ?
    `, [req.params.id]);

        if (claims.length === 0) {
            return res.status(404).render('error', {
                title: 'Not Found',
                message: 'Claim not found'
            });
        }

        // Check if user is authorized to view this claim
        if (req.user.role !== 'admin' && req.user.user_id !== claims[0].user_id) {
            return res.status(403).render('error', {
                title: 'Forbidden',
                message: 'You are not authorized to view this claim'
            });
        }

        // Get admin approvals if any
        let approvals = [];
        if (claims[0].status === 'approved') {
            const [result] = await req.db.query(`
        SELECT a.name as admin_name, aa.approval_date
        FROM admin_approves_claim aa
        JOIN admin a ON aa.admin_id = a.admin_id
        WHERE aa.claim_id = ?
      `, [req.params.id]);

            approvals = result;
        }

        res.render('claim-details', {
            title: 'Claim Details',
            claim: claims[0],
            approvals,
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

// Create claim
router.post('/', verifyToken, async (req, res) => {
    try {
        const { lost_item_id, found_item_id, claim_notes } = req.body;

        if (!(lost_item_id || found_item_id)) {
            return res.status(400).render('error', {
                title: 'Form Error',
                message: 'At least one of lost item ID or found item ID is required'
            });
        }

        // If lost_item_id is provided, verify it belongs to the user
        if (lost_item_id) {
            const [lostItems] = await req.db.query(
                'SELECT * FROM lost_item WHERE lost_item_id = ? AND user_id = ?',
                [lost_item_id, req.user.user_id]
            );

            if (lostItems.length === 0) {
                return res.status(403).render('error', {
                    title: 'Forbidden',
                    message: 'You can only claim based on your own lost items'
                });
            }
        }

        // Check if a claim already exists
        const [existingClaims] = await req.db.query(
            'SELECT * FROM claim WHERE lost_item_id = ? OR found_item_id = ?',
            [lost_item_id || null, found_item_id || null]
        );

        if (existingClaims.length > 0) {
            return res.status(400).render('error', {
                title: 'Claim Error',
                message: 'A claim already exists for this item'
            });
        }

        const [result] = await req.db.query(`
      INSERT INTO claim (lost_item_id, found_item_id, user_id, claimed_by, claim_notes)
      VALUES (?, ?, ?, ?, ?)
    `, [
            lost_item_id || null,
            found_item_id || null,
            req.user.user_id,
            req.user.email,
            claim_notes || null
        ]);

        res.redirect('/claims/' + result.insertId);
    } catch (error) {
        console.error(error);
        res.status(500).render('error', {
            title: 'Server Error',
            message: 'Internal server error'
        });
    }
});

// Approve claim (admin only)
router.post('/:id/approve', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const claimId = req.params.id;

        // Update claim status
        await req.db.query(
            'UPDATE claim SET status = ? WHERE claim_id = ?',
            ['approved', claimId]
        );

        // Record admin approval
        await req.db.query(`
      INSERT INTO admin_approves_claim (admin_id, claim_id)
      VALUES (?, ?)
    `, [req.user.user_id, claimId]);

        // Get claim details to update associated items
        const [claims] = await req.db.query(
            'SELECT lost_item_id, found_item_id FROM claim WHERE claim_id = ?',
            [claimId]
        );

        if (claims.length > 0) {
            // Update lost item status if exists
            if (claims[0].lost_item_id) {
                await req.db.query(
                    'UPDATE lost_item SET status = ? WHERE lost_item_id = ?',
                    ['found', claims[0].lost_item_id]
                );
            }

            // Update found item status if exists
            if (claims[0].found_item_id) {
                await req.db.query(
                    'UPDATE found_item SET status = ? WHERE found_item_id = ?',
                    ['claimed', claims[0].found_item_id]
                );
            }
        }

        res.redirect('/claims/' + claimId);
    } catch (error) {
        console.error(error);
        res.status(500).render('error', {
            title: 'Server Error',
            message: 'Internal server error'
        });
    }
});

// Reject claim (admin only)
router.post('/:id/reject', verifyToken, verifyAdmin, async (req, res) => {
    try {
        await req.db.query(
            'UPDATE claim SET status = ? WHERE claim_id = ?',
            ['rejected', req.params.id]
        );

        res.redirect('/claims/' + req.params.id);
    } catch (error) {
        console.error(error);
        res.status(500).render('error', {
            title: 'Server Error',
            message: 'Internal server error'
        });
    }
});

// Cancel claim (user only)
router.post('/:id/cancel', verifyToken, async (req, res) => {
    try {
        // Check if user owns this claim
        const [claims] = await req.db.query(
            'SELECT * FROM claim WHERE claim_id = ? AND user_id = ?',
            [req.params.id, req.user.user_id]
        );

        if (claims.length === 0) {
            return res.status(403).render('error', {
                title: 'Forbidden',
                message: 'You are not authorized to cancel this claim'
            });
        }

        await req.db.query(
            'DELETE FROM claim WHERE claim_id = ?',
            [req.params.id]
        );

        res.redirect('/users/dashboard');
    } catch (error) {
        console.error(error);
        res.status(500).render('error', {
            title: 'Server Error',
            message: 'Internal server error'
        });
    }
});

module.exports = router; 