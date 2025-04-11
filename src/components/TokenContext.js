// File: /src/TokenContext.js
import React, { createContext, useState, useEffect } from "react";

export const TokenContext = createContext();

export const TokenProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem("token"));
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [employerFlag, setEmployerFlag] = useState(() => localStorage.getItem("employerFlag") === "true");
  const [companyId, setCompanyId] = useState(() => localStorage.getItem("companyId"));
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
    localStorage.setItem("email", email);
    localStorage.setItem("name", name);
    if (companyId) {
      localStorage.setItem("companyId", companyId);
    } else {
      localStorage.removeItem("companyId");
    }
  }, [employerFlag, name, email, companyId]);

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
        name,
        email,
        setName,
        setEmail,
        companyId,
        setCompanyId,
        profileUpdateTrigger,
        triggerProfileUpdate 
      }}
    >
      {children}
    </TokenContext.Provider>
  );
};
