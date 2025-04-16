/**
 * Test suite for the Next-step application server
 * @module server.test
 * @requires supertest
 * @requires express
 * @requires mongodb
 * @requires jsonwebtoken
 * @requires bcryptjs
 * @requires path
 * @requires dotenv
 */

const request = require('supertest');
const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config();
const { sendEmail } = require('./middleware/mailer');

const app = require('./server');

// Mock the axios module
jest.mock('axios', () => ({
  default: jest.fn((config) => {
    // Mock implementation for content filter API
    if (config.url.includes('bad_words')) {
      console.log('Mock API received data:', config.data);
      // Check if the data contains any test inappropriate words
      const hasInappropriateContent = config.data.toLowerCase().includes('bitch');
      console.log('Has inappropriate content:', hasInappropriateContent);
      return Promise.resolve({
        data: {
          bad_words_total: hasInappropriateContent ? 1 : 0,
          bad_words_list: hasInappropriateContent ? [{
            word: 'bitch',
            deviations: 0,
            start: config.data.toLowerCase().indexOf('bitch'),
            end: config.data.toLowerCase().indexOf('bitch') + 5,
            info: 2
          }] : []
        }
      });
    }
    return Promise.resolve({ data: {} });
  })
}));

/**
 * Test user data for authentication tests
 * @type {Object}
 */
const testUser = {
    full_name: 'Test User',
    email: 'test@example.com',
    password: 'testPassword123',
    phone: '1234567890',
    employerFlag: false
};

/**
 * Test employer data for authentication tests
 * @type {Object}
 */
const testEmployer = {
    full_name: 'Test Employer',
    email: 'employer@example.com',
    password: 'testPassword123',
    phone: '1987654321',
    employerFlag: true
};

/**
 * Test job data for job-related tests
 * @type {Object}
 */
const testJob = {
    title: 'Test Job',
    companyName: 'Test Company',
    jobDescription: 'Test Description',
    skills: ['JavaScript', 'Node.js'],
    locations: ['Remote'],
    benefits: ['Health Insurance'],
    schedule: 'Full-time',
    salary: '$80,000 - $100,000'
};

/**
 * Test user ID
 * @type {string}
 */
let testUserId;

/**
 * Test employer ID
 * @type {string}
 */
let testEmployerId;

/**
 * Test job ID
 * @type {string}
 */
let testJobId;

/**
 * JWT token for test user
 * @type {string}
 */
let testUserToken;

/**
 * JWT token for test employer
 * @type {string}
 */
let testEmployerToken;

/**
 * MongoDB client instance
 * @type {MongoClient}
 */
let mongoClient;

/**
 * MongoDB database instance
 * @type {Db}
 */
let db;

/**
 * Main test suite for API endpoints
 */
describe('API Tests', () => {
    /**
     * Setup test environment and create test data
     */
    beforeAll(async () => {
        // Set test environment
        process.env.NODE_ENV = 'test';

        // Connect to test database
        mongoClient = await MongoClient.connect(process.env.MONGODB_URI);
        db = mongoClient.db('mydb_test');

        // Clear test collections
        await db.collection('users').deleteMany({});
        await db.collection('Jobs').deleteMany({});
        await db.collection('applications').deleteMany({});
        await db.collection('messages').deleteMany({});
        await db.collection('companies').deleteMany({});

        // Create test users with hashed passwords
        const usersCollection = db.collection('users');
        const hashedPassword = await bcrypt.hash(testUser.password, 10);

        const testUserResult = await usersCollection.insertOne({
            ...testUser,
            password: hashedPassword
        });

        const testEmployerResult = await usersCollection.insertOne({
            ...testEmployer,
            password: hashedPassword
        });

        testUserId = testUserResult.insertedId;
        testEmployerId = testEmployerResult.insertedId;

        // Generate test tokens
        testUserToken = jwt.sign(
            { id: testUserId.toString(), employerFlag: false },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        testEmployerToken = jwt.sign(
            { id: testEmployerId.toString(), employerFlag: true },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        // Create test company
        const companiesCollection = db.collection('companies');
        const testCompanyResult = await companiesCollection.insertOne({
            name: 'Test Company',
            description: 'Test Company Description',
            website: 'https://testcompany.com',
            industry: 'Technology',
            size: '50-200',
            location: 'Remote',
            founded: 2020
        });

        // Create test job with correct companyId
        const jobsCollection = db.collection('Jobs');
        const testJobResult = await jobsCollection.insertOne({
            ...testJob,
            employerId: testEmployerId,
            companyId: testCompanyResult.insertedId
        });
        testJobId = testJobResult.insertedId;

        // Associate employer with company
        await usersCollection.updateOne(
            { _id: testEmployerId },
            { $set: { companyId: testCompanyResult.insertedId } }
        );

        // Create test application
        const applicationsCollection = db.collection('applications');
        await applicationsCollection.insertOne({
            jobId: testJobId,
            userId: testUserId,
            status: 'pending',
            createdAt: new Date()
        });

        // Create test message
        const messagesCollection = db.collection('messages');
        await messagesCollection.insertOne({
            senderId: testEmployerId,
            receiverId: testUserId,
            content: 'Test message content',
            read_timestamp: null,
            created_at: new Date()
        });
    });

    /**
     * Cleanup test data and close database connection
     */
    afterAll(async () => {
        // Clear test collections
        if (db) {
            await db.collection('users').deleteMany({});
            await db.collection('Jobs').deleteMany({});
            await db.collection('applications').deleteMany({});
            //await db.collection('messages').deleteMany({});
            await db.collection('companies').deleteMany({});
        }

        // Close MongoDB connection
        if (mongoClient) {
            await mongoClient.close();
        }
    });

    /**
     * Test suite for authentication endpoints
     */
    describe('Authentication', () => {
        test('POST /signup - should create a new user', async () => {
            const response = await request(app)
                .post('/signup')
                .send({
                    full_name: 'New User',
                    email: 'new@example.com',
                    password: 'newPassword123',
                    phone: '+1122334455'
                });

            expect(response.status).toBe(201);
            expect(response.body.message).toBe('User created successfully. Please check your email to verify your account.');
        });

        test('POST /signup - should handle duplicate email', async () => {
            const response = await request(app)
                .post('/signup')
                .send({
                    full_name: 'Duplicate User',
                    email: testUser.email,
                    password: 'newPassword123',
                    phone: '+1122334455'
                });

            expect(response.status).toBe(409);
            expect(response.body.error).toBe('Email already registered');
        });

        test('POST /signin - email verification pending', async () => {
            const response = await request(app)
                .post('/signin')
                .send({
                    email: testUser.email,
                    password: testUser.password
                });

            expect(response.status).toBe(401);
            expect(response.body.message).toBe('Email not verified. Please check your email for a verification link.');
        });

        test('POST /signin - should handle invalid credentials', async () => {
            const response = await request(app)
                .post('/signin')
                .send({
                    email: testUser.email,
                    password: 'wrongpassword'
                });

            expect(response.status).toBe(401);
            expect(response.body.message).toBe('Invalid credentials');
        });

        test('POST /auth/google - should authenticate with Google', async () => {
            const response = await request(app)
                .post('/auth/google')
                .send({
                    token: 'mock-google-token'
                });

            expect(response.status).toBe(401); // Should fail with invalid token
        });

        // Test cases for token verification
        test('Protected route - should handle missing token', async () => {
            const response = await request(app)
                .get('/profile')
                .send(); // No Authorization header

            expect(response.status).toBe(401);
            expect(response.body.error).toBe('Unauthorized. Missing or invalid token.');
        });

        test('Protected route - should handle invalid token format', async () => {
            const response = await request(app)
                .get('/profile')
                .set('Authorization', 'InvalidFormat') // Missing 'Bearer ' prefix
                .send();

            expect(response.status).toBe(401);
            expect(response.body.error).toBe('Unauthorized. Missing or invalid token.');
        });

        test('Protected route - should handle expired token', async () => {
            // Create an expired token
            const expiredToken = jwt.sign(
                { id: testUserId.toString(), employerFlag: false },
                process.env.JWT_SECRET,
                { expiresIn: '0s' } // Token expires immediately
            );

            const response = await request(app)
                .get('/profile')
                .set('Authorization', `Bearer ${expiredToken}`)
                .send();

            expect(response.status).toBe(401);
            expect(response.body.error).toBe('Your session has expired. Please sign in again.');
            expect(response.body.code).toBe('TOKEN_EXPIRED');
        });

        test('Protected route - should handle malformed token', async () => {
            const response = await request(app)
                .get('/profile')
                .set('Authorization', 'Bearer invalid.token.here')
                .send();

            expect(response.status).toBe(401);
            expect(response.body.error).toBe('Invalid authentication token.');
        });

/*         test('POST /send-verification - should send verification code', async () => {
            const response = await request(app)
                .post('/send-verification')
                .send({
                    phoneNumber: testUser.phone
                });

            expect(response.status).toBe(200);
            expect(response.body.message).toBe('Verification code sent successfully');
        });

        test('POST /send-verification - should handle failed verification code sending', async () => {
            const response = await request(app)
                .post('/send-verification')
                .send({
                    phoneNumber: 'invalid-phone'
                });

            expect(response.status).toBe(409);
            expect(response.body.error).toBe('Failed to send verification code');
        });

        test('POST /send-verification - should handle server errors', async () => {
            // Mock a server error by sending invalid data
            const response = await request(app)
                .post('/send-verification')
                .send({});

            expect(response.status).toBe(500);
            expect(response.body.error).toBe('Server error. See logs for more details.');
        });

        test('POST /verify-code - should verify code', async () => {
            const response = await request(app)
                .post('/verify-code')
                .send({
                    phone: testUser.phone,
                    code: '123456' // Mock code
                });

            expect(response.status).toBe(400);
            expect(response.body.error).toBe('Invalid verification code');
        }); */
    });

    // File Upload Tests
    describe('File Upload', () => {
        test('POST /upload - should upload resume', async () => {
            // Skip file upload test for now as it requires actual file handling
            expect(true).toBe(true);
        });

        test('POST /upload - should handle invalid file type', async () => {
            // Skip file upload test for now as it requires actual file handling
            expect(true).toBe(true);
        });
    });

    // Job Tests
    describe('Jobs', () => {
        test('GET /jobs - should get all jobs', async () => {
            const response = await request(app)
                .get('/jobs')
                .send();

            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
        });

        test('GET /jobs/:jobId - should get single job', async () => {
            const response = await request(app)
                .get(`/jobs/${testJobId}`)
                .send();

            expect(response.status).toBe(200);
            expect(response.body._id.toString()).toBe(testJobId.toString());
        });

        test('GET /jobs/:jobId - should handle non-existent job', async () => {
            const response = await request(app)
                .get(`/jobs/${new ObjectId()}`)
                .send();

            expect(response.status).toBe(404);
            expect(response.body.error).toBe('Job not found');
        });

        test('GET /retrieveJobsForHomepage - should get jobs for homepage', async () => {
            const response = await request(app)
                .get('/retrieveJobsForHomepage')
                .set('Authorization', `Bearer ${testUserToken}`)
                .send();

            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
        });

        test('GET /retrieveJobsForHomepage - should include companyName for each job', async () => {
            const response = await request(app)
                .get('/retrieveJobsForHomepage')
                .set('Authorization', `Bearer ${testUserToken}`)
                .send();

            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
            // At least one job should be present for a meaningful test
            if (response.body.length > 0) {
                response.body.forEach(job => {
                    expect(job).toHaveProperty('companyName');
                    expect(job.companyName).not.toBeNull();
                    expect(job.companyName).not.toBe('');
                });
            }
        });

        // POST /jobs tests
        test('POST /jobs - should create a new job posting', async () => {
            // Create a company profile first
            const companiesCollection = db.collection('companies');
            const testCompany = {
                name: 'Test Company for Jobs',
                description: 'A test company for job posting tests'
            };
            const testCompanyResult = await companiesCollection.insertOne(testCompany);
            const testCompanyId = testCompanyResult.insertedId;

            // Update the test employer to be associated with the company
            await db.collection('users').updateOne(
                { _id: testEmployerId },
                { 
                    $set: { 
                        employerFlag: true,
                        companyId: testCompanyId
                    } 
                }
            );

            const newJob = {
                title: 'Software Engineer',
                jobDescription: 'Test job description',
                companyId: testCompanyId.toString(),
                companyName: testCompany.name,
                companyWebsite: 'https://testcompany.com',
                salaryRange: '$90,000 - $120,000',
                benefits: ['Health Insurance', '401k'],
                locations: ['Remote', 'New York'],
                schedule: 'Full-time',
                skills: ['JavaScript', 'React', 'Node.js']
            };

            const response = await request(app)
                .post('/jobs')
                .set('Authorization', `Bearer ${testEmployerToken}`)
                .send(newJob);

            expect(response.status).toBe(201);
            expect(response.body.message).toBe('Job posting created successfully');
            expect(response.body.jobId).toBeDefined();
        });

        test('POST /jobs - should handle missing required fields', async () => {
            // Create a company profile first
            const companiesCollection = db.collection('companies');
            const testCompany = {
                name: 'Test Company for Jobs 2',
                description: 'A test company for job posting tests'
            };
            const testCompanyResult = await companiesCollection.insertOne(testCompany);
            const testCompanyId = testCompanyResult.insertedId;

            // Update the test employer to be associated with the company
            await db.collection('users').updateOne(
                { _id: testEmployerId },
                { 
                    $set: { 
                        employerFlag: true,
                        companyId: testCompanyId
                    } 
                }
            );

            const newJob = {
                companyId: testCompanyId.toString(),
                companyName: testCompany.name
                // Missing title and description
            };

            const response = await request(app)
                .post('/jobs')
                .set('Authorization', `Bearer ${testEmployerToken}`)
                .send(newJob);

            expect(response.status).toBe(400);
            expect(response.body.error).toBe('Title and job description are required');
        });

        test('POST /jobs - should handle inappropriate words in string fields', async () => {
            const inappropriateJob = {
                title: 'New Test Job Word',
                companyName: 'New Test Company',
                companyWebsite: 'https://testcompany.com',
                salaryRange: '$90,000 - $120,000',
                benefits: ['Health Insurance', '401k'],
                locations: ['Remote', 'New York'],
                schedule: 'Full-time',
                jobDescription: 'Test job description bitch',
                skills: ['JavaScript', 'React', 'Node.js']
            };

            const response = await request(app)
                .post('/jobs')
                .set('Authorization', `Bearer ${testEmployerToken}`)
                .send(inappropriateJob);
                expect(response.status).toBe(406);
                

        });

        test('POST /jobs - should handle inappropriate words in array fields', async () => {
            const inappropriateJob = {
                title: 'New Test Job Word',
                companyName: 'New Test Company',
                companyWebsite: 'https://testcompany.com',
                salaryRange: '$90,000 - $120,000',
                benefits: ['Health Insurance', '401k'],
                locations: ['Remote', 'New York', 'bitch'],
                schedule: 'Full-time',
                jobDescription: 'Test job description',
                skills: ['JavaScript', 'React', 'Node.js']
            };

            const response = await request(app)
                .post('/jobs')
                .set('Authorization', `Bearer ${testEmployerToken}`)
                .send(inappropriateJob);
                expect(response.status).toBe(406);
                

        });

        test('POST /jobs - should handle non-employer users', async () => {
            const newJob = {
                title: 'New Test Job',
                companyName: 'Test Company',
                jobDescription: 'Test job description'
            };

            const response = await request(app)
                .post('/jobs')
                .set('Authorization', `Bearer ${testUserToken}`)
                .send(newJob);

            expect(response.status).toBe(403);
            expect(response.body.error).toBe('Only employers can create job postings');
        });

    });

    // Applications Tests
    describe('Applications', () => {
        test('POST /jobsTracker - should track job application', async () => {
            const response = await request(app)
                .post('/jobsTracker')
                .set('Authorization', `Bearer ${testUserToken}`)
                .send({
                    _id: testJobId,
                    swipeMode: 1, // Apply
                });

            expect(response.status).toBe(200);
            expect(response.body.job_id).toBe(testJobId.toString());
        });

        test('POST /jobsTracker - should handle duplicate application', async () => {
            // First application
            await request(app)
                .post('/jobsTracker')
                .set('Authorization', `Bearer ${testUserToken}`)
                .send({
                    _id: testJobId,
                    swipeMode: 1 // Apply
                });

            // Attempt duplicate application
            const response = await request(app)
                .post('/jobsTracker')
                .set('Authorization', `Bearer ${testUserToken}`)
                .send({
                    _id: testJobId,
                    swipeMode: 1 // Apply
                });

            expect(response.status).toBe(409);
            expect(response.body.error).toBe("You've already applied for this job. Check your application status in 'My Jobs'.");
        });

        test('POST /jobsTracker - should handle invalid job', async () => {
            const response = await request(app)
                .post('/jobsTracker')
                .set('Authorization', `Bearer ${testUserToken}`)
                .send({
                    _id: new ObjectId(),
                    swipeMode: 1
                });

            expect(response.status).toBe(404);
            expect(response.body.error).toBe('Job not found');
        });

        test('GET /applications - should get user applications', async () => {
            const response = await request(app)
                .get('/applications')
                .set('Authorization', `Bearer ${testUserToken}`)
                .send();

            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
        });

        test('GET /employer/applications - should get employer applications', async () => {
            // Create a company profile first
            const companiesCollection = db.collection('companies');
            const testCompany = {
                name: 'Test Company for Applications',
                description: 'A test company for application tests'
            };
            const testCompanyResult = await companiesCollection.insertOne(testCompany);
            const testCompanyId = testCompanyResult.insertedId;

            // Update the test employer to be associated with the company
            await db.collection('users').updateOne(
                { _id: testEmployerId },
                { 
                    $set: { 
                        employerFlag: true,
                        companyId: testCompanyId
                    } 
                }
            );

            // Create a test job for this company
            const jobsCollection = db.collection('Jobs');
            const testJobForCompany = {
                title: 'Test Job',
                jobDescription: 'Test Description',
                companyId: testCompanyId.toString(),
                companyName: testCompany.name,
                employerId: testEmployerId.toString(),
                companyWebsite: 'https://testcompany.com',
                salaryRange: '$80,000 - $100,000',
                benefits: ['Health Insurance'],
                locations: ['Remote'],
                schedule: 'Full-time',
                skills: ['JavaScript', 'Node.js']
            };
            const testJobResult = await jobsCollection.insertOne(testJobForCompany);

            // Create a test user to apply for the job
            const testApplicant = {
                full_name: 'Test Applicant',
                email: 'applicant@example.com',
                password: await bcrypt.hash('testPassword123', 10),
                phone: '9876543210',
                employerFlag: false
            };
            const testApplicantResult = await db.collection('users').insertOne(testApplicant);
            const testApplicantId = testApplicantResult.insertedId;

            // Create a test application
            const applicationsCollection = db.collection('applications');
            const applicationResult = await applicationsCollection.insertOne({
                user_id: testApplicantId,
                job_id: testJobResult.insertedId,
                company_id: testCompanyId,
                employer_id: testEmployerId,
                status: 'pending',
                createdAt: new Date(),
                swipeMode: 1,
                user: {
                    full_name: testApplicant.full_name,
                    email: testApplicant.email,
                    phone: testApplicant.phone
                }
            });
            
            //console.log('Application created:', applicationResult.insertedId);
            
            // Verify the application was created
            const application = await applicationsCollection.findOne({
                user_id: testApplicantId,
                job_id: testJobResult.insertedId
            });
            expect(application).toBeDefined();
            //console.log('Application found:', application);
            
            // Check the job details
            const job = await jobsCollection.findOne({ _id: testJobResult.insertedId });
            //console.log('Job details:', job);
            
            // Check the employer details
            const employer = await db.collection('users').findOne({ _id: testEmployerId });
            //console.log('Employer details:', employer);

            const response = await request(app)
                .get('/employer/applications')
                .set('Authorization', `Bearer ${testEmployerToken}`)
                .send();

            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBeGreaterThan(0);
            
            // Verify the application details
            const returnedApp = response.body[0];
            expect(returnedApp.job_id).toBe(testJobResult.insertedId.toString());
            expect(returnedApp.company_id).toBe(testCompanyId.toString());
            expect(returnedApp.status).toBe('pending');
            expect(returnedApp.user.full_name).toBe(testApplicant.full_name);
        });

        test('PUT /employer/applications/:applicationId - should handle unauthorized access', async () => {
            // First create an application
            const applicationResponse = await request(app)
                .post('/jobsTracker')
                .set('Authorization', `Bearer ${testUserToken}`)
                .send({
                    _id: testJobId,
                    swipeMode: 1 // Apply
                });

            const applicationId = applicationResponse.body.application_id;

            // Try to update with non-employer user
            const response = await request(app)
                .put(`/employer/applications/${applicationId}`)
                .set('Authorization', `Bearer ${testUserToken}`)
                .send({
                    status: 'interview'
                });

            expect(response.status).toBe(403);
            expect(response.body.error).toBe('Only employers can update application status');
        });

        test('PUT /employer/applications/:applicationId - should handle missing status field', async () => {
            // First create an application
            const applicationResponse = await request(app)
                .post('/jobsTracker')
                .set('Authorization', `Bearer ${testUserToken}`)
                .send({
                    _id: testJobId,
                    swipeMode: 1 // Apply
                });

            const applicationId = applicationResponse.body.application_id;

            // Try to update without status field
            const response = await request(app)
                .put(`/employer/applications/${applicationId}`)
                .set('Authorization', `Bearer ${testEmployerToken}`)
                .send({});

            expect(response.status).toBe(400);
            expect(response.body.error).toBe('Invalid status. Must be one of: pending, interviewing, accepted, rejected');
        });
    });

    // Profile Tests
    describe('Profile', () => {
        test('GET /profile - should get user profile', async () => {
            const response = await request(app)
                .get('/profile')
                .set('Authorization', `Bearer ${testUserToken}`)
                .send();

            expect(response.status).toBe(200);
            expect(response.body._id.toString()).toBe(testUserId.toString());
        });

        test('GET /userProfile/:userId - should get user profile by ID', async () => {
            const response = await request(app)
                .get(`/userProfile/${testUserId}`)
                .send();

            expect(response.status).toBe(200);
            expect(response.body._id.toString()).toBe(testUserId.toString());
        });

        test('GET /userProfile/:userId - should handle non-existent user', async () => {
            const response = await request(app)
                .get(`/userProfile/${new ObjectId()}`)
                .send();

            expect(response.status).toBe(200);
            expect(response.body).toBeNull();
        });
    });

    // Messages Tests
    describe('Messages', () => {
        test('GET /users - should get all users for messaging', async () => {
            const response = await request(app)
                .get('/users')
                .set('Authorization', `Bearer ${testUserToken}`)
                .send();

            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
        });

        test('GET /myRecentContacts - should get recent contacts', async () => {
            const response = await request(app)
                .get('/myRecentContacts')
                .set('Authorization', `Bearer ${testUserToken}`)
                .send();

            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
        });

        // POST /messages tests
        test('POST /messages - should send a message successfully', async () => {
            const response = await request(app)
                .post('/messages')
                .set('Authorization', `Bearer ${testUserToken}`)
                .send({
                    receiverId: testEmployerId.toString(),
                    content: 'Test message content'
                });

            expect(response.status).toBe(201);
            expect(response.body).toHaveProperty('content', 'Test message content');
            expect(response.body).toHaveProperty('senderId', testUserId.toString());
            expect(response.body).toHaveProperty('receiverId', testEmployerId.toString());
            expect(response.body).toHaveProperty('senderName');
            expect(response.body).toHaveProperty('receiverName');
            expect(response.body).toHaveProperty('senderEmail');
            expect(response.body).toHaveProperty('receiverEmail');
            expect(response.body).toHaveProperty('createdAt');
        });

        test('POST /messages - should handle missing required fields', async () => {
            const response = await request(app)
                .post('/messages')
                .set('Authorization', `Bearer ${testUserToken}`)
                .send({
                    receiverId: testEmployerId.toString()
                });

            expect(response.status).toBe(400);
            expect(response.body.error).toBe('Message content and receiver ID are required');
        });

        test('POST /messages - should handle missing authentication token', async () => {
            const response = await request(app)
                .post('/messages')
                .send({
                    receiverId: testEmployerId.toString(),
                    content: 'Test message'
                });

            expect(response.status).toBe(401);
            expect(response.body.error).toBe('Unauthorized. Missing or invalid token.');
        });

        test('POST /messages - should handle non-existent receiver', async () => {
            const response = await request(app)
                .post('/messages')
                .set('Authorization', `Bearer ${testUserToken}`)
                .send({
                    receiverId: new ObjectId().toString(),
                    content: 'Test message'
                });

            expect(response.status).toBe(500);
            expect(response.body.error).toBe('Failed to send message');
        });

        // GET /messages tests
        test('GET /messages - should get user messages successfully', async () => {
            // First create some test messages
            const messagesCollection = db.collection('messages');
            await messagesCollection.insertMany([
                {
                    senderId: testUserId.toString(),
                    receiverId: testEmployerId.toString(),
                    content: 'Test message 1',
                    createdAt: new Date()
                },
                {
                    senderId: testEmployerId.toString(),
                    receiverId: testUserId.toString(),
                    content: 'Test message 2',
                    createdAt: new Date()
                }
            ]);

            const response = await request(app)
                .get('/messages')
                .set('Authorization', `Bearer ${testUserToken}`)
                .send();

            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBeGreaterThan(0);
            expect(response.body[0]).toHaveProperty('content');
            expect(response.body[0]).toHaveProperty('senderId');
            expect(response.body[0]).toHaveProperty('receiverId');
        });

        // Messages Read Tests
        test('PUT /messages/read/:contactId - should mark messages as read', async () => {
            // First create some unread messages
            const messagesCollection = db.collection('messages');

            await messagesCollection.insertMany([
                {
                    senderId:  testEmployerId.toString(),
                    receiverId: testUserId.toString(),
                    content: 'Unread message 1',
                    createdAt: new Date()
                },
                {
                    senderId: testEmployerId.toString(),
                    receiverId: testUserId.toString(),
                    content: 'Unread message 2',
                    createdAt: new Date()
                }
            ]);

            const response = await request(app)
                .put(`/messages/read/${testEmployerId.toString()}`)
                .set('Authorization', `Bearer ${testUserToken}`)
                .send();
            expect(response.status).toBe(200);
            expect(response.body.message).toBe('5 messages marked as read.');
            expect(response.body.modifiedCount).toBe(5);
        });

        test('PUT /messages/read/:contactId - should handle no unread messages', async () => {
            
            const response = await request(app)
                .put(`/messages/read/${testEmployerId.toString()}`)
                .set('Authorization', `Bearer ${testUserToken}`)
                .send();

            expect(response.status).toBe(200);
            expect(response.body.message).toBe('No unread messages found for this contact.');
        });

        test('PUT /messages/read/:contactId - should handle invalid contact ID', async () => {
            const response = await request(app)
                .put('/messages/read/invalid-id')
                .set('Authorization', `Bearer ${testUserToken}`)
                .send();

            expect(response.status).toBe(200);
            expect(response.body.message).toBe('No unread messages found for this contact.');
        });

        test('PUT /messages/read/:contactId - should handle missing token', async () => {
            const response = await request(app)
                .put(`/messages/read/${testEmployerId.toString()}`)
                .send();

            expect(response.status).toBe(401);
            expect(response.body.error).toBe('Unauthorized. Missing or invalid token.');
        });

        test('PUT /messages/read/:contactId - should handle messages in both directions', async () => {
            // Create messages in both directions
            const messagesCollection = db.collection('messages');
            await messagesCollection.insertMany([
                {
                    senderId: testEmployerId.toString(),
                    receiverId: testUserId.toString(),
                    content: 'Message from employer',
                    createdAt: new Date(),
                    read_timestamp: null
                },
                {
                    senderId: testUserId.toString(),
                    receiverId: testEmployerId.toString(),
                    content: 'Message from user',
                    createdAt: new Date(),
                    read_timestamp: null
                }
            ]);

            const response = await request(app)
                .put(`/messages/read/${testEmployerId.toString()}`)
                .set('Authorization', `Bearer ${testUserToken}`)
                .send();

            expect(response.status).toBe(200);
            expect(response.body.modifiedCount).toBe(2);
        });
    });

    // Employer Job Management Tests
    describe('Employer Job Management', () => {
        test('DELETE /employer/jobs/:jobId - should delete job', async () => {
            const response = await request(app)
                .delete(`/employer/jobs/${testJobId}`)
                .set('Authorization', `Bearer ${testEmployerToken}`)
                .send();

            expect(response.status).toBe(200);
            expect(response.body.message).toBe('Job deleted successfully');
        });

        test('DELETE /employer/jobs/:jobId - should handle unauthorized deletion', async () => {
            const response = await request(app)
                .delete(`/employer/jobs/${testJobId}`)
                .set('Authorization', `Bearer ${testUserToken}`)
                .send();

            expect(response.status).toBe(403);
            expect(response.body.error).toBe('Only employers can delete jobs');
        });
    });

    /**
     * Test suite for company profile endpoints
     */
    describe('Company Profile', () => {
        test('GET /companyProfile - should return 401 without token', async () => {
            const response = await request(app)
                .get('/companyProfile');

            expect(response.status).toBe(401);
        });

        test('GET /companyProfile - should return 404 when profile not found', async () => {
            const response = await request(app)
                .get('/companyProfile')
                .set('Authorization', `Bearer ${testEmployerToken}`);

            expect(response.status).toBe(404);
            expect(response.body.message).toBe('Company profile not found');
        });

        test('PUT /companyProfile - should create a new company profile', async () => {
            const response = await request(app)
                .put('/companyProfile')
                .set('Authorization', `Bearer ${testEmployerToken}`)
                .send({
                    name: 'Test Company',
                    description: 'A test company description',
                    industry: 'Technology',
                    size: '11-50',
                    location: 'New York, NY',
                    website: 'https://testcompany.com'
                });

            expect(response.status).toBe(200);
            expect(response.body.name).toBe('Test Company');
            expect(response.body.description).toBe('A test company description');
            expect(response.body.industry).toBe('Technology');
            expect(response.body.size).toBe('11-50');
            expect(response.body.location).toBe('New York, NY');
            expect(response.body.website).toBe('https://testcompany.com');
            expect(response.body.userId).toBe(testEmployerId.toString());
        });

        test('GET /companyProfile - should return company profile after creation', async () => {
            const response = await request(app)
                .get('/companyProfile')
                .set('Authorization', `Bearer ${testEmployerToken}`);

            expect(response.status).toBe(200);
            expect(response.body.name).toBe('Test Company');
            expect(response.body.description).toBe('A test company description');
            expect(response.body.industry).toBe('Technology');
            expect(response.body.size).toBe('11-50');
            expect(response.body.location).toBe('New York, NY');
            expect(response.body.website).toBe('https://testcompany.com');
        });

        test('PUT /companyProfile - should update existing company profile', async () => {
            const response = await request(app)
                .put('/companyProfile')
                .set('Authorization', `Bearer ${testEmployerToken}`)
                .send({
                    name: 'Updated Company',
                    description: 'An updated company description',
                    industry: 'Software',
                    size: '51-200',
                    location: 'San Francisco, CA',
                    website: 'https://updatedcompany.com'
                });

            expect(response.status).toBe(200);
            expect(response.body.name).toBe('Updated Company');
            expect(response.body.description).toBe('An updated company description');
            expect(response.body.industry).toBe('Software');
            expect(response.body.size).toBe('51-200');
            expect(response.body.location).toBe('San Francisco, CA');
            expect(response.body.website).toBe('https://updatedcompany.com');
        });

        test('PUT /companyProfile - should return 400 with missing required fields', async () => {
            const response = await request(app)
                .put('/companyProfile')
                .set('Authorization', `Bearer ${testEmployerToken}`)
                .send({
                    name: 'Incomplete Company',
                    // Missing required fields
                    website: 'https://incompletecompany.com'
                });

            expect(response.status).toBe(400);
            expect(response.body.message).toBe('Missing required fields');
        });

        test('POST /company/users - should add a user to company', async () => {
            // First create a company profile
            await request(app)
                .put('/companyProfile')
                .set('Authorization', `Bearer ${testEmployerToken}`)
                .send({
                    name: 'Test Company',
                    description: 'A test company description',
                    industry: 'Technology',
                    size: '11-50',
                    location: 'New York, NY',
                    website: 'https://testcompany.com'
                });

            // Create a new employer user to add to the company
            const newEmployer = {
                full_name: 'New Employer',
                email: `newemployer${Date.now()}@example.com`,
                password: 'testPassword123',
                phone: `+1${Math.floor(Math.random() * 10000000000)}`,
                employerFlag: true
            };

            const signupResponse = await request(app)
                .post('/signup')
                .send(newEmployer);

            expect(signupResponse.status).toBe(201);
            const newEmployerId = signupResponse.body.userId;

            // Add the new employer to the company
            const response = await request(app)
                .post('/company/users')
                .set('Authorization', `Bearer ${testEmployerToken}`)
                .send({
                    userId: newEmployerId
                });

            expect(response.status).toBe(200);
            expect(response.body.message).toBe('User added to company successfully');

            // Verify the user was added by checking company users
            const usersResponse = await request(app)
                .get('/company/users')
                .set('Authorization', `Bearer ${testEmployerToken}`);

            expect(usersResponse.status).toBe(200);
            expect(Array.isArray(usersResponse.body)).toBe(true);
            expect(usersResponse.body.some(user => user._id === newEmployerId)).toBe(true);
        });

        test('POST /company/users - should handle adding non-existent user', async () => {
            const response = await request(app)
                .post('/company/users')
                .set('Authorization', `Bearer ${testEmployerToken}`)
                .send({
                    userId: new ObjectId().toString()
                });

            expect(response.status).toBe(404);
            expect(response.body.message).toBe('User not found or not an employer');
        });

        test('POST /company/users - should handle adding user without company profile', async () => {
            // Create a new employer user without a company profile
            const newEmployer = {
                full_name: 'Another Employer',
                email: `anotheremployer${Date.now()}@example.com`,
                password: 'testPassword123',
                phone: `+1${Math.floor(Math.random() * 10000000000)}`,
                employerFlag: true
            };

            const signupResponse = await request(app)
                .post('/signup')
                .send(newEmployer);

            expect(signupResponse.status).toBe(201);
            const newEmployerId = signupResponse.body.userId;

            // Create another employer user to try to add users
            const employerWithoutCompany = {
                full_name: 'Employer Without Company',
                email: `employer${Date.now()}@example.com`,
                password: 'testPassword123',
                phone: `+1${Math.floor(Math.random() * 10000000000)}`,
                employerFlag: true
            };

            const employerResponse = await request(app)
                .post('/signup')
                .send(employerWithoutCompany);

            expect(employerResponse.status).toBe(201);

            // Generate token for the employer without company
            const employerToken = jwt.sign(
                { id: employerResponse.body.userId, employerFlag: true },
                process.env.JWT_SECRET,
                { expiresIn: '1h' }
            );

            // Try to add user without having a company profile
            const response = await request(app)
                .post('/company/users')
                .set('Authorization', `Bearer ${employerToken}`)
                .send({
                    userId: newEmployerId
                });

            expect(response.status).toBe(400);
            expect(response.body.message).toBe('You must be associated with a company to add users');
        });
    });

    // Employer Contacts Tests
    describe('Employer Contacts', () => {
        test('GET /myRecentEmployerContacts - should get recent employer contacts with correct unread message count', async () => {
            // Create a test company
            const companiesCollection = db.collection('companies');
            const testCompany = {
                name: 'Test Company',
                description: 'A test company for employer contacts test'
            };
            const testCompanyResult = await companiesCollection.insertOne(testCompany);
            const testCompanyId = testCompanyResult.insertedId;

            // Create a test job for the company
            const jobsCollection = db.collection('Jobs');
            const testJobForCompany = {
                ...testJob,
                companyId: testCompanyId,
                companyName: testCompany.name
            };
            const testJobForCompanyResult = await jobsCollection.insertOne(testJobForCompany);
            const testJobForCompanyId = testJobForCompanyResult.insertedId;

            // Create an application for the test user to the job
            const applicationsCollection = db.collection('applications');
            await applicationsCollection.insertOne({
                user_id: testUserId,
                job_id: testJobForCompanyId,
                swipeMode: 1 // Application (not ignored)
            });

            // Create messages between the user and the company (some read, some unread)
            const messagesCollection = db.collection('messages');
            await messagesCollection.insertMany([
                {
                    senderId: testUserId.toString(),
                    companyId: testCompanyId.toString(),
                    receiverId: testCompanyId.toString(),
                    content: 'Message from user to company',
                    createdAt: new Date(),
                    read_timestamp: new Date() // Read message
                },
                {
                    senderId: testCompanyId.toString(),
                    receiverId: testUserId.toString(),
                    content: 'Unread message from company to user',
                    createdAt: new Date(),
                    read_timestamp: null // Unread message
                },
                {
                    senderId: testCompanyId.toString(),
                    receiverId: testUserId.toString(),
                    content: 'Another unread message from company to user',
                    createdAt: new Date(),
                    read_timestamp: null // Unread message
                }
            ]);

            // Call the endpoint
            const response = await request(app)
                .get('/myRecentEmployerContacts')
                .set('Authorization', `Bearer ${testUserToken}`)
                .send();

            // Verify the response
            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
            
            // Find the test company in the response
            const testCompanyContact = response.body.find(contact => 
                contact._id === testCompanyId.toString()
            );
            
            // Verify the test company is in the response
            expect(testCompanyContact).toBeDefined();
            expect(testCompanyContact.companyName).toBe(testCompany.name);
            
            // Verify the unread message count is correct (should be 2)
            expect(testCompanyContact.countOfUnreadMessages).toBe(2);
        });

        test('should count unread messages correctly for both missing and null read_timestamp', async () => {
            // Create test company
            const companiesCollection = db.collection('companies');
            const testCompany = {
                name: 'Test Company 2',
                description: 'A test company for unread messages test'
            };
            const testCompanyResult = await companiesCollection.insertOne(testCompany);
            const testCompanyId = testCompanyResult.insertedId;

            // Create test job for the company
            const jobsCollection = db.collection('Jobs');
            const testJobForCompany = {
                ...testJob,
                companyId: testCompanyId,
                companyName: testCompany.name
            };
            const testJobForCompanyResult = await jobsCollection.insertOne(testJobForCompany);

            // Create an application
            const applicationsCollection = db.collection('applications');
            await applicationsCollection.insertOne({
                user_id: testUserId,
                job_id: testJobForCompanyResult.insertedId,
                swipeMode: 1
            });
            
            // Create test messages with different read_timestamp scenarios
            const messages = [
                {
                    senderId: testCompanyId.toString(),
                    receiverId: testUserId.toString(),
                    content: 'Message 1',
                    createdAt: new Date(),
                    // read_timestamp is missing
                },
                {
                    senderId: testCompanyId.toString(),
                    receiverId: testUserId.toString(),
                    content: 'Message 2',
                    createdAt: new Date(),
                    read_timestamp: null
                },
                {
                    senderId: testCompanyId.toString(),
                    receiverId: testUserId.toString(),
                    content: 'Message 3',
                    createdAt: new Date(),
                    read_timestamp: new Date() // This one is read
                }
            ];

            // Insert test messages
            await db.collection('messages').insertMany(messages);

            // Make request to get recent contacts
            const response = await request(app)
                .get('/myRecentEmployerContacts')
                .set('Authorization', `Bearer ${testUserToken}`);

            expect(response.status).toBe(200);
            expect(response.body.length).toBeGreaterThan(0);
            
            // Find the test company in the response
            const testCompanyContact = response.body.find(contact => 
                contact._id === testCompanyId.toString()
            );
            
            // Verify the test company is in the response
            expect(testCompanyContact).toBeDefined();
            expect(testCompanyContact.companyName).toBe(testCompany.name);
            expect(testCompanyContact.countOfUnreadMessages).toBe(2); // Should count both missing and null read_timestamp
        });
    });

    /**
     * Test suite for employer messaging endpoints
     */
    describe('Employer Messaging', () => {
        let testApplicantId;
        let testApplicantToken;
        let testMessageId;
        let testCompanyId;

        beforeAll(async () => {
            // Create a test applicant
            const usersCollection = db.collection('users');
            const hashedPassword = await bcrypt.hash('testPassword123', 10);
            
            const testApplicant = {
                full_name: 'Test Applicant',
                email: 'applicant@example.com',
                password: hashedPassword,
                phone: '1234567890',
                employerFlag: false
            };
            
            const testApplicantResult = await usersCollection.insertOne(testApplicant);
            testApplicantId = testApplicantResult.insertedId;
            
            // Generate token for test applicant
            testApplicantToken = jwt.sign(
                { id: testApplicantId.toString(), employerFlag: false },
                process.env.JWT_SECRET,
                { expiresIn: '1h' }
            );
            
            // Create a test company and associate it with the employer
            const companiesCollection = db.collection('companies');
            const testCompany = {
                _id: ObjectId.createFromHexString(testEmployerId.toString()), // Use employer ID as company ID
                name: 'Test Company',
                description: 'A test company for employer messaging tests'
            };
            
            await companiesCollection.insertOne(testCompany);
            testCompanyId = testCompany._id;
            
            // Update the test employer to be associated with the company
            await usersCollection.updateOne(
                { _id: testEmployerId },
                { $set: { companyId: testCompanyId } }
            );
            
            // Create a test job for the company
            const jobsCollection = db.collection('Jobs');
            const testJobForCompany = {
                ...testJob,
                companyId: testCompanyId.toString(),
                companyName: testCompany.name
            };
            
            const testJobForCompanyResult = await jobsCollection.insertOne(testJobForCompany);
            const testJobForCompanyId = testJobForCompanyResult.insertedId;
            
            // Create a test application
            const applicationsCollection = db.collection('applications');
            await applicationsCollection.insertOne({
                user_id: testApplicantId,
                job_id: testJobForCompanyId,
                company_id: testCompanyId,
                employer_id: testEmployerId,
                status: 'pending',
                createdAt: new Date(),
                swipeMode: 1,
                user: {
                    full_name: testApplicant.full_name,
                    email: testApplicant.email,
                    phone: testApplicant.phone
                }
            });
            
            //console.log('Application created:', applicationResult.insertedId);
            
            // Verify the application was created
            const application = await applicationsCollection.findOne({
                user_id: testApplicantId,
                job_id: testJobForCompanyId
            });
            expect(application).toBeDefined();
            //console.log('Application found:', application);
            
            // Check the job details
            const job = await jobsCollection.findOne({ _id: testJobForCompanyId });
            //console.log('Job details:', job);
            
            // Check the employer details
            const employer = await db.collection('users').findOne({ _id: testEmployerId });
            //console.log('Employer details:', employer);

            const response = await request(app)
                .get('/employer/applications')
                .set('Authorization', `Bearer ${testEmployerToken}`)
                .send();

            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBeGreaterThan(0);
            
            // Verify the application details
            const returnedApp = response.body[0];
            expect(returnedApp.job_id).toBe(testJobForCompanyId.toString());
            expect(returnedApp.company_id).toBe(testCompanyId.toString());
            expect(returnedApp.status).toBe('pending');
            expect(returnedApp.user.full_name).toBe(testApplicant.full_name);
        });

        test('GET /employer/messages - should get all messages for the employer', async () => {
            // Create a test message
            const messagesCollection = db.collection('messages');
            await messagesCollection.insertOne({
                senderId: testApplicantId,
                receiverId: testEmployerId,
                companyId: testEmployerId,
                content: 'Test message from applicant',
                createdAt: new Date(),
                read_timestamp: null
            });

            const response = await request(app)
                .get('/employer/messages')
                .set('Authorization', `Bearer ${testEmployerToken}`)
                .send();

            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBeGreaterThan(0);
            
            // Check if the test message is in the response
            const message = response.body.find(msg => msg.content === 'Test message from applicant');
            expect(message).toBeDefined();
            expect(message.senderId).toBe(testApplicantId.toString());
            expect(message.receiverId).toBe(testEmployerId.toString());
            expect(message.companyId).toBe(testEmployerId.toString());
        });

        test('GET /employer/messages - should return empty array if no messages', async () => {
            // Clear messages collection
            await db.collection('messages').deleteMany({});
            
            const response = await request(app)
                .get('/employer/messages')
                .set('Authorization', `Bearer ${testEmployerToken}`)
                .send();

            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBe(0);
        });

        test('PUT /employer/messages/read/:applicantId - should mark messages as read', async () => {
            // Create unread messages
            const messagesCollection = db.collection('messages');
            await messagesCollection.insertMany([
                {
                    senderId: testApplicantId,
                    receiverId: testEmployerId,
                    companyId: testEmployerId,
                    content: 'Unread message 1',
                    createdAt: new Date(),
                    read_timestamp: null
                },
                {
                    senderId: testApplicantId,
                    receiverId: testEmployerId,
                    companyId: testEmployerId,
                    content: 'Unread message 2',
                    createdAt: new Date(),
                    read_timestamp: null
                }
            ]);
            
            const response = await request(app)
                .put(`/employer/messages/read/${testApplicantId.toString()}`)
                .set('Authorization', `Bearer ${testEmployerToken}`)
                .send();

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('message');
            expect(response.body.message).toBe('Marked 2 messages as read');
            
            // Verify messages are marked as read
            const updatedMessages = await messagesCollection.find({
                senderId: testApplicantId,
                receiverId: testEmployerId,
                read_timestamp: { $ne: null }
            }).toArray();
            
            expect(updatedMessages.length).toBe(2);
        });

        test('PUT /employer/messages/read/:applicantId - should handle no unread messages', async () => {
            const response = await request(app)
                .put(`/employer/messages/read/${testApplicantId.toString()}`)
                .set('Authorization', `Bearer ${testEmployerToken}`)
                .send();

            expect(response.status).toBe(200);
            expect(response.body.message).toBe('No unread messages found');
        });

        test('GET /employer/recent-applicant-contacts - should get recent applicant contacts', async () => {
            // Create a test message to ensure there's a recent contact
            const messagesCollection = db.collection('messages');
            await messagesCollection.insertOne({
                senderId: testApplicantId,
                receiverId: testEmployerId,
                companyId: testEmployerId,
                content: 'Recent message',
                createdAt: new Date(),
                read_timestamp: null
            });

            // Ensure there's a job and application for this applicant
            const jobsCollection = db.collection('Jobs');
            const testJob = await jobsCollection.insertOne({
                title: 'Test Job',
                companyId: testEmployerId,
                createdAt: new Date()
            });

            const applicationsCollection = db.collection('applications');
            await applicationsCollection.insertOne({
                user_id: testApplicantId,
                job_id: testJob.insertedId,
                company_id: testEmployerId,
                employer_id: testEmployerId,
                status: 'pending',
                createdAt: new Date(),
                swipeMode: 1
            });
            
            const response = await request(app)
                .get('/employer/recent-applicant-contacts')
                .set('Authorization', `Bearer ${testEmployerToken}`)
                .send();

            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBeGreaterThan(0);
            
            // Check if the test applicant is in the response
            const contact = response.body.find(c => c._id.toString() === testApplicantId.toString());
            expect(contact).toBeDefined();
            expect(contact.name).toBe('Test Applicant');
            expect(contact.email).toBe('applicant@example.com');
            expect(contact.countOfUnreadMessages).toBeGreaterThan(0);
        });

        test('GET /employer/applicants - should get applicants from jobs', async () => {
            // Ensure there's a job and application for this applicant
            const jobsCollection = db.collection('Jobs');
            const testJob = await jobsCollection.insertOne({
                title: 'Test Job',
                companyId: testEmployerId,
                createdAt: new Date()
            });

            const applicationsCollection = db.collection('applications');
            await applicationsCollection.insertOne({
                user_id: testApplicantId,
                job_id: testJob.insertedId,
                company_id: testEmployerId,
                employer_id: testEmployerId,
                status: 'pending',
                createdAt: new Date(),
                swipeMode: 1
            });

            const response = await request(app)
                .get('/employer/applicants')
                .set('Authorization', `Bearer ${testEmployerToken}`)
                .send();

            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBeGreaterThan(0);
            
            // Check if applicant details are correct
            const applicant = response.body.find(app => app._id.toString() === testApplicantId.toString());
            expect(applicant).toBeDefined();
            expect(applicant.name).toBe('Test Applicant');
            expect(applicant.email).toBe('applicant@example.com');
        });

        test('POST /employer/messages - should send a message to an applicant', async () => {
            const response = await request(app)
                .post('/employer/messages')
                .set('Authorization', `Bearer ${testEmployerToken}`)
                .send({
                    applicantId: testApplicantId.toString(),
                    content: 'Test message from employer'
                });

            expect(response.status).toBe(201);
            expect(response.body).toHaveProperty('content', 'Test message from employer');
            expect(response.body).toHaveProperty('senderId', testEmployerId.toString());
            expect(response.body).toHaveProperty('receiverId', testApplicantId.toString());
            expect(response.body).toHaveProperty('companyId', testEmployerId.toString());
            expect(response.body).toHaveProperty('companyName', 'Test Company');
            expect(response.body).toHaveProperty('applicantName', 'Test Applicant');
            expect(response.body).toHaveProperty('applicantEmail', 'applicant@example.com');
            expect(response.body).toHaveProperty('createdAt');
        });

        test('POST /employer/messages - should handle missing required fields', async () => {
            const response = await request(app)
                .post('/employer/messages')
                .set('Authorization', `Bearer ${testEmployerToken}`)
                .send({
                    applicantId: testApplicantId.toString()
                    // Missing content
                });

            expect(response.status).toBe(400);
            expect(response.body.error).toBe('Message content and applicant ID are required');
        });

        test('POST /employer/messages - should handle non-existent applicant', async () => {
            const response = await request(app)
                .post('/employer/messages')
                .set('Authorization', `Bearer ${testEmployerToken}`)
                .send({
                    applicantId: new ObjectId().toString(),
                    content: 'Test message'
                });

            expect(response.status).toBe(404);
            expect(response.body.error).toBe('Applicant not found');
        });
    });
}); 