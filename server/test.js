const axios = require('axios');
const dotenv = require("dotenv");

// this will load config properties, keys, etc. from .env file
dotenv.config();

const BASE_URL = 'http://localhost:' + process.env.PORT;

// Call the function to connect to MongoDB 
//connectToMongoDB();

async function connectToMongoDB() {
    const { MongoClient, ObjectId } = require('mongodb');

    const uri = process.env.MONGODB_URI;
    const dbName = 'mydb';

    const USER_PROFILES_COLLECTION = 'users';
    const JOBS_COLLECTION = 'Jobs';
    const APPLICATIONS_COLLECTION = 'applications';

    const client = new MongoClient(uri);
    console.log('Connecting to MongoDB');

    try {
        await client.connect();
        const db = client.db(dbName);
        const applications_collection = db.collection(APPLICATIONS_COLLECTION);
        const jobs_collection = db.collection(JOBS_COLLECTION);
        const users_collection = db.collection(USER_PROFILES_COLLECTION);

        const userId = ObjectId.createFromHexString('67a51b9435b4200ce77fae57');

        const applicationsWithJobDetails = await applications_collection.aggregate([
            { $match: { user_id: userId } },
            {
                $lookup: {
                    from: 'Jobs',
                    localField: 'job_id',
                    foreignField: '_id',
                    as: 'jobDetails'
                }
            },
            { $unwind: '$jobDetails' },
            {
                $lookup: {
                    from: 'users',
                    localField: 'user_id',
                    foreignField: '_id',
                    as: 'userDetails',
                    pipeline: [
                        {
                            $project: {
                                encodedPhoto: 0,
                                password: 0
                            } // Exclude the 'encodedPhoto' field
                        }
                    ]
                }
            },
            { $unwind: '$userDetails' }
        ]).toArray();

        if (applicationsWithJobDetails.length > 0) {
            console.log('Applications with job details for userId:', userId);
            applicationsWithJobDetails.forEach(application => console.log(application));
        } else {
            console.log('No applications found for userId:', userId);
        }


    } catch (error) {
        console.error('Error connecting to MongoDB:', error);
    } finally {
        await client.close();
        console.log('Connection closed');
        process.exit(0);
    }
}

function generateEmail() {
    const prefix = Math.random().toString(36).substring(2, 10);
    const domain = 'example.com';
    const email = `${prefix}@${domain}`;
    return email;
}

function generateRandomName() {
    const firstNames = ["John", "Jane", "Alex", "Emily", "Chris", "Katie", "Michael", "Laura"];
    const lastNames = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis"];

    const randomFirstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const randomLastName = lastNames[Math.floor(Math.random() * lastNames.length)];

    const fullName = `${randomFirstName} ${randomLastName}`;

    return {
        firstName: randomFirstName,
        lastName: randomLastName,
        fullName: fullName
    };
}

const randomName = generateRandomName();

const newEmail = generateEmail();

function generateRandomLocation() {
    const cities = ["New York", "Los Angeles", "Chicago", "Houston", "Phoenix", "Philadelphia", "San Antonio", "San Diego"];
    const states = ["NY", "CA", "IL", "TX", "AZ", "PA", "TX", "CA"];

    const randomCity = cities[Math.floor(Math.random() * cities.length)];
    const randomState = states[Math.floor(Math.random() * states.length)];

    const location = `${randomCity}, ${randomState}`;
    return location;
}

const randomLocation = generateRandomLocation();


// Sample data for testing
const signupData = {
    full_name: randomName.fullName,
    phone: '1234567890',
    email: newEmail,
    password: '123'
};

const signinData = {
    email: '1@c.com',
    password: '123'
};

const updateProfileData = {
    firstName: randomName.firstName,
    lastName: randomName.lastName,
    phone: '0987654321',
    email: newEmail,
    location: randomLocation,
    photo: 'photo_url2',
    resume: 'resume_url'
};

let token = '';

async function testSignup(asEmployer) {
    try {
        signupData.employerFlag = asEmployer;
        const response = await axios.post(`${BASE_URL}/signup`, signupData);
        console.log(`${response.status} ${response.statusText}\n`);
        console.log('Signup Response:', response.data);
    } catch (error) {
        console.error('Signup error:', error.response.data);
    }
}

async function testSignin() {
    try {
        const response = await axios.post(`${BASE_URL}/signin`, signinData);
        console.log(`${response.status} ${response.statusText}\n`);
        console.log('Signin Response:', response.data);
        token = response.data.token; // we now have the secure token
        console.log(token);
    } catch (error) {
        console.error('Signin error:', error.response.data);
    }
}

async function testProfile() {
    try {
        const response = await axios.get(`${BASE_URL}/profile`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log(`${response.status} ${response.statusText}\n`);
        console.log('Get Profile Response:', response.data);
    } catch (error) {
        console.error('Profile error:', error.response.data);
    }
}

async function testGetApplications() {
    try {

        // Make the POST request to apply for the job
        const response = await axios.get(`${BASE_URL}/applications`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        // Log the response status and data
        console.log(`${response.status} ${response.statusText}\n`);
        console.log('Get Applications Response:', response.data);

    } catch (error) {
        // Log any error that occurs
        console.error('Get applications error:', error.response ? error.response.data : error.message);
    }

}

async function testApplyForJob() {
    try {
        // Create a sample payload
        const payload = {
            _id: '67ad51504bb0fa7cad7d5e6d' // Replace with actual job ID
        };

        // Make the POST request to apply for the job
        const response = await axios.post(`${BASE_URL}/apply`, payload, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        // Log the response status and data
        console.log(`${response.status} ${response.statusText}\n`);
        console.log('Apply for Job Response:', response.data);

    } catch (error) {
        // Log any error that occurs
        console.error('Apply for Job error:', error.response ? error.response.data : error.message);
    }
}

async function testUpdateProfile() {
    try {
        const response = await axios.post(`${BASE_URL}/updateprofile`, updateProfileData, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log(`${response.status} ${response.statusText}\n`);
        console.log('Update Profile Response:', response.data);
    } catch (error) {
        console.error('Update Profile error:', error.response.data);
    }
}

async function testLogout() {
    try {
        const response = await axios.get(`${BASE_URL}/logout`);
        console.log(`${response.status} ${response.statusText}\n`);
        console.log('Logout Response:', response.data);
    } catch (error) {
        console.error('Logout error:', error.response.data);
    }
}

async function testGetMessages() {
    try {
        // Make the GET request to retrieve messages
        const response = await axios.get(`${BASE_URL}/messages`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        // Log the response status and data
        console.log(`${response.status} ${response.statusText}\n`);
        console.log('Get Messages Response:', response.data);

    } catch (error) {
        // Log any error that occurs
        console.error('Get messages error:', error.response ? error.response.data : error.message);
    }
}

async function testSendMessage() {
    try {
        // Create a sample message payload
        const messageData = {
            receiverId: '67ad5570864e201691652f4a', // Replace with actual receiver ID
            content: 'Hello! This is a test message.'
        };

        // Make the POST request to send a message
        const response = await axios.post(`${BASE_URL}/messages`, messageData, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        // Log the response status and data
        console.log(`${response.status} ${response.statusText}\n`);
        console.log('Send Message Response:', response.data);

    } catch (error) {
        // Log any error that occurs
        console.error('Send message error:', error.response ? error.response.data : error.message);
    }
}

async function testGetRecentContacts() {
    try {
        // Make the GET request to retrieve recent contacts
        const response = await axios.get(`${BASE_URL}/myRecentContacts`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        // Log the response status and data
        console.log(`${response.status} ${response.statusText}\n`);
        console.log('Get Recent Contacts Response:', response.data);

    } catch (error) {
        // Log any error that occurs
        console.error('Get recent contacts error:', error.response ? error.response.data : error.message);
    }
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Run tests
(async function () {
    const asEmployer = true; // set this to false to register as an applicant/job seeker
    //await testSignup(asEmployer);
    await testSignin();
    //await testProfile();
    //await testUpdateProfile();
    // await testApplyForJob();
    //await testGetApplications();
    await testGetMessages();
    await testSendMessage();
    await testGetRecentContacts();
    //await testLogout();

})();



