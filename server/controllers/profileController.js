const { ObjectId } = require("mongodb");
const multer = require("multer");

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

/**
 * Controller for handling user profile-related operations
 * @namespace profileController
 */
const profileController = {
  /**
   * Retrieves the profile of the logged-in user
   * @async
   * @param {Object} req - Express request object
   * @param {Object} req.user - User object from authentication middleware
   * @param {string} req.user.id - User ID
   * @param {Object} res - Express response object
   * @returns {Promise<Object>} User profile data
   * @throws {Error} 404 if user not found
   * @throws {Error} 500 if server error occurs
   */
  getProfile: async (req, res) => {
    try {
      const collection = req.app.locals.db.collection("users");
      const profile = await collection.findOne(
        { _id: ObjectId.createFromHexString(req.user.id) },
        { projection: { password: 0 } }
      );

      if (!profile) {
        return res.status(404).json({
          message: "No matching record found. Check your access token.",
        });
      }
      res.status(200).json(profile);
    } catch (error) {
      res.status(500).json({ error: `Error fetching user profile. ${error.message}` });
    }
  },

  /**
   * Updates the profile of the logged-in user
   * @async
   * @param {Object} req - Express request object
   * @param {Object} req.body - Request body
   * @param {string} [req.body.firstName] - User's first name
   * @param {string} [req.body.lastName] - User's last name
   * @param {string} [req.body.phone] - User's phone number
   * @param {string} [req.body.email] - User's email
   * @param {string} [req.body.location] - User's location
   * @param {string} [req.body.full_name] - User's full name
   * @param {string} [req.body.skills] - User's skills
   * @param {Object} req.files - Uploaded files
   * @param {Object} [req.files.photo] - Profile photo file
   * @param {Object} [req.files.resume] - Resume file
   * @param {Object} req.user - User object from authentication middleware
   * @param {string} req.user.id - User ID
   * @param {Object} res - Express response object
   * @returns {Promise<Object>} Success message
   * @throws {Error} 404 if user not found
   * @throws {Error} 500 if server error occurs
   */
  updateProfile: async (req, res) => {
    try {
      const { firstName, lastName, phone, email, location, full_name, skills } = req.body;
      const collection = req.app.locals.db.collection("users");

      let resumeFile = null;
      let encodedPhoto = null;

      if (req.files) {
        if (req.files["photo"]) {
          const photo = req.files["photo"][0];
          if (photo) {
            const base64Encoded = photo.buffer.toString("base64");
            encodedPhoto = `data:${photo.mimetype};base64,${base64Encoded}`;
          }
        }

        if (req.files["resume"]) {
          resumeFile = req.files["resume"][0];
        }
      }

      const updatedProfileData = {
        firstName,
        lastName,
        phone,
        email,
        location,
        full_name,
        ...(encodedPhoto && { encodedPhoto }),
        ...(resumeFile && { resumeFile }),
        ...(skills != null && skills != "" && skills != "undefined" && { skills: JSON.parse(skills) }),
      };

      const result = await collection.updateOne(
        { _id: ObjectId.createFromHexString(req.user.id) },
        { $set: updatedProfileData }
      );

      if (result.matchedCount === 0) {
        return res.status(404).json({ error: "User profile not found" });
      }
      res.status(200).json({ message: "Profile updated successfully" });
    } catch (err) {
      res.status(500).json({ error: `Error updating user profile. ${err.message}` });
    }
  },

  /**
   * Retrieves a user's profile by their ID
   * @async
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.userId - User ID
   * @param {Object} res - Express response object
   * @returns {Promise<Object>} User profile data
   * @throws {Error} 500 if server error occurs
   */
  getUserProfile: async (req, res) => {
    try {
      const { userId } = req.params;
      const usersCollection = req.app.locals.db.collection("users");
      const user = await usersCollection.findOne(
        { _id: ObjectId.createFromHexString(userId) },
        { projection: { password: 0 } }
      );
      res.status(200).json(user);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch applicant profile" });
    }
  },

  /**
   * Retrieves all users except the logged-in user (for messenger)
   * @async
   * @param {Object} req - Express request object
   * @param {Object} req.user - User object from authentication middleware
   * @param {string} req.user.id - User ID
   * @param {Object} res - Express response object
   * @returns {Promise<Array>} Array of user objects with basic info
   * @throws {Error} 500 if server error occurs
   */
  getAllUsers: async (req, res) => {
    try {
      const collection = req.app.locals.db.collection("users");

      const users = await collection.find(
        {
          _id: { $ne: ObjectId.createFromHexString(req.user.id) }
        },
        {
          projection: {
            _id: 1,
            full_name: 1,
            email: 1
          }
        }
      ).sort({ full_name: 1 })
      .toArray();

      res.status(200).json(users);
    } catch (error) {
      res.status(500).json({ error: "Failed to retrieve users" });
    }
  }
};

module.exports = { profileController, upload }; 