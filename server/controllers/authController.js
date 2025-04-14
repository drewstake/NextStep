const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
const { ObjectId } = require("mongodb");
const crypto = require("crypto");
const { sendEmail } = require("../middleware/mailer");

// Initialize Google OAuth client
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

/**
 * Controller for handling authentication-related operations
 * @namespace authController
 */
const authController = {
  /**
   * Authenticates a user with email/password or phone verification
   * @async
   * @param {Object} req - Express request object
   * @param {Object} req.body - Request body
   * @param {string} req.body.email - User's email
   * @param {string} req.body.password - User's password
   * @param {string} [req.body.phone] - User's phone number (optional)
   * @param {string} [req.body.verificationCode] - Phone verification code (optional)
   * @param {Object} res - Express response object
   * @returns {Promise<Object>} JWT token and user info
   * @throws {Error} 401 if credentials are invalid
   * @throws {Error} 500 if server error occurs
   */
  signin: async (req, res) => {
    try {
      const collection = req.app.locals.db.collection("users");
      const { email, password, phone, verificationCode } = req.body;

      // Find user by email or phone
      const user = await collection.findOne({
        $or: [{ email }],
      });
      
      if (!user) {
        return res.status(401).json({ message: "No matching user found." });
      }

      // If signing in with phone, verify the code
      if (phone && verificationCode) {
        const verification = verifyCode(phone, verificationCode);
        if (!verification.valid) {
          return res.status(401).json({ message: verification.message });
        }
      } else {
        // If signing in with email, verify password
        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
          return res.status(401).json({ message: "Invalid credentials" });
        }
        
        // Check if email is verified
        if (!user.emailVerified) {
          return res.status(401).json({ 
            message: "Email not verified. Please check your email for a verification link.",
            emailNotVerified: true
          });
        }
      }

      // Generate JWT
      const token = jwt.sign(
        { id: user._id, employerFlag: user.employerFlag },
        process.env.JWT_SECRET,
        { expiresIn: "1h" }
      );

      res.status(200).json({
        token,
        email,
        full_name: user.full_name,
        message: "Login success",
        employerFlag: user.employerFlag,
        companyId: user.companyId || null
      });
    } catch (err) {
      res.status(500).json({ error: "Failed to retrieve users" });
    }
  },

  /**
   * Registers a new user with email/password or phone verification
   * @async
   * @param {Object} req - Express request object
   * @param {Object} req.body - Request body
   * @param {string} req.body.full_name - User's full name
   * @param {string} [req.body.phone] - User's phone number (optional)
   * @param {string} req.body.email - User's email
   * @param {string} req.body.password - User's password
   * @param {boolean} [req.body.employerFlag] - Whether user is an employer
   * @param {string} [req.body.verificationCode] - Phone verification code (optional)
   * @param {Object} res - Express response object
   * @returns {Promise<Object>} Success message
   * @throws {Error} 400 if request body is invalid
   * @throws {Error} 409 if user already exists
   * @throws {Error} 500 if server error occurs
   */
  signup: async (req, res) => {
    try {
      if (!req.body || !req.body.full_name) {
        return res.status(400).send({ error: "Invalid request body" });
      }

      const {
        full_name,
        phone,
        email,
        password,
        employerFlag,
        verificationCode,
      } = req.body;

      // Verify the phone number if code is provided
      if (verificationCode) {
        const verification = verifyCode(phone, verificationCode);
        if (!verification.valid) {
          return res.status(400).json({ error: verification.message });
        }
      }

      const collection = req.app.locals.db.collection("users");

      // Check if user already exists by email or phone
      const existingUser = await collection.findOne({
        $or: [{ email }, { phone }],
      });

      if (existingUser) {
        return res.status(409).json({
          error:
            existingUser.email === email
              ? "Email already registered"
              : "Phone number already registered",
        });
      }

      // Generate email verification token
      const verificationToken = crypto.randomBytes(32).toString('hex');
      const verificationExpires = new Date();
      verificationExpires.setMinutes(verificationExpires.getMinutes() + 5); // Token expires in 5 minutes

      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = {
        full_name,
        phone,
        email,
        password: hashedPassword,
        employerFlag: employerFlag,
        phoneVerified: !!verificationCode,
        emailVerified: false,
        verificationToken,
        verificationExpires
      };

      await collection.insertOne(newUser);
      
      // Send verification email
      const verificationUrl = `${process.env.SERVER_DOMAIN}/verified?token=${verificationToken}`;
      console.log(verificationUrl);
      const emailSubject = "Verify your NextStep account";
      const emailBody = `
        <h1>Welcome to NextStep!</h1>
        <p>Hello ${full_name},</p>
        <p>Thank you for signing up with NextStep. Please verify your email address by clicking the link below:</p>
        <p><a href="${verificationUrl}">Verify Email Address</a></p>
        <p>This link will expire in 5 minutes.</p>
        <p>If you did not create an account with NextStep, please ignore this email.</p>
        <p>Best regards,<br>The NextStep Team</p>
      `;


      await sendEmail(
        process.env.EMAIL_FROM || "noreply@nextstep.com",
        "NextStep",
        email,
        full_name,
        emailSubject,
        emailBody
      );
      res.status(201).json({ 
        message: "User created successfully. Please check your email to verify your account.",
        userId: newUser._id
      });
    } catch (error) {
      res.status(400).json({ error: `Error creating user. ${error.message}` });
    }
  },

  /**
   * Authenticates a user using Google OAuth
   * @async
   * @param {Object} req - Express request object
   * @param {Object} req.body - Request body
   * @param {string} req.body.token - Google OAuth token
   * @param {Object} res - Express response object
   * @returns {Promise<Object>} JWT token and user info
   * @throws {Error} 401 if Google token is invalid
   * @throws {Error} 500 if server error occurs
   */
  googleAuth: async (req, res) => {
    try {
      const { token } = req.body;
      const ticket = await googleClient.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      const { email, name, given_name, family_name, picture } = ticket.getPayload();
      const collection = req.app.locals.db.collection("users");

      // Check if user exists
      let user = await collection.findOne({ email });

      if (!user) {
        // Create new user if doesn't exist in MongoDB
        const newUser = {
          full_name: name,
          lastName: family_name,
          firstName: given_name,
          pictureUrl: picture,
          email,
          employerFlag: false,
          emailVerified: true,
        };
        const result = await collection.insertOne(newUser);
        user = { ...newUser, _id: result.insertedId };
      }

      // Generate JWT token
      const jwtToken = jwt.sign(
        { id: user._id, employerFlag: user.employerFlag },
        process.env.JWT_SECRET,
        { expiresIn: "1h" }
      );

      res.status(200).json({
        token: jwtToken,
        message: "Login success",
        employerFlag: user.employerFlag,
        companyId: user.companyId || null
      });
    } catch (error) {
      res.status(401).json({ error: "Invalid Google token" });
    }
  },

  /**
   * Logs out the current user by clearing the auth cookie
   * @async
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<Object>} Success message
   * @throws {Error} 500 if server error occurs
   */
  logout: async (req, res) => {
    try {
      res.cookie("nextstep_auth", "", { expires: new Date(0), httpOnly: true });
      res.json({ message: "You've been logged out" });
    } catch (err) {
      res.status(500).json({ error: "Failed to logout" });
    }
  },

  /**
   * Resends the verification email to a user
   * @async
   * @param {Object} req - Express request object
   * @param {Object} req.body - Request body
   * @param {string} req.body.email - User's email
   * @param {Object} res - Express response object
   * @returns {Promise<Object>} Success message
   * @throws {Error} 400 if email is not provided
   * @throws {Error} 404 if user is not found
   * @throws {Error} 500 if server error occurs
   */
  resendVerification: async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }
      
      const collection = req.app.locals.db.collection("users");
      
      // Find user by email
      const user = await collection.findOne({ email });
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Check if email is already verified
      if (user.emailVerified) {
        return res.status(400).json({ error: "Email is already verified" });
      }
      
      // Generate new verification token
      const verificationToken = crypto.randomBytes(32).toString('hex');
      const verificationExpires = new Date();
      verificationExpires.setMinutes(verificationExpires.getMinutes() + 5); // Token expires in 5 minutes
      
      // Update user with new verification token
      await collection.updateOne(
        { _id: user._id },
        { 
          $set: { 
            verificationToken,
            verificationExpires
          } 
        }
      );
      
      // Send verification email
      const verificationUrl = `${process.env.SERVER_HOST}/verified?token=${verificationToken}`;
      const emailSubject = "Verify your NextStep account";
      const emailBody = `
        <h1>Welcome to NextStep!</h1>
        <p>Hello ${user.full_name},</p>
        <p>Thank you for signing up with NextStep. Please verify your email address by clicking the link below:</p>
        <p><a href="${verificationUrl}">Verify Email Address</a></p>
        <p>This link will expire in 5 minutes.</p>
        <p>If you did not create an account with NextStep, please ignore this email.</p>
        <p>Best regards,<br>The NextStep Team</p>
      `;
      
      await sendEmail(
        process.env.EMAIL_FROM || "noreply@nextstep.com",
        "NextStep",
        email,
        user.full_name,
        emailSubject,
        emailBody
      );
      
      res.status(200).json({ message: "Verification email sent successfully" });
    } catch (error) {
      console.error("Error resending verification email:", error);
      res.status(500).json({ error: "Failed to resend verification email" });
    }
  }
};

module.exports = authController; 