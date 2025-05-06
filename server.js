require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const mysql = require('mysql2/promise');
const cookieParser = require('cookie-parser');
const methodOverride = require('method-override');
const morgan = require('morgan');
const jwt = require('jsonwebtoken');

// Initialize Express
const app = express();

// Middleware
app.use(morgan('dev')); // or 'combined', 'tiny', etc.
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(cookieParser());
app.use(methodOverride('_method'));

// Set view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Database connection pool
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Make db accessible to routes
app.use((req, res, next) => {
    req.db = pool;
    next();
});

// Set user in locals from JWT token
app.use(async (req, res, next) => {
    try {
        const token = req.cookies.token;
        if (token) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'campus_lost_found_secret_key');
            req.user = decoded;
            res.locals.user = decoded;

            // If user is admin, get pending claims count
            if (decoded.role === 'admin') {
                const [result] = await pool.query(
                    'SELECT COUNT(*) AS count FROM claim WHERE status = "pending"'
                );
                res.locals.pendingClaimsCount = result[0].count;
            }
        }
        next();
    } catch (error) {
        console.error("Token verification error:", error);
        res.clearCookie('token');
        next();
    }
});

// Routes
app.get('/', (req, res) => {
    res.render('index', { title: 'Campus Lost and Found' });
});

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const lostItemRoutes = require('./routes/lostItems');
const foundItemRoutes = require('./routes/foundItems');
const claimRoutes = require('./routes/claims');
const adminRoutes = require('./routes/admin');
const apiRoutes = require('./routes/api');

// Use routes
app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/lost-items', lostItemRoutes);
app.use('/found-items', foundItemRoutes);
app.use('/claims', claimRoutes);
app.use('/admin', adminRoutes);
app.use('/api', apiRoutes);

// Error page
app.use('/error', (req, res) => {
    res.render('error', {
        title: req.query.title || 'Error',
        message: req.query.message || 'An unexpected error occurred'
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).render('404', { title: 'Page Not Found' });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
}); 