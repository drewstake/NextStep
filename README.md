# NextStep - A Swipe-Based Job Matching App

<img src="src/assets//NextStep_Logo.png">

NextStep is a **web and mobile job-matching platform** designed to simplify the job search process using a **swipe-based** interface. It leverages **AI-driven recommendations** and **real-time tracking** to connect job seekers with employers efficiently.

###  Table of Contents
- [Overview](#overview)
- [Core Objectives](#core-objectives)
- [Technology Stack](#technology-stack)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the Application](#running-the-application)
- [API Endpoints](#api-endpoints)
- [Contributing](#contributing)
- [License](#license)
---

### Overview 

**NextStep** is a job-matching application with a **swipe-based** interface that helps job seekers efficiently browse and apply for jobs. Employers can post job listings, track applications, and connect with candidates in real time.


### **Core Objectives** 
- **Swipe-Based Job Discovery** – Browse jobs with a swipe-like/scroll experience inspired from popular apps such as Hinge, Tiktok, Tinder.
- **AI-Powered Job Recommendations** – Tailored job suggestions based on profile & history  
- **One-Click Apply** – Apply instantly with stored profile/resume  
- **Application Tracking** – Track job application statuses in real-time  
- **Employer Dashboard** – Post jobs, review candidates, and schedule interviews  
- **Multi-Platform Support** – Accessible via Web and Mobile  

---

### **Technology Stack** 

#### **Frontend**
- **Framework**: React.js(Web)/React Native (Mobile)
- **Styling**: TailwindCSS
- **React Router** – Frontend navigation
- **Axios** – API communication

#### **Backend**
- **Node.js** – Server-side runtime
- **Express.js** – Middleware
- **MongoDB Atlas** – Cloud-based NoSQL database
- **Mongoose** – ODM for MongoDB schema validation
- **JWT (JSON Web Tokens)** – Authentication system
- **Firebase Cloud Messaging (FCM)** – Push notifications
- **AWS/GCP** – Cloud hosting (for scalability)


#### **DevOps & Deployment**
- pending.

---

### **Installation** 
```bash
# 1️⃣ Clone the Repository
git clone https://github.com/drewstake/nextstep.git
cd nextstep

# 2️⃣ Install Backend Dependencies
cd backend
npm install

# 3️⃣ Install Frontend Dependencies
cd ../src
npm install
```
### **Configuration**
Before running the app, configure the environment variables.

#### Frontend .env File
```bash
REACT_APP_BACKEND_URL=http://localhost:5500
```

#### Backend .env File
```bash
MONGO_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/nextstep
PORT=5500
JWT_SECRET=your_jwt_secret
FIREBASE_SERVER_KEY=your_firebase_server_key
```

### **Running The Application**
```bash
# 1️⃣ Start Backend
cd backend
npm start

Server will run on http://localhost:5500

#2️⃣ Start Frontend
cd src
npm start

Frontend will run on http://localhost:3000
```
### **API Endpoints**
|Method	 |    Endpoint	            |    Description                |
|--------|--------------------------|-------------------------------|
|POST	 |  /api/register	        |   Register a new user         |
|POST	 |  /api/login	            |   Authenticate user           |
|GET	 |  /api/jobs	            |   Retrieve job listings       |
|POST	 |  /api/apply	            |   Apply for a job             |
|GET	 |  /api/applications       |	Get user’s job applications |
|DELETE	 |  /api/applications/:id	|   Withdraw an application     |


### **Contributing**
We welcome contributions! Follow these steps:

- Fork the repository 
- Create a new branch (feature/your-feature-name)
- Commit your changes
- Push to your fork
- Submit a pull request

### **License**
This project is licensed under the MIT License.

### 📢 **Future Enhancements**
- Real-Time Chat for Employers & Candidates
- AI-Powered Resume Screening
- Interview Scheduling with Google Calendar
