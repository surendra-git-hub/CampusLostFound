const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
    const token = req.headers['x-access-token'] || req.cookies.token;

    if (!token) {
        return res.status(403).render('error', {
            title: 'Unauthorized',
            message: 'A token is required for authentication'
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
    } catch (err) {
        return res.status(401).render('error', {
            title: 'Invalid Token',
            message: 'Invalid Token'
        });
    }
    return next();
};

const verifyAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        return next();
    }

    return res.status(403).render('error', {
        title: 'Forbidden',
        message: 'Admin access required'
    });
};

module.exports = {
    verifyToken,
    verifyAdmin
}; 