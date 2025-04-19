const { ObjectId } = require("mongodb");
const { sendEmail } = require('../middleware/mailer');

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
   * @param {boolean} req.user.employerFlag - Whether user is an employer
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
      const { _id, swipeMode, email, name } = req.body;


      const applicationInfo = {
        job_id: ObjectId.createFromHexString(_id),
        user_id: ObjectId.createFromHexString(req.user.id),
        name,
        email,
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
      console.log("trackApplication error", err);
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
   * @param {boolean} req.user.employerFlag - Whether user is an employer
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
          {
            $lookup: {
              from: "companies",
              localField: "jobDetails.companyId",
              foreignField: "_id",
              as: "companyDetails",
            },
          },
          { $unwind: "$companyDetails" },
          {
            $project: {
              _id: 1,
              job_id: 1,
              user_id: 1,
              date_applied: 1,
              status: 1,
              swipeMode: 1,
              swipeAction: 1,
              name: 1,
              email: 1,
              jobDetails: 1,
              companyDetails: 1
            }
          }
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
   * @param {boolean} req.user.employerFlag - Whether user is an employer
   * @param {Object} res - Express response object
   * @returns {Promise<Array>} Array of transformed application objects
   * @throws {Error} 403 if user is not an employer
   * @throws {Error} 500 if server error occurs
   */
  getEmployerApplications: async (req, res) => {
    try {
      if (!req.user.employerFlag) {
        return res.status(403).json({ error: "Only employers can access this endpoint" });
      }

      const applicationsCollection = req.app.locals.db.collection("applications");
      const jobsCollection = req.app.locals.db.collection("Jobs");
      const usersCollection = req.app.locals.db.collection("users");

      // Get the current user's company ID
      const currentUser = await usersCollection.findOne({ 
        _id: ObjectId.createFromHexString(req.user.id) 
      });

      if (!currentUser || !currentUser.companyId) {
        return res.status(400).json({ error: "User not associated with any company" });
      }

      const companyId = currentUser.companyId;

      // First, get all jobs for this company to verify they exist
      const companyJobs = await jobsCollection.find({ 
        companyId: ObjectId.createFromHexString(companyId.toString()) 
      }).toArray();
      
      
      if (companyJobs.length === 0) {
        return res.status(200).json([]); // No jobs for this company, so no applications
      }

      // Get all job IDs for this company
      const companyJobIds = companyJobs.map(job => job._id);

      // Get all applications for these jobs with user details
      const applications = await applicationsCollection.aggregate([
        {
          $match: {
            job_id: { $in: companyJobIds },
            swipeMode: 1 // Only include applications (not ignored jobs)
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

      const transformedApplications = applications.map(app => ({
        id: app._id,
        job_id: app.job_id,
        company_id: app.jobDetails.companyId,
        applicantId: app.user_id,
        applicantName: app.userDetails.full_name,
        position: app.jobDetails.title,
        dateApplied: new Date(app.date_applied).toLocaleDateString(),
        status: app.status,
        notes: "",
        resume: app.userDetails.resume,
        editing: false,
        user: {
          full_name: app.userDetails.full_name,
          email: app.userDetails.email,
          phone: app.userDetails.phone
        }
      }));

      res.status(200).json(transformedApplications);
    } catch (error) {
      console.error("Error in getEmployerApplications:", error);
      res.status(500).json({ error: `Failed to fetch applications: ${error.message}` });
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
   * @param {boolean} req.user.employerFlag - Whether user is an employer
   * @param {Object} res - Express response object
   * @returns {Promise<Object>} Success message or error response
   * @throws {Error} 403 if user is not an employer
   * @throws {Error} 400 if status is invalid
   * @throws {Error} 404 if application not found
   * @throws {Error} 500 if server error occurs
   */
  updateApplicationStatus: async (req, res) => {
    try {
      if (!req.user.employerFlag) {
        return res.status(403).json({ error: "Only employers can update application status" });
      }

      const { applicationId } = req.params;
      const { status, notes } = req.body;

      const validStatuses = ["Pending", "Interviewing", "Offered", "Rejected"];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: "Invalid status. Must be one of: pending, interviewing, accepted, rejected" });
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
          $lookup: {
            from: "companies",
            localField: "jobDetails.companyId",
            foreignField: "_id",
            as: "companyDetails"
          }
        },
        {
          $unwind: "$companyDetails"
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

      const appl_email = application[0].email;
      const appl_name = application[0].name;
      const company_name = application[0].companyDetails.name;
      const jobTitle = application[0].jobDetails.title;
      const senderEmail = "bzm436@psu.edu";

      if (status === 'Offered') {
        sendEmail(
          senderEmail, // sender email
          company_name,      // From who
          appl_email, // applicant email
          appl_name,           // applicant name
          "Next Step Offer",    // subject
          `
            <html>
                <body>
                    <h2>Job Offer Letter</h2>
                    <p>Dear ${appl_name},</p>
                    <p>We are pleased to inform you that you have been selected for the position of <strong>Software Developer</strong> at our company. After reviewing your qualifications and performance during the interview, we are confident that you will be a valuable addition to our team.</p>
                    
                    <p><strong>Position:</strong> ${jobTitle}</p>
                    
                    <p>We believe your experience and skills will make a significant impact in our company, and we are excited to have you on board. Please review the attached offer details and respond with your acceptance by <strong>April 20, 2025</strong>.</p>
                    
                    <p>If you have any questions, feel free to reach out to our HR department by messaging us on the platform.</p>
                    
                    <p>Looking forward to your positive response!</p>
                    
                    <p>Sincerely,</p>
                    <p><br>HR Manager<br>${company_name}</p>
                </body>
            </html>
            `
        );
      }
      //interviewing, pending, rejected, 
      if (status === 'Rejected') {
        sendEmail(
          senderEmail, // sender email
          company_name,      // From who
          appl_email, // applicant email
          appl_name,           // applicant name
          "Next Step Job Application Update",    // subject
          `
            <html>
                <body>
                  <html>
                      <body>
                          <h2>Job Application Status</h2>
                          <p>Dear ${appl_name},</p>
                          
                          <p>Thank you for your interest in the position of <strong>${jobTitle}</strong> at ${company_name}. We truly appreciate the time and effort you invested in the interview process. After careful consideration, we regret to inform you that we will not be moving forward with your application for this role.</p>

                          <p>While your qualifications and experience are impressive, we have decided to proceed with another candidate whose skills more closely align with the current needs of the position. This decision was not an easy one, as we had a number of strong applicants.</p>

                          <p>We will keep your resume on file for future opportunities that may better suit your background, and we encourage you to apply for any other roles with us that you feel may be a good fit.</p>

                          <p>If you would like feedback on your interview or have any questions, feel free to reach out to us by messaging us on the platform.</p>

                          <p>Thank you again for your time and for considering ${company_name}. We wish you the best of luck with your job search and future career endeavors.</p>

                          <p>Sincerely,</p>
                          <p><br>HR Manager<br>${company_name}</p>
                      </body>
                  </html>
                </body>
            </html>
            `
        );
      }

      if (status === 'Pending') {
        sendEmail(
          senderEmail, // sender email
          company_name,      // From who
          appl_email,        // applicant email
          appl_name,         // applicant name
          "Next Step Job Application Received", // subject
          `
            <html>
                <body>
                    <h2>Job Application Status</h2>
                    <p>Dear ${appl_name},</p>
    
                    <p>Thank you for your application for the position of <strong>${jobTitle}</strong> at ${company_name}. We are currently reviewing all the applications and appreciate your patience during this process.</p>
    
                    <p>Please note that we will be in touch with you once we've completed our initial review. If we feel that your qualifications match the position, we will contact you for further steps.</p>
    
                    <p>If you have any questions or need more information, please feel free to reach out by messaging us on the platform.</p>
    
                    <p>Thank you again for considering ${company_name}. We will be in touch soon.</p>
    
                    <p>Sincerely,</p>
                    <p><br>HR Manager<br>${company_name}</p>
                </body>
            </html>
            `
        );
      }

      if (status === 'Interviewing') {
        sendEmail(
          senderEmail, // sender email
          company_name,      // From who
          appl_email,        // applicant email
          appl_name,         // applicant name
          "Next Step - Interview Scheduling", // subject
          `
          <html>
              <body>
                  <h2>Job Application - Interview Invitation</h2>
                  <p>Dear ${appl_name},</p>
  
                  <p>Thank you for your interest in the position of <strong>${jobTitle}</strong> at ${company_name}. We have reviewed your application, and we would like to move forward with scheduling an interview with you.</p>
  
                  <p>Please contact us at your earliest convenience to arrange a suitable time for the interview. You can reach our HR department directly by messaging us on the platform or simply reply to this email with your available dates and times.</p>
  
                  <p>We look forward to discussing your qualifications further and getting to know you better during the interview.</p>
  
                  <p>If you have any questions or need further information, don't hesitate to ask. We are excited to speak with you soon!</p>
  
                  <p>Sincerely,</p>
                  <p><br>HR Manager<br>${company_name}</p>
              </body>
          </html>
          `
        );
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
   * @param {boolean} req.user.employerFlag - Whether user is an employer
   * @param {Object} res - Express response object
   * @returns {Promise<Object>} Detailed application information
   * @throws {Error} 403 if user is not an employer
   * @throws {Error} 404 if application not found
   * @throws {Error} 500 if server error occurs
   */
  getApplicationDetails: async (req, res) => {
    try {
      if (!req.user.employerFlag) {
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
  },

  /**
   * Retrieves all applications in the database without filtering
   * @async
   * @param {Object} req - Express request object
   * @param {Object} req.user - User object from authentication middleware
   * @param {string} req.user.id - User ID
   * @param {boolean} req.user.employerFlag - Whether user is an employer
   * @param {Object} res - Express response object
   * @returns {Promise<Array>} Array of all applications with job and user details
   * @throws {Error} 403 if user is not an employer
   * @throws {Error} 500 if server error occurs
   */
  getAllApplications: async (req, res) => {
    try {
/*       if (!req.user.employerFlag) {
        return res.status(403).json({ error: "Only employers can access this endpoint" });
      }
 */
      const applicationsCollection = req.app.locals.db.collection("applications");

      const allApplications = await applicationsCollection
        .aggregate([
          {
            $lookup: {
              from: "Jobs",
              localField: "job_id",
              foreignField: "_id",
              as: "jobDetails",
            },
          },
          { $unwind: "$jobDetails" },
          {
            $lookup: {
              from: "users",
              localField: "user_id",
              foreignField: "_id",
              as: "userDetails",
            },
          },
          { $unwind: "$userDetails" },
          {
            $lookup: {
              from: "companies",
              localField: "jobDetails.companyId",
              foreignField: "_id",
              as: "companyDetails",
            },
          },
          { $unwind: "$companyDetails" },
          {
            $project: {
              _id: 1,
              job_id: 1,
              user_id: 1,
              date_applied: 1,
              status: 1,
              swipeMode: 1,
              swipeAction: 1,
              name: 1,
              email: 1,
              jobDetails: 1,
              userDetails: 1,
              companyDetails: 1
            }
          }
        ])
        .toArray();

      res.status(200).json(allApplications);
    } catch (error) {
      res.status(500).json({ error: `Error retrieving all applications. ${error.message}` });
    }
  }
};

module.exports = applicationsController; 