const { ObjectId } = require("mongodb");

/**
 * Controller for handling employer messaging operations
 * @namespace employerMessagingController
 */
const employerMessagingController = {
  /**
   * Retrieves all messages for the logged-in employer
   * @async
   * @param {Object} req - Express request object
   * @param {Object} req.user - User object from authentication middleware
   * @param {string} req.user.id - User ID
   * @param {Object} res - Express response object
   * @returns {Promise<Array>} Array of messages
   * @throws {Error} 500 if server error occurs
   */
  getEmployerMessages: async (req, res) => {
    try {
      const usersCollection = req.app.locals.db.collection("users");
      const messagesCollection = req.app.locals.db.collection("messages");
      const employerId = ObjectId.createFromHexString(req.user.id);

      // Look up the employer user to get their companyId
      const employerUser = await usersCollection.findOne({ _id: employerId });
      if (!employerUser || !employerUser.companyId) {
        return res.status(404).json({ error: "Employer user or company ID not found" });
      }
      const companyId = employerUser.companyId;

      const messages = await messagesCollection.find({
        $or: [
          { senderId: employerId, companyId: employerId },
          { receiverId: employerId, companyId: employerId }
        ]
      }).sort({ createdAt: -1 }).toArray();

      res.status(200).json(messages);
    } catch (error) {
      console.error("Error fetching employer messages:", error);
      res.status(500).json({ error: "Failed to retrieve messages" });
    }
  },

  /**
   * Marks messages as read for a specific applicant
   * @async
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.applicantId - Applicant's user ID
   * @param {Object} req.user - User object from authentication middleware
   * @param {string} req.user.id - User ID
   * @param {Object} res - Express response object
   * @returns {Promise<Object>} Success message with count of marked messages
   * @throws {Error} 500 if server error occurs
   */
  markMessagesAsRead: async (req, res) => {
    try {
      const { applicantId } = req.params;
      const messagesCollection = req.app.locals.db.collection("messages");
      const usersCollection = req.app.locals.db.collection("users");
      const employerId = ObjectId.createFromHexString(req.user.id);
      const applicantObjectId = ObjectId.createFromHexString(applicantId);


      // Look up the employer user to get their companyId
      const employerUser = await usersCollection.findOne({ _id: employerId });
      if (!employerUser || !employerUser.companyId) {
        return res.status(404).json({ error: "Employer user or company ID not found" });
      }
      const companyId = employerUser.companyId;


      const result = await messagesCollection.updateMany(
        {
          senderId: applicantObjectId,
          companyId: companyId,
        },
        {
          $set: { read_timestamp: new Date() }
        }
      );

//      console.log("mark result", result.modifiedCount);

      // Retrieve all messages from the specific sender for this company
      const messages = await messagesCollection.find({
        $or: [
          { senderId: applicantObjectId, companyId: companyId },
          { receiverId: applicantObjectId, companyId: companyId }
        ]
      }).sort({ createdAt: 1 }).toArray();

      res.status(200).json({
        messages
      });
    } catch (error) {
      console.error("Error marking messages as read:", error);
      res.status(500).json({ error: "Failed to mark messages as read" });
    }
  },

  /**
   * Retrieves recent applicant contacts for the logged-in employer
   * @async
   * @param {Object} req - Express request object
   * @param {Object} req.user - User object from authentication middleware
   * @param {string} req.user.id - User ID
   * @param {Object} res - Express response object
   * @returns {Promise<Array>} Array of applicant contacts with unread message counts
   * @throws {Error} 500 if server error occurs
   */
  getRecentApplicantContacts: async (req, res) => {
    try {
      const messagesCollection = req.app.locals.db.collection("messages");
      const usersCollection = req.app.locals.db.collection("users");
      const applicationsCollection = req.app.locals.db.collection("applications");
      const jobsCollection = req.app.locals.db.collection("Jobs");
      const employerId = ObjectId.createFromHexString(req.user.id);

      // Look up the employer user to get their companyId
      const employerUser = await usersCollection.findOne({ _id: employerId });
      if (!employerUser || !employerUser.companyId) {
        return res.status(404).json({ error: "Employer user or company ID not found" });
      }
      const companyId = employerUser.companyId;
      // First, get all jobs posted by this employer
      const employerJobs = await jobsCollection.find({
        companyId: companyId
      }).toArray();

      const jobIds = employerJobs.map(job => job._id);
      // Get all applications for these jobs
      const jobApplications = await applicationsCollection.find({
        job_id: { $in: jobIds },
        swipeMode: 1
      }).toArray();

      // Extract applicant IDs from applications and ensure uniqueness
      const uniqueApplicantIds = [...new Set(jobApplications.map(app => app.user_id.toString()))];
      
      // I am an EMPLOYER
      // Messages meant for me have my companyId in the companyId field
      const contacts = await messagesCollection.aggregate([
        {
          $match: {
            companyId: companyId,
            senderId: { $in: uniqueApplicantIds.map(id => ObjectId.createFromHexString(id)) }
          }
        },
        {
          $group: {
            _id: {applicantId: "$senderId"},
            countOfUnreadMessages: {
              $sum: {
                $cond: {
                  if: {
                    $and: [
                      { $eq: ['$companyId', companyId] },
                      {
                        $or: [
                          { $eq: ['$read_timestamp', null] },
                          { $eq: [{ $type: '$read_timestamp' }, 'missing'] }
                        ]
                      }
                    ]
                  },
                  then: 1,
                  else: 0
                }
              }
            },
            lastMessageTimestamp: { $max: "$createdAt" }
          }
        },
        {
          $project: {
            _id: 0,
            _id: '$_id.applicantId',
            countOfUnreadMessages: 1,
            lastMessageTimestamp: 1
          }
        }
      ]).toArray();

      // Add applicants from applications that don't have messages yet
      const contactsWithApplicantIds = new Set(contacts.map(contact => contact._id.toString()));
      const additionalApplicants = jobApplications
        .filter(app => !contactsWithApplicantIds.has(app.user_id.toString()))
        .map(app => ({
          _id: app.user_id,
          countOfUnreadMessages: 0,
          lastMessageTimestamp: null
        }))
        .filter((app, index, self) => 
          index === self.findIndex(a => a._id.toString() === app._id.toString())
        );

      // Combine both lists
      const allContacts = [...contacts, ...additionalApplicants];

      // Look up applicant details from the users collection
      const applicantIdsToLookup = allContacts.map(contact =>
        typeof contact._id === 'string' ? ObjectId.createFromHexString(contact._id) : contact._id
      );
      //console.log("applicantIdsToLookup", applicantIdsToLookup);

      const applicants = await usersCollection.find({
        _id: { $in: applicantIdsToLookup }
      }).toArray();

      // Create a map of applicant IDs to applicant details
      const applicantMap = {};
      applicants.forEach(applicant => {
        const fullName = applicant.full_name ||
          `${applicant.first_name || ''} ${applicant.last_name || ''}`.trim();
        applicantMap[applicant._id.toString()] = {
          name: fullName,
          email: applicant.email,
          phone: applicant.phone,
          
        };
      });

      
      //      console.log("applicantMap", applicantMap);  
      // Update all contacts with applicant details

      const contactsWithDetails = allContacts.map(contact => {
        const applicantId = contact._id.toString();
        const applicantDetails = applicantMap[applicantId] || {};
        return {
          _id: contact._id,
          ...applicantDetails,
          countOfUnreadMessages: contact.countOfUnreadMessages,
          lastMessageTimestamp: contact.lastMessageTimestamp
        };
      });

      // Sort by lastMessageTimestamp in descending order
      contactsWithDetails.sort((a, b) => {
        // Handle null timestamps by putting them at the end
        if (!a.lastMessageTimestamp && !b.lastMessageTimestamp) return 0;
        if (!a.lastMessageTimestamp) return 1;
        if (!b.lastMessageTimestamp) return -1;
        return new Date(b.lastMessageTimestamp) - new Date(a.lastMessageTimestamp);
      });

      res.status(200).json(contactsWithDetails);
    } catch (error) {
      console.error("Error fetching recent applicant contacts:", error);
      res.status(500).json({ error: "Failed to retrieve recent applicant contacts" });
    }
  },

  /**
   * Retrieves applicants from employer's job postings
   * @async
   * @param {Object} req - Express request object
   * @param {Object} req.user - User object from authentication middleware
   * @param {string} req.user.id - User ID
   * @param {Object} res - Express response object
   * @returns {Promise<Array>} Array of applicants with details
   * @throws {Error} 500 if server error occurs
   */
  getApplicantsFromJobs: async (req, res) => {
    try {
      const applicationsCollection = req.app.locals.db.collection("applications");
      const usersCollection = req.app.locals.db.collection("users");
      const jobsCollection = req.app.locals.db.collection("Jobs");
      const employerId = ObjectId.createFromHexString(req.user.id);

      // Get all jobs posted by this employer
      const employerJobs = await jobsCollection.find({
        companyId: employerId
      }).toArray();

      const jobIds = employerJobs.map(job => job._id);

      // Get all applications for these jobs
      const jobApplications = await applicationsCollection.find({
        job_id: { $in: jobIds },
        swipeMode: 1
      }).toArray();

      // Extract unique applicant IDs from applications
      const uniqueApplicantIds = [...new Set(jobApplications.map(app =>
        typeof app.user_id === 'string' ? ObjectId.createFromHexString(app.user_id) : app.user_id
      ))];

      // Look up applicant details from the users collection
      const applicants = await usersCollection.find({
        _id: { $in: uniqueApplicantIds }
      }).toArray();

      // Format applicant data for response
      const formattedApplicants = applicants.map(applicant => {
        const fullName = applicant.full_name ||
          `${applicant.first_name || ''} ${applicant.last_name || ''}`.trim();

        return {
          _id: applicant._id,
          name: fullName,
          email: applicant.email,
          profile: applicant.profile || {}
        };
      });

      // Sort by name
      formattedApplicants.sort((a, b) => a.name.localeCompare(b.name));

      res.status(200).json(formattedApplicants);
    } catch (error) {
      console.error("Error fetching applicants from jobs:", error);
      res.status(500).json({ error: "Failed to retrieve applicants from jobs" });
    }
  },

  /**
   * Sends a new message to an applicant
   * @async
   * @param {Object} req - Express request object
   * @param {Object} req.body - Request body
   * @param {string} req.body.applicantId - Recipient's user ID
   * @param {string} req.body.content - Message content
   * @param {Object} req.user - User object from authentication middleware
   * @param {string} req.user.id - User ID
   * @param {Object} res - Express response object
   * @returns {Promise<Object>} Created message object
   * @throws {Error} 400 if required fields are missing
   * @throws {Error} 500 if server error occurs
   */
  sendMessageToApplicant: async (req, res) => {
    try {
      const { applicantId, content } = req.body;

      if (!content || !applicantId) {
        return res.status(400).json({ error: "Message content and applicant ID are required" });
      }


      const messagesCollection = req.app.locals.db.collection("messages");
      const usersCollection = req.app.locals.db.collection("users");
      const companiesCollection = req.app.locals.db.collection("companies");
      const employerId = ObjectId.createFromHexString(req.user.id);
      const applicantObjectId = ObjectId.createFromHexString(applicantId);


      // Get employer user to derive companyId
      const employerUser = await usersCollection.findOne({ _id: employerId });
      if (!employerUser || !employerUser.companyId) {
        return res.status(404).json({ error: "Employer user or company ID not found" });
      }
      const companyId = employerUser.companyId;

      // Get sender (company) and applicant details
      const [company, applicant] = await Promise.all([
        companiesCollection.findOne(
          { _id: companyId },
          { projection: { name: 1, description: 1 } }
        ),
        usersCollection.findOne(
          { _id: applicantObjectId },
          { projection: { full_name: 1, first_name: 1, last_name: 1, email: 1 } }
        )
      ]);

      if (!company) {
        return res.status(404).json({ error: "Company not found" });
      }

      if (!applicant) {
        return res.status(404).json({ error: "Applicant not found" });
      }

      // Get display names
      const companyName = company.name;
      const applicantName = applicant.full_name || `${applicant.first_name || ''} ${applicant.last_name || ''}`.trim();
      const applicantEmail = applicant.email;

      const message = {
        senderId: employerId,
        receiverId: applicantObjectId,
        companyId: companyId,
        companyName,
        applicantName,
        applicantEmail,
        content,
        createdAt: new Date(),
      };

      await messagesCollection.insertOne(message);

      res.status(201).json(message);
    } catch (error) {
      console.error("Error sending message to applicant:", error);
      res.status(500).json({ error: "Failed to send message to applicant" });
    }
  }
};

module.exports = employerMessagingController; 