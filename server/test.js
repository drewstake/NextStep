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

function generateRandomPhoneNumber() {
    // Generate a random 10-digit phone number
    const areaCode = Math.floor(Math.random() * 900) + 100; // 100-999
    const prefix = Math.floor(Math.random() * 900) + 100;   // 100-999
    const lineNumber = Math.floor(Math.random() * 9000) + 1000; // 1000-9999
    return `${areaCode}${prefix}${lineNumber}`;
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
const randomPhoneNumber = generateRandomPhoneNumber();

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
    phone: randomPhoneNumber,
    email: newEmail,
    password: '123'
};

let signinData = {
    email: newEmail,
    password: '123'
};

const updateProfileData = {
    firstName: randomName.firstName,
    lastName: randomName.lastName,
    phone: randomPhoneNumber,
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
        signinData.email = signupData.email;
        signinData.password = '123';
        console.log(signupData);
    } catch (error) {
        console.error('Signup error:', error.response.data);
    }
}

async function testSignin(email='') {
    try {
        if(email) {
            signinData.email = email;
        }
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
            receiverId: '67a51b9435b4200ce77fae57', // Replace with actual receiver ID
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

function generateRandomJobTitle() {
    const roles = [
        "Software Engineer", "Frontend Developer", "Backend Developer", "Full Stack Developer",
        "DevOps Engineer", "Data Engineer", "Machine Learning Engineer", "Product Manager",
        "UX Designer", "UI Developer", "Mobile Developer", "Cloud Architect",
        "Security Engineer", "QA Engineer", "Technical Lead", "Scrum Master"
    ];
    const levels = ["Junior", "Mid-Level", "Senior", "Lead", "Principal", "Staff"];
    const role = roles[Math.floor(Math.random() * roles.length)];
    const level = levels[Math.floor(Math.random() * levels.length)];
    return `${level} ${role}`;
}

function generateRandomCompany() {
    const companies = [
        { name: "Tech Solutions Inc.", website: "https://techsolutions.com" },
        { name: "Innovate Systems", website: "https://innovatesystems.com" },
        { name: "Digital Dynamics", website: "https://digitaldynamics.com" },
        { name: "Cloud Tech Solutions", website: "https://cloudtech.com" },
        { name: "DataFlow Systems", website: "https://dataflow.com" },
        { name: "Smart Software Solutions", website: "https://smartsoftware.com" },
        { name: "Future Tech Innovations", website: "https://futuretech.com" },
        { name: "Global Digital Solutions", website: "https://globaldigital.com" },
        { name: "Enterprise Software Co.", website: "https://enterprisesoftware.com" },
        { name: "NextGen Technologies", website: "https://nextgen.com" }
    ];
    return companies[Math.floor(Math.random() * companies.length)];
}

function generateRandomSalary() {
    const baseSalaries = {
        "Junior": { min: 70000, max: 100000 },
        "Mid-Level": { min: 100000, max: 150000 },
        "Senior": { min: 150000, max: 200000 },
        "Lead": { min: 180000, max: 250000 },
        "Principal": { min: 200000, max: 300000 },
        "Staff": { min: 250000, max: 350000 }
    };
    const level = Object.keys(baseSalaries)[Math.floor(Math.random() * Object.keys(baseSalaries).length)];
    const range = baseSalaries[level];
    const min = range.min;
    const max = range.max;
    const salary = Math.floor(Math.random() * (max - min + 1)) + min;
    return `$${salary.toLocaleString()} - $${(salary + 30000).toLocaleString()}`;
}

function generateRandomBenefits() {
    const allBenefits = [
        "Health Insurance", "Dental Insurance", "Vision Insurance", "401(k) with Company Match",
        "Remote Work", "Flexible Hours", "Unlimited PTO", "Professional Development Budget",
        "Gym Membership", "Mental Health Support", "Parental Leave", "Stock Options",
        "Commuter Benefits", "Home Office Setup", "Annual Bonus", "Team Events"
    ];
    const numBenefits = Math.floor(Math.random() * 6) + 4; // 4-10 benefits
    const shuffled = allBenefits.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, numBenefits);
}

function generateRandomLocations() {
    const locations = [
        ["San Francisco, CA", "Remote"],
        ["New York, NY", "Remote"],
        ["Seattle, WA", "Remote"],
        ["Austin, TX", "Remote"],
        ["Boston, MA", "Remote"],
        ["Chicago, IL", "Remote"],
        ["Denver, CO", "Remote"],
        ["Atlanta, GA", "Remote"],
        ["Remote Only"],
        ["Los Angeles, CA", "Remote"]
    ];
    return locations[Math.floor(Math.random() * locations.length)];
}

function generateRandomSchedule() {
    const schedules = ["Full-time", "Full-time (Remote)", "Full-time (Hybrid)", "Full-time (Flexible)"];
    return schedules[Math.floor(Math.random() * schedules.length)];
}

function generateRandomSkills() {
    const allSkills = [
        "JavaScript", "TypeScript", "React", "Node.js", "Python", "Java", "Go", "Rust",
        "AWS", "Azure", "GCP", "Docker", "Kubernetes", "Terraform", "CI/CD", "Git",
        "MongoDB", "PostgreSQL", "Redis", "GraphQL", "REST APIs", "Microservices",
        "Agile", "Scrum", "JIRA", "Confluence", "Figma", "Adobe XD", "UI/UX Design",
        "Machine Learning", "Data Science", "Big Data", "DevOps", "Security"
    ];
    const numSkills = Math.floor(Math.random() * 5) + 5; // 5-10 skills
    const shuffled = allSkills.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, numSkills);
}

function generateRandomJobDescription(title, company) {
    const templates = [
        `We are seeking a ${title} to join ${company}'s engineering team. The ideal candidate will have strong experience with modern web technologies and a passion for building scalable applications. You'll work on cutting-edge projects and collaborate with a talented team of engineers.`,
        
        `${company} is looking for a ${title} to help us build the next generation of our platform. You'll be responsible for developing and maintaining our core systems, working with cross-functional teams, and mentoring junior developers.`,
        
        `Join ${company}'s engineering team as a ${title} and help us shape the future of technology. You'll work on challenging problems, contribute to our architecture decisions, and help us maintain high code quality standards.`,
        
        `We're hiring a ${title} at ${company} to help us scale our infrastructure and improve our development processes. You'll work on both frontend and backend systems, participate in code reviews, and help us maintain our high performance standards.`,
        
        `${company} is seeking a ${title} to join our growing team. You'll work on complex technical challenges, help us improve our development practices, and contribute to our product roadmap.`
    ];
    return templates[Math.floor(Math.random() * templates.length)];
}

async function testCreateJobPosting() {
    try {
        // Create a sample job posting payload
        const jobData = {
            title: "Senior Software Engineer",
            companyName: "Tech Solutions Inc.",
            companyWebsite: "https://techsolutions.com",
            salaryRange: "$120,000 - $150,000",
            benefits: ["Health Insurance", "401(k)", "Remote Work", "Flexible Hours"],
            locations: ["San Francisco, CA", "Remote"],
            schedule: "Full-time",
            jobDescription: "We are looking for an experienced software engineer to join our team. The ideal candidate will have strong experience with React, Node.js, and cloud technologies.",
            skills: ["React", "Node.js", "MongoDB", "AWS", "TypeScript"]
        };

        // Make the POST request to create a job posting
        const response = await axios.post(`${BASE_URL}/jobs`, jobData, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        // Log the response status and data
        console.log(`${response.status} ${response.statusText}\n`);
        console.log('Create Job Posting Response:', response.data);

    } catch (error) {
        // Log any error that occurs
        console.error('Create job posting error:', error.response ? error.response.data : error.message);
    }
}

async function testCreateMultipleJobPostings() {
    try {
        console.log("Creating multiple job postings...");
        
        for (let i = 0; i < 10; i++) {
            const title = generateRandomJobTitle();
            const company = generateRandomCompany();
            
            const jobData = {
                title: title,
                companyName: company.name,
                companyWebsite: company.website,
                salaryRange: generateRandomSalary(),
                benefits: generateRandomBenefits(),
                locations: generateRandomLocations(),
                schedule: generateRandomSchedule(),
                jobDescription: generateRandomJobDescription(title, company.name),
                skills: generateRandomSkills()
            };

            // Make the POST request to create a job posting
            const response = await axios.post(`${BASE_URL}/jobs`, jobData, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            console.log(`\nCreated job posting ${i + 1}/10:`);
            console.log(`Title: ${title}`);
            console.log(`Company: ${company.name}`);
            console.log(`Status: ${response.status} ${response.statusText}`);
            console.log(`Job ID: ${response.data.jobId}`);
            
            // Add a small delay between requests to avoid overwhelming the server
            await delay(1000);
        }

        console.log("\nAll job postings created successfully!");

    } catch (error) {
        console.error('Error creating multiple job postings:', error.response ? error.response.data : error.message);
    }
}

// Run tests
(async function () {
    //const asEmployer = true; // set this to false to register as an applicant/job seeker
    //await testSignup(asEmployer);
    //await testSignin('1@c.com');
    //await testProfile();
    //await testUpdateProfile();
    // await testApplyForJob();
    //await testGetApplications();
    //await testCreateJobPosting();
   // await testCreateMultipleJobPostings();
    //await testGetMessages();
    //await testSendMessage();
    //await testGetRecentContacts();
    //await testLogout();
})();



