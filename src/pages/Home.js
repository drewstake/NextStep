// File: /src/pages/Home.js
import React, {useContext, useEffect} from 'react';
import { useNavigate } from "react-router-dom";
import Swipe from '../components/Swipe';
import '../styles/Home.css';
import { TokenContext } from "../components/TokenContext";
import jwt_decode from 'jwt-decode';


const Home = () => {
  const { token, employerFlag } = useContext(TokenContext);
  const navigate = useNavigate();
  const decoded = token ? jwt_decode(token) : null;
  const isEmployer = decoded?.employerFlag || false;

  useEffect(() => {
    if (isEmployer) {
      navigate('/employer-dashboard');
    }
  }, [isEmployer, navigate]);


  const handleSignInClick = () => {
    // Redirect to /login
    navigate("/login");
  };
  
  return (
    <div className="home-container">
      <div className="home-branding">
        <h1 className="home-branding__title">NextStep</h1>
        <p className="home-branding__subtitle">Your next career move, simplified.</p>
      </div>
      {token && (
        <Swipe />
      )}
      {!token && (
        <p className="home-please-sign-in" onClick={handleSignInClick}>Sign-in to apply for jobs.</p>
      )}
    </div>
  );
};

export default Home;
