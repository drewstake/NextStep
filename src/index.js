import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/global.css"; // Global styles
import { TokenProvider } from "./components/TokenContext";
import { GoogleOAuthProvider } from "@react-oauth/google";

// Debug: Log environment variables
const clientId =
  "681971948277-sghsen822vlul0c98ffs8mqrnn4u8god.apps.googleusercontent.com";
console.log("Using Google Client ID:", clientId);

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <GoogleOAuthProvider clientId={clientId}>
    <TokenProvider>
      <React.StrictMode>
        <App />
      </React.StrictMode>
    </TokenProvider>
  </GoogleOAuthProvider>
);
