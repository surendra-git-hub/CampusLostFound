const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Register user
router.post('/register', async (req, res) => {
    try {
        const { name, email, username, password, phone_number } = req.body;
        console.log(req.body);

        if (!(name && email && username && password)) {
            return res.status(400).render('error', {
                title: 'Registration Error',
                message: 'All input fields are required'
            });
        }

        // Check if user already exists
        const [existingUser] = await req.db.query(
            'SELECT * FROM user WHERE email = ? OR username = ?',
            [email, username]
        );

        if (existingUser.length > 0) {
            return res.status(409).render('error', {
                title: 'Registration Error',
                message: 'User already exists. Please login.'
            });
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const [result] = await req.db.query(
            'INSERT INTO user (name, email, username, password, phone_number) VALUES (?, ?, ?, ?, ?)',
            [name, email, username, hashedPassword, phone_number || null]
        );

        // Generate token
        const token = jwt.sign(
            { user_id: result.insertId, email, role: 'user' },
            process.env.JWT_SECRET || 'campus_lost_found_secret_key',
            { expiresIn: '7d' } // Fixed expiration time
        );

        // Set cookie
        res.cookie('token', token, {
            httpOnly: true,
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        res.redirect('/users/dashboard');
    } catch (error) {
        console.error(error);
        res.status(500).render('error', {
            title: 'Server Error',
            message: 'Internal server error'
        });
    }
});

// Login user
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        console.log(req.body);

        if (!(username && password)) {
            return res.status(400).render('error', {
                title: 'Login Error',
                message: 'All input fields are required'
            });
        }

        // Check user table first
        const [users] = await req.db.query(
            'SELECT * FROM user WHERE username = ? OR email = ?',
            [username, username]
        );

        if (users.length > 0) {
            const user = users[0];

            if (await bcrypt.compare(password, user.password)) {
                // Create token
                const token = jwt.sign(
                    { user_id: user.user_id, email: user.email, role: 'user' },
                    process.env.JWT_SECRET || 'campus_lost_found_secret_key',
                    { expiresIn: '7d' } // Fixed expiration time
                );

                // Set cookie
                res.cookie('token', token, {
                    httpOnly: true,
                    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
                });

                return res.redirect('/users/dashboard');
            }
        }

        // Check admin table if not found in user table
        const [admins] = await req.db.query(
            'SELECT * FROM admin WHERE username = ? OR email = ?',
            [username, username]
        );

        if (admins.length > 0) {
            const admin = admins[0];

            if (await bcrypt.compare(password, admin.password)) {
                // Create token
                const token = jwt.sign(
                    { user_id: admin.admin_id, email: admin.email, role: 'admin' },
                    process.env.JWT_SECRET || 'campus_lost_found_secret_key',
                    { expiresIn: '7d' } // Fixed expiration time
                );

                // Set cookie
                res.cookie('token', token, {
                    httpOnly: true,
                    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
                });

                return res.redirect('/admin/dashboard');
            }
        }

        res.status(400).render('error', {
            title: 'Login Error',
            message: 'Invalid credentials'
        });
    } catch (error) {
        console.error(error);
        res.status(500).render('error', {
            title: 'Server Error',
            message: 'Internal server error'
        });
    }
});

// Logout
router.get('/logout', (req, res) => {
    res.clearCookie('token');
    res.redirect('/');
});

// Registration form
router.get('/register', (req, res) => {
    res.render('register', { title: 'Register' });
});

// Login form
router.get('/login', (req, res) => {
    res.render('login', { title: 'Login' });
});

module.exports = router; 