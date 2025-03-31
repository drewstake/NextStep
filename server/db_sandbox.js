import dotenv from 'dotenv';
dotenv.config(); // Load environment variables from .env

// Replace other require() statements with import statements similarly
import { MongoClient, ObjectId } from "mongodb";

// Log key environment variables (excluding sensitive data)
console.log("Environment check:", {
    mongoConfigured: !!process.env.MONGODB_URI,
});

const uri = process.env.MONGODB_URI;           // e.g. "mongodb+srv://..."
const dbName = "mydb";                         // or process.env.DB_NAME

async function connectToMongoDB() {
    try {
        const client = new MongoClient(uri);
        await client.connect();
        console.log("Connected to MongoDB");
        return client;
    } catch (error) {
        console.error("Error connecting to MongoDB:", error);
        process.exit(1);
    }
}

const client = await connectToMongoDB();

const db = client.db(dbName);

const usersCollection = db.collection("users");
const messagesCollection = db.collection("messages");
const jobsCollection = db.collection("Jobs");
const applicationsCollection = db.collection("applications");

const user = await usersCollection.findOne({ email: "1@c.com" });
console.log("User:", user);

const firstMessage = await messagesCollection.findOne({ receiverId: "67a51b9435b4200ce77fae57" });
//console.log("First message:", firstMessage);

const samMessageCount = await messagesCollection.countDocuments({ senderId: "67ae50feb99caffaa1b0995b" });
console.log("Sam's Message count:", samMessageCount);

const distinctReceivers = await messagesCollection.distinct('receiverId');
console.log('Distinct Receivers:', distinctReceivers);

const distinctCombinations = await messagesCollection.aggregate([
    {
        $group: {
            _id: { senderId: '$senderId', senderName: '$senderName' },
            count: { $sum: 1 } // Optional: Count occurrences of each combination
        }
    },
    {
        $project: {
            _id: 0, // Exclude the _id field
            senderName: '$_id.senderName',
            senderId: '$_id.senderId',
            count: '$count' // Include the count if needed
        }
    }
]).toArray();


console.log('Distinct Id/Name Combinations:', distinctCombinations);

// Count records with blank or missing senderName using aggregation
const blankOrMissingSenderNameCount = await messagesCollection.aggregate([
    {
        $match: {
            $or: [
                { senderName: { $eq: '' } },
                { senderName: { $exists: false } },
                { senderName: null }
            ]
        }
    },
    {
        $count: 'count'
    }
]).toArray();

//If no matching documents, the array will be empty.
const count = blankOrMissingSenderNameCount.length > 0 ? blankOrMissingSenderNameCount[0].count : 0;
console.log("Blank or Missing Sender Name Count:", count);


// Delete messages where senderName is missing or null
const deleteResult = await messagesCollection.deleteMany({
    $or: [
        { senderName: { $exists: false } },
        { senderName: null },
    ],
});

console.log('Deleted messages:', deleteResult.deletedCount);
// Replace 'yourReceiverId' with the actual receiver ID you want to filter for.

// Replace 'yourUserId' with the actual user ID you want to filter for.
const yourUserId = '67a51b9435b4200ce77fae57'; // Example user ID

const uniqueContactsWithUnreadCounts = await messagesCollection.aggregate([
    {
        $match: {
            $or: [
                { senderId: yourUserId },
                { receiverId: yourUserId },
            ],
        },
    },
    {
        $group: {
            _id: {
                contactId: {
                    $cond: {
                        if: { $eq: ['$senderId', yourUserId] },
                        then: '$receiverId',
                        else: '$senderId',
                    },
                },
                contactName: {
                    $cond: {
                        if: { $eq: ['$senderId', yourUserId] },
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
                                { $eq: ['$receiverId', yourUserId] },
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
        $sort: { countOfUnreadMessages: -1 }, // Optional: Sort by most unread messages.
    },
]).toArray();

console.log('Unique Contacts with Unread Message Counts:', uniqueContactsWithUnreadCounts);


const duplicateEmailCounts = await usersCollection.aggregate([
    {
        $group: {
            _id: '$email',
            count: { $sum: 1 }
        }
    },
    {
        $match: {
            count: { $gt: 1 } // Filter for emails with count greater than 1
        }
    },
    {
        $project: {
            _id: 0,
            email: '$_id',
            count: 1
        }
    }
]).toArray();

console.log('Duplicate Email Counts:', duplicateEmailCounts);


const duplicateNames = await usersCollection.aggregate([
    {
        $group: {
            _id: "$full_name",
            count: { $sum: 1 },
            ids: { $push: "$_id" },
            emails: { $push: "$email" }, // Add this line to collect emails
        },
    },
    {
        $match: {
            count: { $gt: 1 },
        },
    },
    {
        $project: {
            _id: 0,
            full_name: "$_id",
            count: 1,
            ids: 1,
            emails: 1, // Include the emails array in the result
        },
    },
    {
        $sort: { count: -1 },
    },
]).toArray();

console.log('Duplicate Names:', duplicateNames);
/* 
async function deleteDuplicateUsersExcept(
    usersCollection,
    fullName,
    keepEmail
) {
    try {
        const duplicateUsers = await usersCollection
            .find({ full_name: fullName })
            .toArray();

        if (duplicateUsers.length <= 1) {
            console.log(`No duplicates found for ${fullName}, or only one user.`);
            return;
        }

        const idsToDelete = duplicateUsers
            .filter((user) => user.email !== keepEmail)
            .map((user) => user._id);

        if (idsToDelete.length > 0) {
            const deleteResult = await usersCollection.deleteMany({
                _id: { $in: idsToDelete },
            });
            console.log(
                `Deleted ${deleteResult.deletedCount} duplicate users for ${fullName}.`
            );
        } else {
            console.log(`No users to delete for ${fullName}.`);
        }
    } catch (error) {
        console.error("Error deleting duplicate users:", error);
        throw error; // Rethrow the error to be handled upstream if needed
    }
}
 */
// Example Usage (assuming you have usersCollection and the data from your prompt)
// const usersCollection = db.collection("users"); // Replace with your actual collection
/* const fullName = "Bryan Mathews";
const keepEmail = "1@c.com";

await deleteDuplicateUsersExcept(usersCollection, fullName, keepEmail)
    .then(() => {
        console.log("Deletion process completed.");
    })
    .catch((error) => {
        console.error("Error deleting duplicate users:", error);
    });
 */

let recordId = '67a51b9435b4200ce77fae57';

let record = await usersCollection.findOne(
    { _id: ObjectId.createFromHexString(recordId) }, // Use the ObjectId directly
    { projection: { password: 0, encodedPhoto: 0} } // The projection option
);

console.log("user:", record)

const jId = '67e6103f4f519648100abe4a';

const job = await jobsCollection.find(
    { _id: ObjectId.createFromHexString(jId) }
).toArray();

console.log("job:", job)

const aId = '67e8456c5d4c32ccc02c8b46';

const application = await applicationsCollection.find(
    { _id: ObjectId.createFromHexString(aId) }
).toArray();

console.log("application:", application)


client.close();

