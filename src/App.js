import React, { useContext, useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import Home from "./pages/Home";
import About from "./pages/About";
import Auth from "./components/Auth";
import Profile from "./pages/Profile";
import Login from "./pages/Login";
import BrowseJobs from "./pages/BrowseJobs";
import YourJobs from "./pages/YourJobs";
import EmployerDashboard from "./pages/EmployerDashboard";
import EmployerApplicationTracker from "./pages/EmployerApplicationTracker";
import Messenger from "./pages/Messenger";
import Details from "./pages/Details";
import "./styles/App.css";
import { TokenContext } from "./components/TokenContext";
import axios from "axios";

function App() {
  const { token, employerFlag, profileUpdateTrigger } = useContext(TokenContext);
  const [userName, setUserName] = useState("");

  // Track whether the mobile nav overlay is open
  const [isNavOpen, setIsNavOpen] = useState(false);

  // Track if the viewport is mobile-sized (<= 768px)
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  // Fetch user profile when token is available or profile is updated
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (token) {
        try {
          const response = await axios.get('http://localhost:4000/profile', {
            headers: { Authorization: `Bearer ${token}` }
          });
          const user = response.data;
          // Use full_name if available, otherwise combine first and last name
          const displayName = user.full_name || 
            `${user.first_name || ''} ${user.last_name || ''}`.trim();
          setUserName(displayName);
        } catch (error) {
          console.error('Error fetching user profile:', error);
          setUserName('Profile');
        }
      } else {
        setUserName('Profile');
      }
    };

    fetchUserProfile();
  }, [token, profileUpdateTrigger]); // Add profileUpdateTrigger to dependencies

  // Toggle the mobile nav overlay
  const toggleNav = () => {
    setIsNavOpen((prev) => !prev);
  };

  // Listen for window resize to switch between mobile/desktop
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      // If we move to desktop while the overlay is open, close it
      if (!mobile && isNavOpen) {
        setIsNavOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isNavOpen]);

  return (
    <Router>
      <div className="app-container">
        <header className="app-header">
          {/* Desktop Nav vs. Mobile Hamburger */}
          {isMobile ? (
            <button className="hamburger" onClick={toggleNav}>
              <span className="bar"></span>
              <span className="bar"></span>
              <span className="bar"></span>
            </button>
          ) : (
            <>
              <nav className="app-nav">
                <Link className="app-nav__link" to="/">
                  Home
                </Link>
                <Link className="app-nav__link" to="/about">
                  About
                </Link>
                <Link className="app-nav__link" to="/jobs">
                  Jobs
                </Link>
                {token && (
                  <Link className="app-nav__link" to="/profile">
                    Profile: {userName}
                  </Link>
                )}
                {token && employerFlag && (
                  <Link className="app-nav__link" to="/employer-dashboard">
                    Employer Dashboard
                  </Link>
                )}
                {token && (
                  <Link className="app-nav__link" to="/messenger">
                    Messenger
                  </Link>
                )}
              </nav>
              <div className="auth-container">
                {token && !employerFlag && (
                  <Link className="app-nav__link" to="/your-jobs">
                    My Jobs
                  </Link>
                )}
                <Auth />
              </div>
            </>
          )}
        </header>

        {/* Mobile Nav Overlay */}
        {isMobile && isNavOpen && (
          <div className="nav-overlay">
            <div className="nav-overlay-content">
              <button className="close-btn" onClick={toggleNav}>
                ×
              </button>
              <Link className="app-nav__link" to="/" onClick={toggleNav}>
                Home
              </Link>
              <Link className="app-nav__link" to="/about" onClick={toggleNav}>
                About
              </Link>
              <Link className="app-nav__link" to="/jobs" onClick={toggleNav}>
                Jobs
              </Link>
              {token && (
                <Link
                  className="app-nav__link"
                  to="/profile"
                  onClick={toggleNav}
                >
                  {userName}
                </Link>
              )}
              {token && employerFlag && (
                <Link
                  className="app-nav__link"
                  to="/employer-dashboard"
                  onClick={toggleNav}
                >
                  Employer Dashboard
                </Link>
              )}
              {token && !employerFlag && (
                <Link
                  className="app-nav__link"
                  to="/your-jobs"
                  onClick={toggleNav}
                >
                  My Jobs
                </Link>
              )}
              {token && (
                <Link
                  className="app-nav__link"
                  to="/messenger"
                  onClick={toggleNav}
                >
                  Messenger
                </Link>
              )}
              {/* Auth button (Sign In / Sign Out) in mobile overlay */}
              <Auth onClick={toggleNav} />
            </div>
          </div>
        )}

        {/* Main Content / Routes */}
        <main className="app-main">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/jobs" element={<BrowseJobs />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/login" element={<Login />} />
            <Route path="/your-jobs" element={<YourJobs />} />
            <Route path="/employer-dashboard" element={<EmployerDashboard />} />
            <Route
              path="/employer-application-tracker"
              element={<EmployerApplicationTracker />}
            />
            <Route path="/messenger" element={<Messenger />} />
            <Route path="/jobs/:jobId/:returnTo" element={<Details />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
