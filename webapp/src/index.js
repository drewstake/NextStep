import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/global.css"; // Global styles
import { TokenProvider } from "./components/TokenContext";
import { GoogleOAuthProvider } from "@react-oauth/google";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <GoogleOAuthProvider clientId={process.env.REACT_APP_GOOGLE_CLIENT_ID}>
    <TokenProvider>
      <React.StrictMode>
        <App />
      </React.StrictMode>
    </TokenProvider>
  </GoogleOAuthProvider>
);
