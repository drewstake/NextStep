const { ObjectId } = require("mongodb");

const APPLY = 1;
const IGNORE = 2;

/**
 * Controller for handling job application-related operations
 * @namespace applicationsController
 */
const applicationsController = {
  /**
   * Tracks a user's job application action (apply, skip, ignore)
   * @async
   * @param {Object} req - Express request object
   * @param {Object} req.body - Request body
   * @param {string} req.body._id - Job ID
   * @param {number} req.body.swipeMode - Application mode (1 for apply, 2 for ignore)
   * @param {Object} req.user - User object from authentication middleware
   * @param {string} req.user.id - User ID
   * @param {Object} res - Express response object
   * @returns {Promise<Object>} Response with job and user IDs or error message
   * @throws {Error} 404 if job not found
   * @throws {Error} 409 if already applied
   * @throws {Error} 500 if server error occurs
   */
  trackApplication: async (req, res) => {
    try {
      const applicationsCollection = req.app.locals.db.collection("applications");
      const jobsCollection = req.app.locals.db.collection("Jobs");
      const { _id, swipeMode } = req.body;

      // First verify if the job exists
      const job = await jobsCollection.findOne({
        _id: ObjectId.createFromHexString(_id)
      });

      if (!job) {
        return res.status(404).json({ error: "Job not found" });
      }

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
      res.status(500).json({
        error: `Failed to save job application. ${err.message}`,
      });
    }
  },

  /**
   * Retrieves all job applications for the logged-in user
   * @async
   * @param {Object} req - Express request object
   * @param {Object} req.user - User object from authentication middleware
   * @param {string} req.user.id - User ID
   * @param {Object} res - Express response object
   * @returns {Promise<Array>} Array of applications with job details
   * @throws {Error} 500 if server error occurs
   */
  getUserApplications: async (req, res) => {
    try {
      const applicationsCollection = req.app.locals.db.collection("applications");

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
      res.status(500).json({ error: `Error searching applications. ${error.message}` });
    }
  },

  /**
   * Retrieves all applications for jobs posted by the logged-in employer
   * @async
   * @param {Object} req - Express request object
   * @param {Object} req.user - User object from authentication middleware
   * @param {string} req.user.id - User ID
   * @param {boolean} req.user.isEmployer - Whether user is an employer
   * @param {Object} res - Express response object
   * @returns {Promise<Array>} Array of transformed application objects
   * @throws {Error} 403 if user is not an employer
   * @throws {Error} 500 if server error occurs
   */
  getEmployerApplications: async (req, res) => {
    try {
      if (!req.user.isEmployer) {
        return res.status(403).json({ error: "Only employers can access this endpoint" });
      }

      const applicationsCollection = req.app.locals.db.collection("applications");
      const jobsCollection = req.app.locals.db.collection("Jobs");
      const usersCollection = req.app.locals.db.collection("users");

      const applications = await applicationsCollection.aggregate([
        {
          $lookup: {
            from: "Jobs",
            localField: "job_id",
            foreignField: "_id",
            as: "jobDetails"
          }
        },
        {
          $unwind: "$jobDetails"
        },
        {
          $match: {
            "jobDetails.employerId": ObjectId.createFromHexString(req.user.id)
          }
        },
        {
          $lookup: {
            from: "users",
            localField: "user_id",
            foreignField: "_id",
            as: "userDetails"
          }
        },
        {
          $unwind: "$userDetails"
        },
        {
          $project: {
            _id: 1,
            job_id: 1,
            user_id: 1,
            date_applied: 1,
            status: 1,
            swipeMode: 1,
            swipeAction: 1,
            "jobDetails.title": 1,
            "jobDetails.companyName": 1,
            "userDetails.full_name": 1,
            "userDetails.resume": 1
          }
        }
      ]).toArray();

      const transformedApplications = applications.map(app => ({
        id: app._id,
        applicantId: app.user_id,
        applicantName: app.userDetails.full_name,
        position: app.jobDetails.title,
        dateApplied: new Date(app.date_applied).toLocaleDateString(),
        status: app.status,
        notes: "",
        resume: app.userDetails.resume,
        editing: false
      }));

      res.status(200).json(transformedApplications);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch applications" });
    }
  },

  /**
   * Updates the status of a job application
   * @async
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.applicationId - Application ID
   * @param {Object} req.body - Request body
   * @param {string} req.body.status - New application status
   * @param {string} [req.body.notes] - Optional notes about the application
   * @param {Object} req.user - User object from authentication middleware
   * @param {string} req.user.id - User ID
   * @param {boolean} req.user.isEmployer - Whether user is an employer
   * @param {Object} res - Express response object
   * @returns {Promise<Object>} Success message or error response
   * @throws {Error} 403 if user is not an employer
   * @throws {Error} 400 if status is invalid
   * @throws {Error} 404 if application not found
   * @throws {Error} 500 if server error occurs
   */
  updateApplicationStatus: async (req, res) => {
    try {
      if (!req.user.isEmployer) {
        return res.status(403).json({ error: "Only employers can update applications" });
      }

      const { applicationId } = req.params;
      const { status, notes } = req.body;

      const validStatuses = ["Pending", "Reviewed", "Interviewing", "Offered", "Rejected"];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: "Invalid status value" });
      }

      const applicationsCollection = req.app.locals.db.collection("applications");
      
      const application = await applicationsCollection.aggregate([
        {
          $match: {
            _id: ObjectId.createFromHexString(applicationId)
          }
        },
        {
          $lookup: {
            from: "Jobs",
            localField: "job_id",
            foreignField: "_id",
            as: "jobDetails"
          }
        },
        {
          $unwind: "$jobDetails"
        },
        {
          $match: {
            "jobDetails.employerId": ObjectId.createFromHexString(req.user.id)
          }
        }
      ]).toArray();

      if (application.length === 0) {
        return res.status(404).json({ error: "Application not found or unauthorized" });
      }

      const result = await applicationsCollection.updateOne(
        { _id: ObjectId.createFromHexString(applicationId) },
        { 
          $set: { 
            status,
            updatedAt: new Date()
          }
        }
      );

      if (result.modifiedCount === 0) {
        return res.status(404).json({ error: "Application not found" });
      }

      res.status(200).json({ message: "Application status updated successfully" });
    } catch (error) {
      res.status(500).json({ error: "Failed to update application status" });
    }
  },

  /**
   * Retrieves detailed information about a specific application
   * @async
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.applicationId - Application ID
   * @param {Object} req.user - User object from authentication middleware
   * @param {string} req.user.id - User ID
   * @param {boolean} req.user.isEmployer - Whether user is an employer
   * @param {Object} res - Express response object
   * @returns {Promise<Object>} Detailed application information
   * @throws {Error} 403 if user is not an employer
   * @throws {Error} 404 if application not found
   * @throws {Error} 500 if server error occurs
   */
  getApplicationDetails: async (req, res) => {
    try {
      if (!req.user.isEmployer) {
        return res.status(403).json({ error: "Only employers can access this endpoint" });
      }

      const { applicationId } = req.params;
      const applicationsCollection = req.app.locals.db.collection("applications");
      const jobsCollection = req.app.locals.db.collection("Jobs");
      const usersCollection = req.app.locals.db.collection("users");

      const application = await applicationsCollection.aggregate([
        {
          $match: {
            _id: ObjectId.createFromHexString(applicationId)
          }
        },
        {
          $lookup: {
            from: "Jobs",
            localField: "job_id",
            foreignField: "_id",
            as: "jobDetails"
          }
        },
        {
          $unwind: "$jobDetails"
        },
        {
          $match: {
            "jobDetails.employerId": ObjectId.createFromHexString(req.user.id)
          }
        },
        {
          $lookup: {
            from: "users",
            localField: "user_id",
            foreignField: "_id",
            as: "userDetails"
          }
        },
        {
          $unwind: "$userDetails"
        }
      ]).toArray();

      if (application.length === 0) {
        return res.status(404).json({ error: "Application not found or unauthorized" });
      }

      res.status(200).json(application[0]);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch application details" });
    }
  }
};

module.exports = applicationsController; 