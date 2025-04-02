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
          { senderId: req.user.id },
          { receiverId: req.user.id }
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
                { senderId: contactId, receiverId: userId },
                { senderId: userId, receiverId: contactId },
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
  }
};

module.exports = messagesController; 