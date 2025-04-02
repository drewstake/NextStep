/**
 * Authentication middleware for verifying JWT tokens centrally
 * @module middleware/auth
 * @requires jsonwebtoken
 */

const jwt = require("jsonwebtoken");

/**
 * Middleware function to verify JWT tokens in request headers
 * @async
 * @param {Object} req - Express request object
 * @param {Object} req.headers - Request headers
 * @param {string} [req.headers.authorization] - Authorization header containing JWT token
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {void}
 * @throws {Error} 401 if token is missing or invalid
 * @throws {Error} 401 if token has expired
 * @throws {Error} 401 if token is malformed
 */
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ error: "Unauthorized. Missing or invalid token." });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: "Your session has expired. Please sign in again.",
        code: "TOKEN_EXPIRED"
      });
    }
    return res.status(401).json({ error: "Invalid authentication token." });
  }
};

module.exports = { verifyToken }; 