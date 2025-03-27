// File: /src/TokenContext.js
import React, { createContext, useState, useEffect } from "react";

const TokenContext = createContext();

const TokenProvider = ({ children }) => {
  console.log("Token init!!");
  const [token, setToken] = useState(() => localStorage.getItem("token"));
  const [employerFlag, setEmployerFlag] = useState(() => localStorage.getItem("employerFlag") === "true");
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

  return (
    <TokenContext.Provider
      value={{ token, setToken, employerFlag, setEmployerFlag }}
    >
      {children}
    </TokenContext.Provider>
  );
};

export { TokenContext, TokenProvider };
