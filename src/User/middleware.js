const jwt = require('jsonwebtoken');
const queries = require('./queries');
const pool = require('../../db');

const authMiddleware = async (req, res, next) => {
    try {
        const token = req.header('Authorization').replace('Bearer ', '');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await pool.query(queries.findUserById, [decoded._id]);

        if(user.rows.length === 0) {
            return res.status(401).json({ message: 'User not authenticated, please login again' });
        }

        req.token = token;
        req.user = user.rows[0];
        next();
    } catch (error) {
        console.log(error);
    }
};

module.exports = authMiddleware;
