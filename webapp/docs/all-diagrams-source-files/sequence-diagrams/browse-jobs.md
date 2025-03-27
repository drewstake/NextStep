```mermaid
sequenceDiagram
    title Browse Jobs
<<<<<<< HEAD
    actor JobSeeker
    JobSeeker ->> JobsPage: Navigate to jobs page
    JobsPage ->> SearchCriteriaForm: Enter search criteria
    SearchCriteriaForm ->> JobsDB: Retrieve job listings based on criteria
    JobsDB -->> JobsPage: Send job listings
    JobsPage -->> JobSeeker: Display job listings
    alt Optionally View Job Details Card
        JobSeeker ->> JobsPage: Click/Swipe on job listing
        JobsPage ->> JobsDB: Retrieve job details
        JobsDB -->> JobsPage: Send job details
        JobsPage -->> JobSeeker: Display job details
        alt Optionally Apply for Job
            JobSeeker ->> ApplicationForm: Click on apply button
            ApplicationForm ->> ApplicationsDB: Submit application
            ApplicationsDB -->> ApplicationForm: Application submitted
            ApplicationForm -->> JobSeeker: Application confirmation
        end
=======
    actor Job Seeker
    Job Seeker ->> Jobs Page: Navigate to Jobs page
    Jobs Page ->> Jobs Page: Enter search criteria
    Jobs Page ->> Jobs API: Retrieve job listings based on criteria
    Jobs API ->> DB: Query Jobs
    DB ->> Jobs API: 
    Jobs API -->> Jobs Page: Return job listings
    Jobs Page -->> Job Seeker: Display job listings
    alt Optionally Apply for Job
        Job Seeker ->> Jobs Page: Click apply button
        Jobs Page ->> Apply API: Submit application
        Apply API -->> DB: Save Application Information
        DB ->> Apply API: Application saved
        Apply API -->> Jobs Page: Application submitted
        Jobs Page -->> Job Seeker: Display confirmation
>>>>>>> c385fae2c82551af2029c416a05994df92289c1f
    end

