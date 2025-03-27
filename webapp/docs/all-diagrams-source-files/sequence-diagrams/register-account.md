```mermaid
sequenceDiagram
<<<<<<< HEAD
    title Register Account
    actor JobSeeker
    JobSeeker ->> RegistrationForm: Fill out registration form
    RegistrationForm ->> AccountDB: Create new account
    AccountDB -->> RegistrationForm: Account created
    RegistrationForm -->> JobSeeker: Registration confirmation
=======
    title Sign-up
    actor User
    User ->> Sign-up Page: Fill out Sign-up form
    Sign-up Page ->> Sign-up API: Submit sign up info
    Sign-up API ->> DB: Save account data 
    DB -->> Sign-up API: data saved
    Sign-up API ->> Sign-up Page: Account created
    Sign-up Page -->> User: Sign-up confirmation
>>>>>>> c385fae2c82551af2029c416a05994df92289c1f
```