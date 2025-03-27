// File: /src/components/Auth.js
import React, { useContext } from "react";
import { useNavigate } from "react-router-dom";
import { TokenContext } from "./TokenContext";

const Auth = () => {
  const navigate = useNavigate();
  const { token, setToken, setEmployerFlag } = useContext(TokenContext);

  const handleSignInClick = () => {
    // Redirect to /login
    navigate("/login");
  };

  const handleSignOutClick = () => {
    // Redirect to /login
    setToken(null);
    navigate('/login');
    setEmployerFlag(false);
    localStorage.removeItem("token");
    localStorage.removeItem("employerFlag");
    navigate("/login");
  };

  return (
    <div>
      {!token && (
        <button className="auth__button" onClick={handleSignInClick}>
          Sign In
        </button>
      )}
      {token && (
        <button className="auth__button" onClick={handleSignOutClick}>
          Sign Out
        </button>
      )}
    </div>
  );
};

export default Auth;
