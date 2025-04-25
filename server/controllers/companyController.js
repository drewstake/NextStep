/**
 * Controller for company profile operations
 * @module controllers/companyController
 */

const { ObjectId } = require('mongodb');
const multer = require('multer');
const path = require('path');

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/uploads/company-logos')
  },
  filename: function (req, file, cb) {
    cb(null, 'company-' + Date.now() + path.extname(file.originalname))
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    const filetypes = /jpeg|jpg|png|gif/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only image files are allowed!'));
  }
}).single('logo');

/**
 * Get company profile
 * @param {Object} req - Express request object
 * @param {Object} req.user - User object from authentication middleware
 * @param {string} req.user.id - User ID
 * @param {Object} res - Express response object
 */
const getCompanyProfile = async (req, res) => {
  try {
    const companiesCollection = req.app.locals.db.collection("companies");
    // First check if user has a companyId in users collection
    const usersCollection = req.app.locals.db.collection("users");
    const user = await usersCollection.findOne(
      { _id: new ObjectId(req.user.id) },
      { projection: { companyId: 1 } }
    );
      
    const company = await companiesCollection.findOne({ _id: user.companyId });
    
    if (!company) {
      return res.status(404).json({ message: 'Company profile not found' });
    }
    
    res.status(200).json(company);
  } catch (error) {
    console.error('Error getting company profile:', error);
    res.status(500).json({ message: 'Error getting company profile' });
  }
};

/**
 * Update company profile
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body
 * @param {string} req.body.name - Company name
 * @param {string} req.body.description - Company description
 * @param {string} req.body.industry - Company industry
 * @param {string} req.body.location - Company location
 * @param {string} [req.body.website] - Company website
 * @param {string} [req.body.size] - Company size
 * @param {Object} req.user - User object from authentication middleware
 * @param {string} req.user.id - User ID
 * @param {Object} res - Express response object
 */
const updateCompanyProfile = async (req, res) => {
  upload(req, res, async function(err) {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ message: 'File upload error: ' + err.message });
    } else if (err) {
      return res.status(400).json({ message: err.message });
    }

    try {
      // Extract data from request body (works for both JSON and FormData)
      const { name, description, industry, location, website, size } = req.body;
      
      if (!name || !description || !industry || !location) {
        return res.status(400).json({ message: 'Missing required fields' });
      }
      
      const companiesCollection = req.app.locals.db.collection("companies");
      const usersCollection = req.app.locals.db.collection("users");
      
      const companyData = {
        userId: req.user.id,
        name,
        description,
        industry,
        location,
        website: website || '',
        size: size || '',
        updatedAt: new Date()
      };

      // Add logo path if a file was uploaded
      if (req.file) {
        companyData.logo = `/uploads/company-logos/${req.file.filename}`;
      }

      // First check if a company profile already exists
      const existingCompany = await companiesCollection.findOne({ userId: req.user.id });
      
      let updatedCompany;
      let isNewCompany = false;
      
      if (existingCompany) {
        // Update existing company profile
        await companiesCollection.updateOne(
          { userId: req.user.id },
          { $set: companyData }
        );
        
        // Fetch the updated document
        updatedCompany = await companiesCollection.findOne({ userId: req.user.id });
      } else {
        // Create new company profile
        companyData.createdAt = new Date();
        const result = await companiesCollection.insertOne(companyData);
        
        // Fetch the newly created document
        updatedCompany = await companiesCollection.findOne({ _id: result.insertedId });
        isNewCompany = true;
      }

      if (!updatedCompany) {
        return res.status(500).json({ message: 'Failed to update company profile' });
      }

      // If this is a new company profile, update the user's profile with the company ID
      if (isNewCompany) {
        try {
          await usersCollection.updateOne(
            { _id: new ObjectId(req.user.id) },
            { $set: { companyId: updatedCompany._id } }
          );
        } catch (error) {
          console.error('Error updating user profile with company ID:', error);
          // Continue with the response even if user update fails
        }
      }

      // Return the company data directly
      res.status(200).json(updatedCompany);
    } catch (error) {
      console.error('Error updating company profile:', error);
      res.status(500).json({ message: 'Error updating company profile' });
    }
  });
};

/**
 * Search for employer users
 * @param {Object} req - Express request object
 * @param {Object} req.query - Query parameters
 * @param {string} [req.query.search] - Search term for user name or email
 * @param {Object} req.user - User object from authentication middleware
 * @param {string} req.user.id - User ID
 * @param {Object} res - Express response object
 */
const searchEmployerUsers = async (req, res) => {
  try {
    const { search = '' } = req.query;
    const usersCollection = req.app.locals.db.collection("users");
    
    // Get the current user's company ID
    const currentUser = await usersCollection.findOne({ _id: new ObjectId(req.user.id) });
    
    if (!currentUser || !currentUser.companyId) {
      return res.status(400).json({ message: 'You must be associated with a company to search for users' });
    }
    // Build search query
    const searchQuery = {
      employerFlag: true,
      _id: { $ne: new ObjectId(req.user.id) }, // Exclude current user
//      companyId: currentUser.companyId // Only return users from the same company
    };
    
    if (search) {
      searchQuery.$and = [
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    // Find users that match the search criteria
    const users = await usersCollection.find(searchQuery)
      .project({ password: 0, phone: 0 }) // Exclude sensitive fields
      .limit(20)
      .toArray();
    
    res.status(200).json(users);
  } catch (error) {
    console.error('Error searching employer users:', error);
    res.status(500).json({ message: 'Error searching employer users' });
  }
};

/**
 * Get company users
 * @param {Object} req - Express request object
 * @param {Object} req.user - User object from authentication middleware
 * @param {string} req.user.id - User ID
 * @param {Object} res - Express response object
 */
const getCompanyUsers = async (req, res) => {
  try {
    const usersCollection = req.app.locals.db.collection("users");
    
    // Get the current user's company ID
    const currentUser = await usersCollection.findOne({ _id: new ObjectId(req.user.id) });
    
    if (!currentUser || !currentUser.companyId) {
      return res.status(400).json({ message: 'You must be associated with a company to view company users' });
    }
    
    // Find all users associated with the company
    const users = await usersCollection.find({ 
      companyId: currentUser.companyId,
      employerFlag: true
    })
    .project({ password: 0, phone: 0 }) // Exclude sensitive fields
    .toArray();
    
    res.status(200).json(users);
  } catch (error) {
    console.error('Error getting company users:', error);
    res.status(500).json({ message: 'Error getting company users' });
  }
};

/**
 * Add user to company
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body
 * @param {string} req.body.userId - User ID to add to company
 * @param {Object} req.user - User object from authentication middleware
 * @param {string} req.user.id - User ID
 * @param {Object} res - Express response object
 */
const addUserToCompany = async (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }
    
    const usersCollection = req.app.locals.db.collection("users");
    const companiesCollection = req.app.locals.db.collection("companies");
    
    // Get the current user's company ID
    const currentUser = await usersCollection.findOne({ _id: new ObjectId(req.user.id) });
    
    // Check if the current user has a company profile
    const companyProfile = await companiesCollection.findOne({ userId: req.user.id });
    
    if (!companyProfile) {
      return res.status(400).json({ message: 'You must be associated with a company to add users' });
    }
    
    // Check if the user exists and is an employer
    const userToAdd = await usersCollection.findOne({ 
      _id: new ObjectId(userId),
      employerFlag: true
    });
    
    if (!userToAdd) {
      return res.status(404).json({ message: 'User not found or not an employer' });
    }
    
    // Check if the user is already associated with a company
    if (userToAdd.companyId) {
      return res.status(400).json({ message: 'User is already associated with a company' });
    }
    
    // Add the user to the company
    await usersCollection.updateOne(
      { _id: new ObjectId(userId) },
      { $set: { companyId: companyProfile._id } }
    );
    
    res.status(200).json({ message: 'User added to company successfully' });
  } catch (error) {
    console.error('Error adding user to company:', error);
    res.status(500).json({ message: 'Error adding user to company' });
  }
};

/**
 * Remove user from company
 * @param {Object} req - Express request object
 * @param {Object} req.params - Request parameters
 * @param {string} req.params.userId - User ID to remove from company
 * @param {Object} req.user - User object from authentication middleware
 * @param {string} req.user.id - User ID
 * @param {Object} res - Express response object
 */
const removeUserFromCompany = async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }
    
    const usersCollection = req.app.locals.db.collection("users");
    
    // Get the current user's company ID
    const currentUser = await usersCollection.findOne({ _id: new ObjectId(req.user.id) });
    
    if (!currentUser || !currentUser.companyId) {
      return res.status(400).json({ message: 'You must be associated with a company to remove users' });
    }
    
    // Check if the user exists and is associated with the company
    const userToRemove = await usersCollection.findOne({ 
      _id: new ObjectId(userId),
      companyId: currentUser.companyId
    });
    
    if (!userToRemove) {
      return res.status(404).json({ message: 'User not found or not associated with your company' });
    }
    
    // Remove the user from the company
    await usersCollection.updateOne(
      { _id: new ObjectId(userId) },
      { $unset: { companyId: "" } }
    );
    
    res.status(200).json({ message: 'User removed from company successfully' });
  } catch (error) {
    console.error('Error removing user from company:', error);
    res.status(500).json({ message: 'Error removing user from company' });
  }
};

module.exports = {
  getCompanyProfile,
  updateCompanyProfile,
  searchEmployerUsers,
  getCompanyUsers,
  addUserToCompany,
  removeUserFromCompany
}; 