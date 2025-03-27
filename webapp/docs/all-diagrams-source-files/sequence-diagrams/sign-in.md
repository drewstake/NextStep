```mermaid
sequenceDiagram
    title Sign-In
<<<<<<< HEAD
    actor JobSeeker
    JobSeeker ->> SignInForm: Enter credentials
    SignInForm ->> AccountDB: Verify credentials
    AccountDB -->> SignInForm: Verification result
    SignInForm -->> JobSeeker: Sign-in successful
=======
    actor User
    User ->> Sign-in Form: Enter credentials
    Sign-in Form ->> Sign-in API: Submit credentials
    Sign-in API ->> DB: Lookup account
    DB -->> Sign-in API: Retreive matched profile
    Sign-in API -->> Sign-in Form: Return success  
    Sign-in Form -->> User: Sign-in successful
>>>>>>> c385fae2c82551af2029c416a05994df92289c1f

```