const { ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");
const { parseSearchCriteria, generateEmbeddings, refineFoundPositions } = require("../middleware/genAI");
/**
 * Controller for handling job-related operations
 * @namespace jobsController
 */
const jobsController = {

  /**
   * Retrieves all jobs with optional search functionality
   * @async
   * @param {Object} req - Express request object
   * @param {Object} req.query - Query parameters
   * @param {string} [req.query.q] - Search query string
   * @param {Object} res - Express response object
   * @returns {Promise<Array>} Array of matching jobs
   * @throws {Error} 500 if server error occurs
   */
  getAllJobs: async (req, res) => {
    try {
      const queryText = req.query.q || "";
      let jobs = []
      if (!queryText) {
        jobs = await jobsDirectSearch(req);
      } else {
        jobs = await jobsSemanticSearch(req);
      }

      //-------------------------------------
      const token = req.headers.authorization?.split(" ")[1];

      // Get user ID from token if available
      let userId = null;
      if (token) {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        userId = decoded.id;
      }
      const applicationsCollection = req.app.locals.db.collection("applications");

      // If user is logged in, get their applied jobs and filter results
      let finalResults = jobs;
      if (userId) {
        const appliedJobs = await applicationsCollection
          .find({ user_id: ObjectId.createFromHexString(userId) })
          .project({ job_id: 1, _id: 0 })
          .toArray();

        const appliedJobIds = appliedJobs.map(app => app.job_id.toString());
        finalResults = jobs.filter(job => !appliedJobIds.includes(job._id.toString()));
      }

      res.status(200).json(finalResults);


    } catch (error) {
      res.status(500).json({ error: `Error searching jobs. ${error}` });
    }
  },

  /**
   * Retrieves a single job by its ID
   * @async
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.jobId - Job ID
   * @param {Object} res - Express response object
   * @returns {Promise<Object>} Job details
   * @throws {Error} 400 if job ID is invalid
   * @throws {Error} 404 if job not found
   * @throws {Error} 500 if server error occurs
   */
  getJobById: async (req, res) => {
    try {
      const jobsCollection = req.app.locals.db.collection("Jobs");
      const jobId = req.params.jobId;

      if (!ObjectId.isValid(jobId)) {
        return res.status(400).json({ error: "Invalid job ID format" });
      }

      const job = await jobsCollection.aggregate([
        {
          $match: {
            _id: ObjectId.createFromHexString(jobId)
          }
        },
        {
          $lookup: {
            from: "companies",
            localField: "companyId",
            foreignField: "_id",
            as: "companyInfo"
          }
        },
        {
          $unwind: {
            path: "$companyInfo",
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $project: {
            _id: 1,
            title: 1,
            jobDescription: 1,
            skills: 1,
            locations: 1,
            benefits: 1,
            schedule: 1,
            salary: 1,
            createdAt: 1,
            updatedAt: 1,
            employerId: 1,
            companyId: 1,
            companyName: "$companyInfo.name",
            companyWebsite: "$companyInfo.website"
          }
        }
      ]).toArray();

      if (!job || job.length === 0) {
        return res.status(404).json({ error: "Job not found" });
      }

      res.status(200).json(job[0]);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch job details" });
    }
  },

  /**
   * Creates a new job posting
   * @async
   * @param {Object} req - Express request object
   * @param {Object} req.body - Request body
   * @param {string} req.body.title - Job title
   * @param {string} req.body.companyName - Company name
   * @param {string} [req.body.companyWebsite] - Company website
   * @param {string} [req.body.salaryRange] - Salary range
   * @param {Array} [req.body.benefits] - Job benefits
   * @param {Array|string} req.body.locations - Job locations
   * @param {string} [req.body.schedule] - Work schedule
   * @param {string} req.body.jobDescription - Job description
   * @param {Array|string} req.body.skills - Required skills
   * @param {Object} req.user - User object from authentication middleware
   * @param {string} req.user.id - User ID
   * @param {boolean} req.user.employerFlag - Whether user is an employer
   * @param {Object} res - Express response object
   * @returns {Promise<Object>} Created job details
   * @throws {Error} 403 if user is not an employer
   * @throws {Error} 400 if required fields are missing
   * @throws {Error} 500 if server error occurs
   */
  createJob: async (req, res) => {
    try {
      if (!req.user.employerFlag) {
        return res.status(403).json({ error: "Only employers can create job postings" });
      }

      const collection = req.app.locals.db.collection("Jobs");
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

      let companyId;
      if (req.headers['x-company-id']) {
        companyId = ObjectId.createFromHexString(req.headers['x-company-id']);
      } else {
        // Fallback to getting companyId from user's record
        const usersCollection = req.app.locals.db.collection("users");
        const user = await usersCollection.findOne({ _id: ObjectId.createFromHexString(req.user.id) });

        if (!user || !user.companyId) {
          return res.status(400).json({ error: "User not associated with any company" });
        }
        companyId = user.companyId;
      }

      //console.log(companyId);

      if (!title || !jobDescription || !companyId) {
        return res.status(400).json({ error: "Title and job description are required" });
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
        employerId: ObjectId.createFromHexString(req.user.id),
        companyId: companyId
      };

      const textToEmbed = `${newJob.title} ${newJob.jobDescription} ${newJob.skills.join(' ')} ${newJob.companyName ? newJob.companyName : ''} ${newJob.locations.join(' ')} ${newJob.salaryRange ? newJob.salaryRange : ''} ${newJob.benefits.join(' ')} ${newJob.schedule ? newJob.schedule : ''}`;
      const embedding = await generateEmbeddings(textToEmbed);

      const result = await collection.insertOne({ ...newJob, embedding });
      res.status(201).json({
        message: "Job posting created successfully",
        jobId: result.insertedId
      });
    } catch (error) {
      console.error("Error creating job posting:", error);
      res.status(500).json({ error: "Failed to create job posting" });
    }
  },

  /**
   * Updates an existing job posting
   * @async
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.jobId - Job ID
   * @param {Object} req.body - Request body
   * @param {string} req.body.title - Job title
   * @param {string} req.body.companyName - Company name
   * @param {string} [req.body.companyWebsite] - Company website
   * @param {string} [req.body.salaryRange] - Salary range
   * @param {Array} [req.body.benefits] - Job benefits
   * @param {Array|string} req.body.locations - Job locations
   * @param {string} [req.body.schedule] - Work schedule
   * @param {string} req.body.jobDescription - Job description
   * @param {Array|string} req.body.skills - Required skills
   * @param {Object} req.user - User object from authentication middleware
   * @param {string} req.user.id - User ID
   * @param {boolean} req.user.employerFlag - Whether user is an employer
   * @param {Object} res - Express response object
   * @returns {Promise<Object>} Success message
   * @throws {Error} 403 if user is not an employer
   * @throws {Error} 400 if required fields are missing
   * @throws {Error} 404 if job not found
   * @throws {Error} 500 if server error occurs
   */
  updateJob: async (req, res) => {
    try {
      if (!req.user.employerFlag) {
        return res.status(403).json({ error: "Only employers can update jobs" });
      }

      const { jobId } = req.params;
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

      if (!title || !jobDescription) {
        return res.status(400).json({ error: "Title and job description are required" });
      }

      const collection = req.app.locals.db.collection("Jobs");

      // Verify job ownership
      const job = await collection.findOne({
        _id: ObjectId.createFromHexString(jobId),
        employerId: ObjectId.createFromHexString(req.user.id)
      });

      if (!job) {
        return res.status(404).json({ error: "Job not found or unauthorized" });
      }

      const textToEmbed = `${job.title} ${job.jobDescription} ${job.skills.join(' ')} ${job.companyName ? job.companyName : ''} ${job.locations.join(' ')} ${job.salaryRange ? job.salaryRange : ''} ${job.benefits.join(' ')} ${job.schedule ? job.schedule : ''}`;
      const embedding = await generateEmbeddings(textToEmbed);

      const result = await collection.updateOne(
        { _id: ObjectId.createFromHexString(jobId) },
        {
          $set: {
            title,
            companyName,
            companyWebsite,
            salaryRange,
            benefits: Array.isArray(benefits) ? benefits : [benefits],
            locations: Array.isArray(locations) ? locations : [locations],
            schedule,
            jobDescription,
            skills: Array.isArray(skills) ? skills : [skills],
            embedding,
            updatedAt: new Date()
          }
        }
      );

      if (result.modifiedCount === 0) {
        return res.status(404).json({ error: "Job not found" });
      }

      res.status(200).json({ message: "Job updated successfully" });
    } catch (error) {
      res.status(500).json({ error: "Failed to update job" });
    }
  },

  /**
   * Deletes a job posting
   * @async
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.jobId - Job ID
   * @param {Object} req.user - User object from authentication middleware
   * @param {string} req.user.id - User ID
   * @param {boolean} req.user.employerFlag - Whether user is an employer
   * @param {Object} res - Express response object
   * @returns {Promise<Object>} Success message
   * @throws {Error} 403 if user is not an employer
   * @throws {Error} 404 if job not found
   * @throws {Error} 500 if server error occurs
   */
  deleteJob: async (req, res) => {
    try {
      if (!req.user.employerFlag) {
        return res.status(403).json({ error: "Only employers can delete jobs" });
      }

      const { jobId } = req.params;
      const collection = req.app.locals.db.collection("Jobs");

      // Verify job ownership
      const job = await collection.findOne({
        _id: ObjectId.createFromHexString(jobId),
        employerId: ObjectId.createFromHexString(req.user.id)
      });

      if (!job) {
        return res.status(404).json({ error: "Job not found or unauthorized" });
      }

      const result = await collection.deleteOne({
        _id: ObjectId.createFromHexString(jobId)
      });

      if (result.deletedCount === 0) {
        return res.status(404).json({ error: "Job not found" });
      }

      res.status(200).json({ message: "Job deleted successfully" });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete job" });
    }
  },

  /**
   * Searches jobs posted by the logged-in employer
   * @async
   * @param {Object} req - Express request object
   * @param {Object} req.query - Query parameters
   * @param {string} req.query.query - Search query string
   * @param {Object} req.user - User object from authentication middleware
   * @param {string} req.user.id - User ID
   * @param {boolean} req.user.employerFlag - Whether user is an employer
   * @param {Object} res - Express response object
   * @returns {Promise<Array>} Array of matching jobs with application counts
   * @throws {Error} 403 if user is not an employer
   * @throws {Error} 500 if server error occurs
   */
  searchEmployerJobs: async (req, res) => {
    try {
      if (!req.user.employerFlag) {
        return res.status(403).json({ error: "Only employers can search jobs" });
      }

      const { query } = req.query;
      const jobsCollection = req.app.locals.db.collection("Jobs");
      const applicationsCollection = req.app.locals.db.collection("applications");
      const companiesCollection = req.app.locals.db.collection("companies");

      // Get companyId from header or user's company
      let companyId;
      if (req.headers['x-company-id']) {
        companyId = ObjectId.createFromHexString(req.headers['x-company-id']);
      } else {
        // Fallback to getting companyId from user's record
        const usersCollection = req.app.locals.db.collection("users");
        const user = await usersCollection.findOne({ _id: ObjectId.createFromHexString(req.user.id) });

        if (!user || !user.companyId) {
          return res.status(400).json({ error: "User not associated with any company" });
        }
        companyId = user.companyId;
      }

      const jobs = await jobsCollection.aggregate([
        {
          $match: {
            companyId: companyId,
            $or: [
              { title: { $regex: query, $options: "i" } },
              { jobDescription: { $regex: query, $options: "i" } },
              { skills: { $regex: query, $options: "i" } },
              { locations: { $regex: query, $options: "i" } }
            ]
          }
        },
        {
          $lookup: {
            from: "applications",
            localField: "_id",
            foreignField: "job_id",
            as: "applications"
          }
        },
        {
          $lookup: {
            from: "companies",
            localField: "companyId",
            foreignField: "_id",
            as: "companyInfo"
          }
        },
        {
          $unwind: {
            path: "$companyInfo",
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $project: {
            _id: 1,
            title: 1,
            salaryRange: 1,
            benefits: 1,
            locations: 1,
            schedule: 1,
            jobDescription: 1,
            skills: 1,
            createdAt: 1,
            applicationCount: { $size: "$applications" },
            companyName: "$companyInfo.name",
            companyWebsite: "$companyInfo.website"
          }
        }
      ]).toArray();

      res.status(200).json(jobs);
    } catch (error) {
      res.status(500).json({ error: "Failed to search jobs" });
    }
  },

  getHomepageJobsUsingSemanticSearch: async (req, res) => {
    try {

      let searchCriteria = req.query.q || "";
      //const jobs = await searchJobs(queryText, 10);


      const jobDetails = await parseSearchCriteria(searchCriteria);

      console.log(jobDetails);

      let processedCriteria = jobDetails.my_requirements ? jobDetails.my_requirements : "";

      if (jobDetails.locations?.length > 0) {
        processedCriteria += `\nLocations: ${jobDetails.locations?.join(', ')}`;
      }

      if (jobDetails.salaryRange?.minimum || jobDetails.salaryRange?.maximum) {
        processedCriteria += `\nSalary: ${jobDetails.salaryRange?.minimum} - ${jobDetails.salaryRange?.maximum}`;
      }


      if (jobDetails.company) {
        processedCriteria += `\nCompany: ${jobDetails.company}`;
      }

      if (!processedCriteria) {
        processedCriteria = searchCriteria;
      }
      // Generate embedding for the search query
      const queryEmbedding = await generateEmbeddings(processedCriteria);

      // Perform vector search
      const results = await req.app.locals.db.collection("Jobs").aggregate([
        {
          $vectorSearch: {
            queryVector: queryEmbedding,
            path: "embedding",
            numCandidates: 100,
            limit: 10,
            index: "js_vector_index",
          }
        },
        {
          $lookup: {
            from: "companies",
            localField: "companyId",
            foreignField: "_id",
            as: "companyInfo"
          }
        },
        {
          $unwind: {
            path: "$companyInfo",
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $project: {
            _id: 1,
            title: 1,
            companyName: "$companyInfo.name",
            companyWebsite: "$companyInfo.website",
            jobDescription: 1,
            salaryRange: 1,
            locations: 1,
            benefits: 1,
            schedule: 1,
            skills: 1,
            score: { $meta: "vectorSearchScore" }
          }
        }
      ]).toArray();

      // Filter results to only include those with a score greater than 0.62
      const filteredResults = results.filter(result => result.score > 0.62);

      //-------------------------------------
      const token = req.headers.authorization?.split(" ")[1];

      // Get user ID from token if available
      let userId = null;
      if (token) {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        userId = decoded.id;
      }
      const applicationsCollection = req.app.locals.db.collection("applications");

      // If user is logged in, get their applied jobs and filter results
      let finalResults = filteredResults;
      if (userId) {
        const appliedJobs = await applicationsCollection
          .find({ user_id: ObjectId.createFromHexString(userId) })
          .project({ job_id: 1, _id: 0 })
          .toArray();

        const appliedJobIds = appliedJobs.map(app => app.job_id.toString());
        finalResults = filteredResults.filter(job => !appliedJobIds.includes(job._id.toString()));
      }
      //-------------------------------------
      console.log("MongoDB returned : ", finalResults.length);
      if (jobDetails.skills?.length > 0) {
        searchCriteria += `\nMatch one or more of these skills: (${jobDetails.skills?.join(', ')})`;
      }

      console.log("Refining results with the following criteria: ", searchCriteria);
      // use the criteria as specified by the user to refine the results
      const enhancedJobs = await refineFoundPositions(finalResults, searchCriteria);

      console.log("Enhanced jobs: ", enhancedJobs.length);

      // Filter and sort to show "great" matches before "good" matches
      const greatMatches = enhancedJobs
        .filter(job => job.match === "great" || job.match === "good")
        .sort((a, b) => b.match === "great" ? 1 : -1);

      console.log("Refined matches: ", greatMatches.length);

      res.status(200).json(greatMatches);
    } catch (error) {
      console.error("Error in getHomepageJobsUsingSemanticSearch:", error);
      res.status(500).json({ error: "Failed to search jobs", details: error });
    }
  },
  // Get jobs for homepage
  getHomepageJobs: async (req, res) => {
    try {
      const jobsCollection = req.app.locals.db.collection("Jobs");
      const applicationsCollection = req.app.locals.db.collection("applications");

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

      let jobs = [];
      // Use aggregation to join with companies and project companyName
      const baseJobs = await jobsCollection.aggregate([
        { $match: query },
        {
          $lookup: {
            from: "companies",
            localField: "companyId",
            foreignField: "_id",
            as: "companyInfo"
          }
        },
        {
          $unwind: {
            path: "$companyInfo",
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $project: {
            _id: 1,
            title: 1,
            jobDescription: 1,
            skills: 1,
            locations: 1,
            benefits: 1,
            schedule: 1,
            salary: 1,
            createdAt: 1,
            updatedAt: 1,
            employerId: 1,
            companyId: 1,
            companyName: "$companyInfo.name",
            companyWebsite: "$companyInfo.website"
          }
        }
      ]).toArray();

      const token = req.headers.authorization?.split(" ")[1];
      if (token) {
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          const appliedJobsResult = await applicationsCollection
            .find({
              user_id: ObjectId.createFromHexString(decoded.id)
            })
            .project({ job_id: 1, _id: 0 })
            .toArray();

          const appliedJobIds = appliedJobsResult.map(app => app.job_id);
          jobs = baseJobs.filter(job =>
            !appliedJobIds.some(appliedId =>
              appliedId.toString() === job._id.toString()
            )
          );
        } catch (error) {
          jobs = baseJobs;
        }
      } else {
        jobs = baseJobs;
      }

      res.status(200).json(jobs);
    } catch (error) {
      res.status(500).json({ error: `Error searching jobs. ${error}` });
    }
  },

  /**
   * Retrieves all jobs with optional search functionality, excluding jobs the applicant has already applied to
   * @async
   * @param {Object} req - Express request object
   * @param {Object} req.query - Query parameters
   * @param {string} [req.query.q] - Search query string
   * @param {Object} req.user - User object from authentication middleware
   * @param {string} req.user.id - User ID
   * @param {Object} res - Express response object
   * @returns {Promise<Array>} Array of matching jobs that the user hasn't applied to
   * @throws {Error} 500 if server error occurs
   */
  getNewJobs: async (req, res) => {
    try {
      const jobsCollection = req.app.locals.db.collection("Jobs");
      const applicationsCollection = req.app.locals.db.collection("applications");
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

      // Get all jobs matching the search query
      const jobs = await jobsCollection.aggregate([
        { $match: query },
        {
          $lookup: {
            from: "companies",
            localField: "companyId",
            foreignField: "_id",
            as: "companyInfo"
          }
        },
        {
          $unwind: {
            path: "$companyInfo",
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $project: {
            _id: 1,
            title: 1,
            jobDescription: 1,
            skills: 1,
            locations: 1,
            benefits: 1,
            schedule: 1,
            salary: 1,
            createdAt: 1,
            updatedAt: 1,
            employerId: 1,
            companyId: 1,
            companyName: "$companyInfo.name",
            companyWebsite: "$companyInfo.website"
          }
        }
      ]).toArray();

      // Get all jobs the user has already applied to
      const appliedJobs = await applicationsCollection
        .find({
          user_id: ObjectId.createFromHexString(req.user.id)
        })
        .project({ job_id: 1, _id: 0 })
        .toArray();

      const appliedJobIds = appliedJobs.map(app => app.job_id.toString());

      // Filter out jobs the user has already applied to
      const newJobs = jobs.filter(job =>
        !appliedJobIds.includes(job._id.toString())
      );

      res.status(200).json(newJobs);
    } catch (error) {
      res.status(500).json({ error: `Error searching new jobs. ${error}` });
    }
  }
};


async function jobsDirectSearch(req) {
  const jobsCollection = req.app.locals.db.collection("Jobs");
  const companiesCollection = req.app.locals.db.collection("companies");
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

  const jobs = await jobsCollection.aggregate([
    { $match: query },
    {
      $lookup: {
        from: "companies",
        localField: "companyId",
        foreignField: "_id",
        as: "companyInfo"
      }
    },
    {
      $unwind: {
        path: "$companyInfo",
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $project: {
        _id: 1,
        title: 1,
        jobDescription: 1,
        skills: 1,
        locations: 1,
        benefits: 1,
        schedule: 1,
        salaryRange: 1,
        createdAt: 1,
        updatedAt: 1,
        employerId: 1,
        companyId: 1,
        companyName: "$companyInfo.name",
        companyWebsite: "$companyInfo.website"
      }
    }
  ]).toArray();
  return jobs;
};

async function jobsSemanticSearch(req) {
  try {
    const searchCriteria = req.query.q || "";
    const jobDetails = await parseSearchCriteria(searchCriteria);

    console.log(jobDetails);

    let processedCriteria = jobDetails.my_requirements ? jobDetails.my_requirements : "";

    if (jobDetails.locations?.length > 0) {
      processedCriteria += `\nLocations: ${jobDetails.locations?.join(', ')}`;
    }

    if (jobDetails.salaryRange?.minimum || jobDetails.salaryRange?.maximum) {
      processedCriteria += `\nSalary: ${jobDetails.salaryRange?.minimum} - ${jobDetails.salaryRange?.maximum}`;
    }

    if (jobDetails.skills?.length > 0) {
      processedCriteria += `\nSkills: ${jobDetails.skills?.join(', ')}`;
    }

    if (jobDetails.company) {
      processedCriteria += `\nCompany: ${jobDetails.company}`;
    }

    if (!processedCriteria) {
      processedCriteria = searchCriteria;
    }

    // Generate embedding for the search query
    const queryEmbedding = await generateEmbeddings(processedCriteria);

    // Perform vector search
    const results = await req.app.locals.db.collection("Jobs").aggregate([
      {
        $vectorSearch: {
          queryVector: queryEmbedding,
          path: "embedding",
          numCandidates: 100,
          limit: 10,
          index: "js_vector_index",
        }
      },
      {
        $lookup: {
          from: "companies",
          localField: "companyId",
          foreignField: "_id",
          as: "companyInfo"
        }
      },
      {
        $unwind: {
          path: "$companyInfo",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          _id: 1,
          title: 1,
          companyName: "$companyInfo.name",
          companyWebsite: "$companyInfo.website",
          jobDescription: 1,
          salaryRange: 1,
          locations: 1,
          benefits: 1,
          schedule: 1,
          skills: 1,
          score: { $meta: "vectorSearchScore" }
        }
      }
    ]).toArray();

    // Filter results to only include those with a score greater than 0.62
    const filteredResults = results.filter(result => result.score > 0.62);

    console.log("MongoDB returned : ", filteredResults.length);
    console.log("Refining results with the following criteria: ", searchCriteria);

    // use the criteria as specified by the user to refine the results
    const enhancedJobs = await refineFoundPositions(filteredResults, searchCriteria);

    console.log("Enhanced jobs: ", enhancedJobs.length);

    // Filter and sort to show "great" matches before "good" matches
    const greatMatches = enhancedJobs
      .filter(job => job.match === "great" || job.match === "good")
      .sort((a, b) => b.match === "great" ? 1 : -1);

    console.log("Refined matches: ", greatMatches.length);

    return greatMatches;
  } catch (error) {
    console.error("Error in jobsSemanticSearch:", error);
    throw error;
  }
};


module.exports = jobsController;