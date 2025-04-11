const { ObjectId } = require("mongodb");

/**
 * Controller for handling messaging-related operations
 * @namespace messagesController
 */
const messagesController = {
  /**
   * Retrieves all messages for the logged-in user
   * @async
   * @param {Object} req - Express request object
   * @param {Object} req.user - User object from authentication middleware
   * @param {string} req.user.id - User ID
   * @param {Object} res - Express response object
   * @returns {Promise<Array>} Array of messages
   * @throws {Error} 500 if server error occurs
   */
  getMessages: async (req, res) => {
    try {
      const messagesCollection = req.app.locals.db.collection("messages");

      const messages = await messagesCollection.find({
        $or: [
          { senderId: new ObjectId(req.user.id) },
          { receiverId: new ObjectId(req.user.id) }
        ]
      }).sort({ createdAt: -1 }).toArray();

      res.status(200).json(messages);
    } catch (error) {
      res.status(500).json({ error: "Failed to retrieve messages" });
    }
  },

  /**
   * Marks messages as read for a specific contact
   * @async
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.contactId - Contact's user ID
   * @param {Object} req.user - User object from authentication middleware
   * @param {string} req.user.id - User ID
   * @param {Object} res - Express response object
   * @returns {Promise<Object>} Success message with count of marked messages
   * @throws {Error} 500 if server error occurs
   */
  markMessagesAsRead: async (req, res) => {
    try {
      const messagesCollection = req.app.locals.db.collection("messages");
      const contactId = req.params.contactId;
      const userId = req.user.id;
      const readTimestamp = new Date();

      const result = await messagesCollection.updateMany(
        {
          $and: [
            {
              $or: [
                { senderId: new ObjectId(contactId), receiverId: new ObjectId(userId) },
                { senderId: new ObjectId(userId), receiverId: new ObjectId(contactId) },
              ],
            },
            { read_timestamp: null },
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
      res.status(500).json({ error: "Failed to mark messages as read" });
    }
  },

  /**
   * Marks messages from a company as read for the logged-in user
   * @async
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.companyId - Company ID
   * @param {Object} req.user - User object from authentication middleware
   * @param {string} req.user.id - User ID
   * @param {Object} res - Express response object
   * @returns {Promise<Object>} Success message with count of marked messages
   * @throws {Error} 500 if server error occurs
   */
  markCompanyMessagesAsRead: async (req, res) => {
    try {
      const messagesCollection = req.app.locals.db.collection("messages");
      const companyId = req.params.companyId;
      const userId = req.user.id;
      const readTimestamp = new Date();

      const result = await messagesCollection.updateMany(
        {
          $and: [
            {
              $or: [
                { companyId: new ObjectId(companyId), receiverId: new ObjectId(userId) },
                { companyId: new ObjectId(companyId), senderId: new ObjectId(userId) },
              ],
            },
            { read_timestamp: null },
          ],
        },
        {
          $set: { read_timestamp: readTimestamp },
        }
      );

      if (result.modifiedCount > 0) {
        res.status(200).json({
          message: `${result.modifiedCount} company messages marked as read.`,
          modifiedCount: result.modifiedCount,
        });
      } else {
        res.status(200).json({ message: "No unread company messages found." });
      }
    } catch (error) {
      console.error("Error marking company messages as read:", error);
      res.status(500).json({ error: "Failed to mark company messages as read" });
    }
  },

  /**
   * Sends a new message to a user
   * @async
   * @param {Object} req - Express request object
   * @param {Object} req.body - Request body
   * @param {string} req.body.receiverId - Recipient's user ID
   * @param {string} req.body.content - Message content
   * @param {Object} req.user - User object from authentication middleware
   * @param {string} req.user.id - User ID
   * @param {Object} res - Express response object
   * @returns {Promise<Object>} Created message object
   * @throws {Error} 400 if required fields are missing
   * @throws {Error} 500 if server error occurs
   */
  sendMessage: async (req, res) => {
    try {
      const { receiverId, content } = req.body;

      if (!content || !receiverId) {
        return res.status(400).json({ error: "Message content and receiver ID are required" });
      }

      const messagesCollection = req.app.locals.db.collection("messages");
      const usersCollection = req.app.locals.db.collection("users");

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
        senderId: new ObjectId(req.user.id),
        receiverId: new ObjectId(receiverId),
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
      res.status(500).json({ error: "Failed to send message" });
    }
  },

  /**
   * Retrieves recent contacts for the logged-in user
   * @async
   * @param {Object} req - Express request object
   * @param {Object} req.user - User object from authentication middleware
   * @param {string} req.user.id - User ID
   * @param {Object} res - Express response object
   * @returns {Promise<Array>} Array of contacts with unread message counts
   * @throws {Error} 500 if server error occurs
   */
  getRecentContacts: async (req, res) => {
    try {
      const messagesCollection = req.app.locals.db.collection("messages");
      const usersCollection = req.app.locals.db.collection("users");

      const contacts = await messagesCollection.aggregate([
        {
          $match: {
            $or: [
              { senderId: new ObjectId(req.user.id) },
              { receiverId: new ObjectId(req.user.id) },
            ],
          },
        },
        {
          $group: {
            _id: {
              contactId: {
                $cond: {
                  if: { $eq: ['$senderId', new ObjectId(req.user.id)] },
                  then: '$receiverId',
                  else: '$senderId',
                },
              },
              contactName: {
                $cond: {
                  if: { $eq: ['$senderId', new ObjectId(req.user.id)] },
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
                      { $eq: ['$receiverId', new ObjectId(req.user.id)] },
                      { $or: [
                        { $eq: ['$read_timestamp', null] },
                        { $eq: [{ $type: '$read_timestamp' }, 'missing'] }
                      ]}
                    ]
                  },
                  then: 1,
                  else: 0
                }
              }
            },
          },
        },
        {
          $project: {
            _id: 0,
            _id: '$_id.contactId',
            full_name: '$_id.contactName',
            countOfUnreadMessages: 1,
          },
        },
        {
          $sort: { full_name: 1, _id: 1 },
        },
      ]).toArray();

      res.status(200).json(contacts);
    } catch (error) {
      res.status(500).json({ error: "Failed to retrieve recent contacts" });
    }
  },

  /**
   * Retrieves unique employers from user's applications
   * @async
   * @param {Object} req - Express request object
   * @param {Object} req.user - User object from authentication middleware
   * @param {string} req.user.id - User ID
   * @param {Object} res - Express response object
   * @returns {Promise<Array>} Array of unique employers with company details
   * @throws {Error} 500 if server error occurs
   */
  getEmployersFromApplications: async (req, res) => {
    try {
      const applicationsCollection = req.app.locals.db.collection("applications");
      const companiesCollection = req.app.locals.db.collection("companies");

      // Get unique company IDs from user's applications
      const uniqueEmployers = await applicationsCollection.aggregate([
        {
          $match: {
            user_id: ObjectId.createFromHexString(req.user.id),
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
          $group: {
            _id: "$jobDetails.companyId",
            companyName: { $first: "$jobDetails.companyName" },
            jobCount: { $sum: 1 }
          }
        },
        {
          $lookup: {
            from: "companies",
            localField: "_id",
            foreignField: "_id",
            as: "companyDetails"
          }
        },
        {
          $unwind: "$companyDetails"
        },
        {
          $project: {
            _id: 1,
            companyName: 1,
            jobCount: 1,
            companyDetails: 1
          }
        },
        {
          $sort: { companyName: 1 }
        }
      ]).toArray();

      res.status(200).json(uniqueEmployers);
    } catch (error) {
      console.error("Error fetching employers from applications:", error);
      res.status(500).json({ error: "Failed to retrieve employers from applications" });
    }
  },

  /**
   * Retrieves recent employer contacts for the logged-in user with unread message counts
   * @async
   * @param {Object} req - Express request object
   * @param {Object} req.user - User object from authentication middleware
   * @param {string} req.user.id - User ID
   * @param {Object} res - Express response object
   * @returns {Promise<Array>} Array of employer contacts with unread message counts
   * @throws {Error} 500 if server error occurs
   */
  getRecentEmployerContacts: async (req, res) => {
    try {
      const messagesCollection = req.app.locals.db.collection("messages");
      const companiesCollection = req.app.locals.db.collection("companies");
      const applicationsCollection = req.app.locals.db.collection("applications");

      // First, get all companies the user has applied to
      const userApplications = await applicationsCollection.aggregate([
        { //get my applications
          $match: {
            user_id: ObjectId.createFromHexString(req.user.id),
            swipeMode: 1 // Only include applications (not ignored jobs)
          }
        },
        { //get job details
          $lookup: {
            from: "Jobs",
            localField: "job_id",
            foreignField: "_id",
            as: "jobDetails"
          }
        },
        { //unwind job details
          $unwind: "$jobDetails"
        },
        { //group by company id
          $group: {
            _id: "$jobDetails.companyId"
          }
        }
      ]).toArray();

      //console.log("User applications:", JSON.stringify(userApplications, null, 2));

      // Extract company IDs from applications
      const companyIds = userApplications.map(app => app._id);
//      console.log("Company IDs:", companyIds);

      // Get messages between the user and these companies
      const contacts = await messagesCollection.aggregate([
        {
          $match: {
            senderId: new ObjectId(req.user.id), 
            companyId: { $in: companyIds }
          }
        },
        {
          $group: {
            _id: {
              companyId: "$companyId"
            },
            countOfUnreadMessages: {
              $sum: {
                $cond: {
                  if: {
                    $and: [
                      { $eq: ['$senderId', new ObjectId(req.user.id)] },
                      { $or: [
                        { $eq: ['$read_timestamp', null] },
                        { $eq: [{ $type: '$read_timestamp' }, 'missing'] }
                      ]}
                    ]
                  },
                  then: 1,
                  else: 0
                }
              }
            }
          }
        },
        {
          $project: {
            _id: 0,
            _id: '$_id.companyId',
            countOfUnreadMessages: 1
          }
        }
      ]).toArray();

      //console.log("Contacts:", JSON.stringify(contacts, null, 2));

      // Add companies from applications that don't have messages yet
      const contactsWithCompanyIds = contacts.map(contact => contact._id.toString());
      
      const additionalCompanies = userApplications
        .filter(app => !contactsWithCompanyIds.includes(app._id.toString()))
        .map(app => ({
          _id: app._id,
          countOfUnreadMessages: 0
        }));

      //console.log("Additional companies:", JSON.stringify(additionalCompanies, null, 2));

      // Combine both lists
      const allContacts = [...contacts, ...additionalCompanies];

      // Look up company names from the companies collection
      const companyIdsToLookup = allContacts.map(contact => 
        typeof contact._id === 'string' ? ObjectId.createFromHexString(contact._id) : contact._id
      );
      
      const companies = await companiesCollection.find({
        _id: { $in: companyIdsToLookup }
      }).toArray();
      
      // Create a map of company IDs to company names
      const companyMap = {};
      companies.forEach(company => {
        companyMap[company._id.toString()] = company.name;
      });
      
      // Update all contacts with company names from the companies collection
      const contactsWithNames = allContacts.map(contact => {
        const companyId = contact._id.toString();
        return {
          ...contact,
          companyName: companyMap[companyId] || 'Unknown Company'
        };
      });

      //console.log("Final contacts with names:", JSON.stringify(contactsWithNames, null, 2));

      // Sort by company name
      contactsWithNames.sort((a, b) => a.companyName.localeCompare(b.companyName));

      res.status(200).json(contactsWithNames);
    } catch (error) {
      console.error("Error fetching recent employer contacts:", error);
      res.status(500).json({ error: "Failed to retrieve recent employer contacts" });
    }
  },

  /**
   * Sends a new message to a company
   * @async
   * @param {Object} req - Express request object
   * @param {Object} req.body - Request body
   * @param {string} req.body.companyId - Recipient's company ID
   * @param {string} req.body.content - Message content
   * @param {Object} req.user - User object from authentication middleware
   * @param {string} req.user.id - User ID
   * @param {Object} res - Express response object
   * @returns {Promise<Object>} Created message object
   * @throws {Error} 400 if required fields are missing
   * @throws {Error} 500 if server error occurs
   */
  sendMessageToCompany: async (req, res) => {
    try {
      const { companyId, content } = req.body;
      //console.log("Sending message to company:", companyId, content, req.user.id);
      if (!content || !companyId) {
        return res.status(400).json({ error: "Message content and company ID are required" });
      }

      const messagesCollection = req.app.locals.db.collection("messages");
      const usersCollection = req.app.locals.db.collection("users");
      const companiesCollection = req.app.locals.db.collection("companies");

      // Get sender and company details
      const [sender, company] = await Promise.all([
        usersCollection.findOne(
          { _id: ObjectId.createFromHexString(req.user.id) },
          { projection: { full_name: 1, first_name: 1, last_name: 1, email: 1 } }
        ),
        companiesCollection.findOne(
          { _id: ObjectId.createFromHexString(companyId) },
          { projection: { name: 1, description: 1 } }
        )
      ]);

      if (!company) {
        return res.status(404).json({ error: "Company not found" });
      }

      // Get display names
      const senderName = sender.full_name || `${sender.first_name || ''} ${sender.last_name || ''}`.trim();
      const senderEmail = sender.email;
      const companyName = company.name;

      const message = {
        senderId: new ObjectId(req.user.id),
        companyId: new ObjectId(companyId),
        senderName,
        companyName,
        senderEmail,
        content,
        createdAt: new Date(),
      };
      await messagesCollection.insertOne(message);
      res.status(201).json(message);
    } catch (error) {
      console.error("Error sending message to company:", error);
      res.status(500).json({ error: "Failed to send message to company" });
    }
  }
};

module.exports = messagesController; 