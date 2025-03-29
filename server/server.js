/*************************************
 *  server.js (Cleaned-Up Version)   *
 *************************************/

require("dotenv").config(); // Load environment variables from .env
const express = require("express");
const { MongoClient, ObjectId } = require("mongodb");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const { OAuth2Client } = require("google-auth-library");
const { sendVerificationCode, verifyCode } = require("./middleware/smsAuth");

const app = express();

// Log key environment variables (excluding sensitive data)
console.log("Environment check:", {
  port: process.env.PORT,
  twilioConfigured:
    !!process.env.TWILIO_ACCOUNT_SID &&
    !!process.env.TWILIO_AUTH_TOKEN &&
    !!process.env.TWILIO_PHONE_NUMBER,
  mongoConfigured: !!process.env.MONGODB_URI,
  googleConfigured: !!process.env.GOOGLE_CLIENT_ID,
});

// Initialize Google OAuth client
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Middleware
app.use(express.json());
app.use(cors());

// JWT Verification Middleware
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

// MongoDB Connection
const uri = process.env.MONGODB_URI;           // e.g. "mongodb+srv://..."
const dbName = "mydb";                         // or process.env.DB_NAME
const client = new MongoClient(uri);
const PORT = process.env.PORT || 4000;

// Connect to MongoDB and then define routes
client
  .connect()
  .then(() => {
    const db = client.db(dbName);
    console.log(`Connected to MongoDB: ${new Date().toLocaleString()}`);

    /******************************************
     *        ROUTES DEFINITION START         *
     ******************************************/

    /* ------------------
       Tracks Apply(right-swipe), Skip, and Ignore(left-swipe) Jobs
       mode: 1 for apply, 2 for skip, 3 for ignore
    ------------------ */
    // define constants for the swipe modes
    const APPLY = 1;
    const IGNORE = 2;

    app.post("/jobsTracker", verifyToken, async (req, res) => {
      try {
        const applicationsCollection = db.collection("applications");
        const { _id, swipeMode } = req.body;

        //console.log("Swipe mode: ", swipeMode);

        const applicationInfo = {
          job_id: ObjectId.createFromHexString(_id),
          user_id: ObjectId.createFromHexString(req.user.id),
          date_applied: new Date(),
          status: swipeMode === APPLY ? "Pending" :
            swipeMode === IGNORE ? "Ignored" : "Unknown",
          swipeMode: swipeMode,
          swipeAction: swipeMode === APPLY ? "Applied" :
            swipeMode === IGNORE ? "Ignored" : "Unknown"
        };

        // Check if this user has already applied for this job
        const existingApplication = await applicationsCollection.findOne({
          job_id: ObjectId.createFromHexString(_id),
          user_id: ObjectId.createFromHexString(req.user.id),
          swipeMode: APPLY
        });

        if (existingApplication) {
          return res.status(409).json({
            error:
              "You've already applied for this job. Check your application status in 'My Jobs'.",
          });
        }

        // otherwise proceed to insert the combination
        await applicationsCollection.insertOne(applicationInfo);

        res.status(200).json({
          job_id: _id,
          user_id: req.user.id,
        });
      } catch (err) {
        console.error(err);
        res.status(500).json({
          error: `Failed to save job application. ${err.message}`,
        });
      }
    });

    /* ------------------
       Sign In
       (Email+Password or Phone+Verification)
    ------------------ */
    app.post("/signin", async (req, res) => {
      try {
        console.log("/signin called");
        const collection = db.collection("users");
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
            return res.status(401).json({ message: "Invalid password." });
          }
        }

        // Generate JWT
        const token = jwt.sign(
          { id: user._id, isEmployer: user.employerFlag },
          process.env.JWT_SECRET,
          { expiresIn: "1h" }
        );

        res.status(200).json({
          token,
          message: "Login success",
          isEmployer: user.employerFlag,
        });
      } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to retrieve users" });
      }
    });

    /* ------------------
       Send Verification Code (Twilio call)
    ------------------ */
    app.post("/send-verification", async (req, res) => {
      try {
        const { phoneNumber } = req.body;
        const sent = await sendVerificationCode(phoneNumber);
        if (sent) {
          res
            .status(200)
            .json({ message: "Verification code sent successfully" });
        } else {
          res.status(500).json({ error: "Failed to send verification code" });
        }
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Server error" });
      }
    });

    /* ------------------
       Verify Code (Twilio)
    ------------------ */
    app.post("/verify-code", async (req, res) => {
      try {
        const { phoneNumber, code } = req.body;
        const result = verifyCode(phoneNumber, code);
        if (result.valid) {
          res.status(200).json({ message: result.message });
        } else {
          res.status(400).json({ error: result.message });
        }
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Server error" });
      }
    });

    /* ------------------
       Sign Up (Phone verification optional)
    ------------------ */
    app.post("/signup", async (req, res) => {
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

        const collection = db.collection("users");

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

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = {
          full_name,
          phone,
          email,
          password: hashedPassword,
          employerFlag: employerFlag,
          phoneVerified: !!verificationCode, // or set to false if no code
        };

        await collection.insertOne(newUser);
        res.status(201).json({ message: "User created successfully" });
      } catch (error) {
        console.error(error);
        res
          .status(400)
          .json({ error: `Error creating user. ${error.message}` });
      }
    });

    /* ------------------
       Get Applications (for logged-in user)
    ------------------ */
    app.get("/applications", verifyToken, async (req, res) => {
      try {

        const applicationsCollection = db.collection("applications");

        const applicationsWithJobDetails = await applicationsCollection
          .aggregate([
            {
              $match: {
                user_id: ObjectId.createFromHexString(req.user.id),
              },
            },
            {
              $lookup: {
                from: "Jobs",
                localField: "job_id",
                foreignField: "_id",
                as: "jobDetails",
              },
            },
            { $unwind: "$jobDetails" },
          ])
          .toArray();

        res.status(200).json(applicationsWithJobDetails);
      } catch (error) {
        console.error(`Error in /applications. ${error}`);
        res.status(500).json({ error: `Error searching applications. ${error.message}` });
      }
    });

    /* ------------------
       Get Single Job by ID
    ------------------ */
    app.get("/jobs/:jobId", async (req, res) => {
      try {
        const collection = db.collection("Jobs");
        const jobId = req.params.jobId;

        // Validate if the jobId is a valid MongoDB ObjectId
        if (!ObjectId.isValid(jobId)) {
          console.error("Invalid job ID format:", jobId);
          return res.status(400).json({ error: "Invalid job ID format" });
        }

        const job = await collection.findOne({
          _id: ObjectId.createFromHexString(jobId)
        });

        if (!job) {
          console.error("Job not found with ID:", jobId);
          return res.status(404).json({ error: "Job not found" });
        }

        res.status(200).json(job);
      } catch (error) {
        console.error("Error fetching job:", error);
        res.status(500).json({ error: "Failed to fetch job details" });
      }
    });

    /* ------------------
       Browse Jobs
    ------------------ */
    app.get("/jobs", async (req, res) => {
      try {
        const collection = db.collection("Jobs");

        const queryText = req.query.q || "";
        const query = {
          $or: [
            { title: { $regex: queryText, $options: "i" } },
            { jobDescription: { $regex: queryText, $options: "i" } },
            { skills: { $regex: queryText, $options: "i" } },
            { locations: { $regex: queryText, $options: "i" } },
            { benefits: { $regex: queryText, $options: "i" } },
            { schedule: { $regex: queryText, $options: "i" } },
            { salary: { $regex: queryText, $options: "i" } },
          ],
        };

        const jobs = await collection.find(query).toArray();
        res.status(200).json(jobs);
      } catch (error) {
        console.error(`Error in /jobs. ${error}`);
        res.status(500).json({ error: `Error searching jobs. ${error}` });
      }
    });

    /* ------------------
       Create New Job Posting
    ------------------ */
    app.post("/jobs", verifyToken, async (req, res) => {
      try {
        // Verify that the user is an employer
        if (!req.user.isEmployer) {
          return res.status(403).json({ error: "Only employers can create job postings" });
        }

        const collection = db.collection("Jobs");
        const {
          title,
          companyName,
          companyWebsite,
          salaryRange,
          benefits,
          locations,
          schedule,
          jobDescription,
          skills
        } = req.body;

        // Validate required fields
        if (!title || !companyName || !jobDescription) {
          return res.status(400).json({ error: "Title, company name, and job description are required" });
        }

        const newJob = {
          title,
          companyName,
          companyWebsite,
          salaryRange,
          benefits: benefits || [],
          locations: Array.isArray(locations) ? locations : [locations],
          schedule,
          jobDescription,
          skills: Array.isArray(skills) ? skills : [skills],
          createdAt: new Date(),
          employerId: ObjectId.createFromHexString(req.user.id)
        };

        const result = await collection.insertOne(newJob);
        res.status(201).json({
          message: "Job posting created successfully",
          jobId: result.insertedId
        });
      } catch (error) {
        console.error("Error creating job posting:", error);
        res.status(500).json({ error: "Failed to create job posting" });
      }
    });

    /* ------------------
      Jobs to show in the homepage
    ------------------ */
    app.get("/retrieveJobsForHomepage", async (req, res) => {
      try {
        console.log("in job search");
        const jobsCollection = db.collection("Jobs");
        const applicationsCollection = db.collection("applications");

        const queryText = req.query.q || "";
        const query = {
          $or: [
            { title: { $regex: queryText, $options: "i" } },
            { jobDescription: { $regex: queryText, $options: "i" } },
            { skills: { $regex: queryText, $options: "i" } },
            { locations: { $regex: queryText, $options: "i" } },
            { benefits: { $regex: queryText, $options: "i" } },
            { schedule: { $regex: queryText, $options: "i" } },
            { salary: { $regex: queryText, $options: "i" } },
          ],
        };

        // Check if user is authenticated
        const token = req.headers.authorization?.split(" ")[1];
        let jobs = [];

        // Base job search query
        const baseJobs = await jobsCollection.find(query).toArray();

        if (token) {
          try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            //              user_id: ObjectId.createFromHexString(decoded.id),

            // Get applied job IDs for the user
            const appliedJobsResult = await applicationsCollection
              .find({
                user_id: ObjectId.createFromHexString(decoded.id)
              })
              .project({ job_id: 1, _id: 0 })
              .toArray();

            const appliedJobIds = appliedJobsResult.map(app => app.job_id);

            // Filter out already applied jobs
            jobs = baseJobs.filter(job =>
              !appliedJobIds.some(appliedId =>
                appliedId.toString() === job._id.toString()
              )
            );

          } catch (error) {
            // If token is invalid, just continue without filtering
            console.error("Server error:", error.message);
            jobs = baseJobs;
          }
        }

        res.status(200).json(jobs);
      } catch (error) {
        console.error(`Error in /jobs. ${error}`);
        res.status(500).json({ error: `Error searching jobs. ${error}` });
      }
    });

    /* ------------------
       Get Profile (for logged-in user)
    ------------------ */
    app.get("/profile", verifyToken, async (req, res) => {
      try {

        const collection = db.collection("users");
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
        console.error(`Error in /profile. ${error}`);
        res.status(500).json({ error: `Error fetching user profile. ${error.message}` });
      }
    });

    /* ------------------
       Update Profile (for logged-in user)
    ------------------ */
    const storage = multer.memoryStorage();
    const upload = multer({ storage: storage });

    app.post(
      "/updateprofile",
      verifyToken,
      upload.fields([{ name: "photo" }, { name: "resume" }]),
      async (req, res) => {
        try {

          const { firstName, lastName, phone, email, location, full_name } = req.body;
          const collection = db.collection("users");

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
          console.error(err);
          res.status(500).json({ error: `Error updating user profile. ${err.message}` });
        }
      }
    );

    /* ------------------
       Logout
    ------------------ */
    app.get("/logout", async (req, res) => {
      try {
        console.log("/logout called");
        // Clear cookie (if you use JWT in cookies)
        res.cookie("nextstep_auth", "", { expires: new Date(0), httpOnly: true });
        res.json({ message: "You've been logged out" });
      } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to logout" });
      }
    });

    /* ------------------
       Google OAuth
    ------------------ */
    app.post("/auth/google", async (req, res) => {
      try {
        const { token } = req.body;
        const ticket = await googleClient.verifyIdToken({
          idToken: token,
          audience: process.env.GOOGLE_CLIENT_ID,
        });

        //Retrieve user profile properties from verifyIdToken/ticket
        //IN this case we retrieve email, full name, first name, last name, and profile picture if present 
        const { email, name, given_name, family_name, picture } = ticket.getPayload();
        //console.log(ticket.getPayload());
        const collection = db.collection("users");

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
          //create a new profile in MongoDB if one doesn't already exist
          const result = await collection.insertOne(newUser);
          user = { ...newUser, _id: result.insertedId };
        }

        // Generate JWT token
        const jwtToken = jwt.sign(
          { id: user._id, isEmployer: user.employerFlag },
          process.env.JWT_SECRET,
          { expiresIn: "1h" }
        );

        res.status(200).json({
          token: jwtToken,
          message: "Login success",
          isEmployer: user.employerFlag,
        });
      } catch (error) {
        console.error("Google authentication error:", error);
        res.status(401).json({ error: "Invalid Google token" });
      }
    });

    /* ------------------
       Get All Users (for messenger)
    ------------------ */
    app.get("/users", verifyToken, async (req, res) => {
      try {
        const collection = db.collection("users");

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
        console.error(error);
        res.status(500).json({ error: "Failed to retrieve users" });
      }
    });

    /* ------------------
       Get Messages
    ------------------ */
    app.get("/messages", verifyToken, async (req, res) => {
      try {
        const messagesCollection = db.collection("messages");

        const messages = await messagesCollection.find({
          $or: [
            { senderId: req.user.id },
            { receiverId: req.user.id }
          ]
        }).sort({ createdAt: -1 }).toArray();

        res.status(200).json(messages);
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to retrieve messages" });
      }
    });


  /* ------------------
       Mark Messages as Read
    ------------------ */
      app.put("/messages/read/:contactId", verifyToken, async (req, res) => {
      try {
        const messagesCollection = db.collection("messages");
        const contactId = req.params.contactId;
        const userId = req.user.id;
        const readTimestamp = new Date(); // Current timestamp
    
        const result = await messagesCollection.updateMany(
          {
            $and: [
              {
                $or: [
                  { senderId: contactId, receiverId: userId },
                  { senderId: userId, receiverId: contactId },
                ],
              },
              { read_timestamp: null }, // Only mark unread messages
            ],
          },
          {
            $set: { read_timestamp: readTimestamp },
          }
        );
    
        if (result.modifiedCount > 0) {
          res.status(200).json({
            message: `${result.modifiedCount} messages marked as read.`,
            modifiedCount: result.modifiedCount,
          });
        } else {
          res.status(200).json({ message: "No unread messages found for this contact." });
        }
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to mark messages as read" });
      }
    });

    /* ------------------
       Send Message
    ------------------ */
    app.post("/messages", verifyToken, async (req, res) => {
      try {
        const { receiverId, content } = req.body;

        if (!content || !receiverId) {
          return res.status(400).json({ error: "Message content and receiver ID are required" });
        }

        const messagesCollection = db.collection("messages");
        const usersCollection = db.collection("users");

        // Get sender and receiver details
        const [sender, receiver] = await Promise.all([
          usersCollection.findOne(
            { _id: ObjectId.createFromHexString(req.user.id) },
            { projection: { full_name: 1, first_name: 1, last_name: 1, email: 1 } }
          ),
          usersCollection.findOne(
            { _id: ObjectId.createFromHexString(receiverId) },
            { projection: { full_name: 1, first_name: 1, last_name: 1, email: 1 } }
          )
        ]);

        // Get display names
        const senderName = sender.full_name || `${sender.first_name || ''} ${sender.last_name || ''}`.trim();
        const receiverName = receiver.full_name || `${receiver.first_name || ''} ${receiver.last_name || ''}`.trim();
        const senderEmail = sender.email;
        const receiverEmail = receiver.email;
        const message = {
          senderId: req.user.id,
          receiverId,
          senderName,
          receiverName,
          senderEmail,
          receiverEmail,
          content,
          createdAt: new Date(),
        };

        await messagesCollection.insertOne(message);
        res.status(201).json(message);
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to send message" });
      }
    });

    /* ------------------
       Get Recent Contacts
    ------------------ */
    app.get("/myRecentContacts", verifyToken, async (req, res) => {
      try {
        const messagesCollection = db.collection("messages");
        const usersCollection = db.collection("users");

        const contacts = await messagesCollection.aggregate([
          {
            $match: {
              $or: [
                { senderId: req.user.id },
                { receiverId: req.user.id },
              ],
            },
          },
          {
            $group: {
              _id: {
                contactId: {
                  $cond: {
                    if: { $eq: ['$senderId', req.user.id] },
                    then: '$receiverId',
                    else: '$senderId',
                  },
                },
                contactName: {
                  $cond: {
                    if: { $eq: ['$senderId', req.user.id] },
                    then: '$receiverName',
                    else: '$senderName',
                  },
                },
              },
              countOfUnreadMessages: {
                $sum: {
                  $cond: {
                    if: {
                      $and: [
                        { $eq: ['$receiverId', req.user.id] },
                        { $not: ['$read_timestamp'] },
                      ],
                    },
                    then: 1,
                    else: 0,
                  },
                },
              },
            },
          },
          {
            $project: {
              _id: 0,
              contactId: '$_id.contactId',
              contactName: '$_id.contactName',
              countOfUnreadMessages: 1,
            },
          },
          {
            $sort: { contactName: 1, contactId: 1 },
          },
        ]).toArray();

        //console.log('Unique Contacts with Unread Message Counts:', contacts);

        res.status(200).json(contacts);
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to retrieve recent contacts" });
      }
    });

    /******************************************
     *         ROUTES DEFINITION END          *
     ******************************************/

    // Start the server
    app.listen(PORT, (err) => {
      if (err) console.log("Error starting server:", err);
      console.log(`Server listening on PORT ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Error connecting to MongoDB:", error);
  });
