```mermaid
sequenceDiagram
    title Track Applications
    actor JobSeeker
<<<<<<< HEAD
    JobSeeker ->> ApplicationsPage: View applications
    ApplicationsPage ->> ApplicationsDB: Retrieve applications
    ApplicationsDB -->> ApplicationsPage: Send application details
    ApplicationsPage -->> JobSeeker: Display application details
=======
    JobSeeker ->> Applications Page: View applications
    Applications Page ->> Applications API: Retrieve applications
    Applications API ->> DB: Query applications
    DB -->> Applications API: Return applications data
    Applications API ->> Applications Page: Return applications
    Applications Page -->> JobSeeker: Display applications
>>>>>>> c385fae2c82551af2029c416a05994df92289c1f

```