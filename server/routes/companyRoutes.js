/**
 * Routes for company profile operations
 * @module routes/companyRoutes
 */

const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { 
  getCompanyProfile, 
  updateCompanyProfile,
  searchEmployerUsers,
  getCompanyUsers,
  addUserToCompany,
  removeUserFromCompany
} = require('../controllers/companyController');

// Company profile routes
router.get('/companyProfile', verifyToken, getCompanyProfile);
router.put('/companyProfile', verifyToken, updateCompanyProfile);

// Company user management routes
router.get('/company/users/search', verifyToken, searchEmployerUsers);
router.get('/company/users', verifyToken, getCompanyUsers);
router.post('/company/users', verifyToken, addUserToCompany);
router.delete('/company/users/:userId', verifyToken, removeUserFromCompany);

module.exports = router; 