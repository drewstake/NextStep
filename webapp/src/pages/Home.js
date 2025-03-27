// File: /src/pages/Home.js
import React, {useContext} from 'react';
import { useNavigate } from "react-router-dom";
import Swipe from '../components/Swipe';
import '../styles/Home.css';
import { TokenContext } from "../components/TokenContext";


const Home = () => {
  const { token } = useContext(TokenContext);
  const navigate = useNavigate();

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
