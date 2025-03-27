```mermaid
sequenceDiagram
    title New Job Notification
    actor JobSeeker
    participant Profile
    participant Job
    participant JobApplication
    participant NotificationService

    Job ->> Job: New job posted
    Job ->> Profile: Match job properties with profiles
    alt Match found
        Profile ->> NotificationService: Notify job seekers
        NotificationService ->> JobSeeker: Send notification about new job
    else No match found
        Job -->> Job: No action needed
    end
