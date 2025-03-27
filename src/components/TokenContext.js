// File: /src/TokenContext.js
import React, { createContext, useState, useEffect } from "react";

export const TokenContext = createContext();

export const TokenProvider = ({ children }) => {
  console.log("Token init!!");
  const [token, setToken] = useState(() => localStorage.getItem("token"));
  const [employerFlag, setEmployerFlag] = useState(() => localStorage.getItem("employerFlag") === "true");
  const [profileUpdateTrigger, setProfileUpdateTrigger] = useState(0);

  useEffect(() => {
    if (token) {
      localStorage.setItem("token", token);
    } else {
      localStorage.removeItem("token");
    }
  }, [token]);

  useEffect(() => {
    localStorage.setItem("employerFlag", employerFlag);
  }, [employerFlag]);

  const triggerProfileUpdate = () => {
    setProfileUpdateTrigger(prev => prev + 1);
  };

  return (
    <TokenContext.Provider
      value={{ 
        token, 
        setToken, 
        employerFlag, 
        setEmployerFlag,
        profileUpdateTrigger,
        triggerProfileUpdate 
      }}
    >
      {children}
    </TokenContext.Provider>
  );
};
