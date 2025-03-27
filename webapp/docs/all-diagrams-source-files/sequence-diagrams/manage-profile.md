```mermaid
sequenceDiagram
    title Manage Profile
<<<<<<< HEAD
    actor JobSeeker
    JobSeeker ->> ProfilePage: Navigate to profile page
    ProfilePage ->> ProfileDB: Retrieve profile information
    ProfileDB -->> ProfilePage: Send profile details
    JobSeeker ->> ProfilePage: Update profile information
    ProfilePage ->> ProfileDB: Save updated profile
    ProfileDB -->> ProfilePage: Profile updated
    ProfilePage -->> JobSeeker: Update confirmation
=======
    actor User
    User ->> Profile Page: Navigate to profile page
    Profile Page ->> Profile API: Retrieve profile information
    Profile API ->> DB: Query profile data
    DB -->> Profile API: Send profile details
    Profile API -->> Profile Page: Return profile info
    Profile Page -->> User: Show Profile info
    User ->> Profile Page: Change profile information
    Profile Page ->> Profile API: Save updated profile
    Profile API ->> DB: Update profile data
    DB -->> Profile API: Return update status
    Profile API -->> Profile Page: Confirm update
    Profile Page -->> User: Show confirmation
>>>>>>> c385fae2c82551af2029c416a05994df92289c1f
```