import React, { useState, useEffect, useContext } from "react";
import "../styles/Login.css";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { TokenContext } from "../components/TokenContext";
import { GoogleLogin } from "@react-oauth/google";
import NotificationBanner from "../components/NotificationBanner";
const Login = () => {
  // ======================
  // Error state
  // ======================
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  // ======================
  // Login form state
  // ======================
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginPhone, setLoginPhone] = useState("");
  const [loginMethod, setLoginMethod] = useState("email"); // 'email' or 'phone'
  const [verificationCode, setVerificationCode] = useState("");
  const [showVerification, setShowVerification] = useState(false);

  // ======================
  // Sign up form state
  // ======================
  const [signupName, setSignupName] = useState("");
  const [signupPhone, setSignupPhone] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupVerificationCode, setSignupVerificationCode] = useState("");
  const [showSignupVerification, setShowSignupVerification] = useState(false);

  // ======================
  // Context & Navigation
  // ======================
  const navigate = useNavigate();
  const { token, setToken, employerFlag, setEmployerFlag } =
    useContext(TokenContext);

  // If a token already exists, redirect to profile
  useEffect(() => {
    if (token) {
      setToken(token);
      navigate("/profile");
    }
  }, [token, navigate, setToken]);

  // ======================
  // Phone Verification
  // ======================
  const handleSendVerificationCode = async (phone, isSignup = false) => {
    try {
      await axios.post("http://localhost:4000/send-verification", {
        phoneNumber: phone,
      });
      if (isSignup) {
        setShowSignupVerification(true);
      } else {
        setShowVerification(true);
      }
      setError("You will receive a phone call with your verification code!");
    } catch (error) {
      console.error("Error initiating verification call:", error);
      setError("Failed to initiate verification call. Please try again.");
    }
  };

  // ======================
  // Login Submit
  // ======================
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    try {
      const loginData =
        loginMethod === "email"
          ? { email: loginEmail, password: loginPassword }
          : { phone: loginPhone, verificationCode };

      const response = await axios.post("http://localhost:4000/signin", loginData);
      setToken(response.data.token);
      setEmployerFlag(response.data.isEmployer);
    } catch (error) {
      console.error("Login error:", error);
      
      // Handle network errors
      if (!error.response) {
        setError("Unable to connect to the server. Please check your internet connection and try again. Also ensure that the server API is available.");
        return;
      }else if (error.response.data && error.response.data.message) {
        setError(error.response.data.message);
      }else{
        setError("An unexpected error occurred. Please try again later. If the problem persists, contact support.");
      }
    }
  };

  // ======================
  // Sign Up Submit
  // ======================
  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    const signupData = {
      full_name: signupName,
      phone: signupPhone,
      email: signupEmail,
      password: signupPassword,
      employerFlag: employerFlag,
    };

    try {
      await axios.post("http://localhost:4000/signup", signupData);
      setMessage("Sign up successful! Please log in.");
      navigate("/login");
    } catch (error) {
      if (error.response && error.response.status === 409) {
        setError(error.response.data.error);
      } else {
        setError('An unexpected error occurred. Please try again later.');
      }
    }
  };

  // ======================
  // Google OAuth
  // ======================
  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      const response = await axios.post("http://localhost:4000/auth/google", {
        token: credentialResponse.credential,
      });
      setToken(response.data.token);
      setEmployerFlag(response.data.isEmployer);
      navigate("/profile");
    } catch (error) {
      console.error("Google login error:", error);
      setError("Google login failed. Please try again.");
    }
  };

  const handleGoogleError = () => {
    console.error("Google login failed");
    setError("Google login failed. Please try again.");
  };

  // ======================
  // JSX Return
  // ======================
  return (
    <div className="login-page">
      {error && <NotificationBanner message={error} type="error" onDismiss={() => setError(null)} />}
      {message && <NotificationBanner message={message} type="success" onDismiss={() => setMessage(null)} />}
      <div className="login-section">
        <div className="container-fluid">
          <div className="row no-gutters full-height justify-content-center">
            <div className="col-12 text-center align-self-center">
              <div className="login-section pb-5 pt-5 pt-sm-2 text-center">
                {/* Toggle Title */}
                <h6 className="mb-0 pb-3">
                  <span>Log In </span>
                  <span>Sign Up</span>
                </h6>

                {/* This single checkbox toggles the 3D card (front/back) */}
                <input
                  className="login-checkbox"
                  type="checkbox"
                  id="reg-log"
                  name="reg-log"
                />
                <label htmlFor="reg-log"></label>

                {/* 3D Card Container */}
                <div className="login-card-3d-wrap mx-auto">
                  <div className="login-card-3d-wrapper">
                    {/* =================== */}
                    {/* Card Front – Login */}
                    {/* =================== */}
                    <div className="login-card-front">
                      <div className="login-center-wrap">
                        <div className="login-section-content text-center">
                          <h4 className="mb-4 pb-3">Log In</h4>

                          {/* Login Form */}
                          <form onSubmit={handleLoginSubmit}>
                            {/* Radio Buttons for Login Method */}
                            <div className="login-form-group text-left">
                              <label>
                                <input
                                  type="radio"
                                  name="loginMethod"
                                  value="email"
                                  checked={loginMethod === "email"}
                                  onChange={(e) => setLoginMethod(e.target.value)}
                                />{" "}
                                Email Login
                              </label>
                              <label className="ml-3">
                                <input
                                  type="radio"
                                  name="loginMethod"
                                  value="phone"
                                  checked={loginMethod === "phone"}
                                  onChange={(e) => setLoginMethod(e.target.value)}
                                />{" "}
                                Phone Login
                              </label>
                            </div>

                            {/* Conditional Fields for Email or Phone */}
                            {loginMethod === "email" ? (
                              <>
                                <div className="login-form-group mt-2">
                                  <input
                                    type="email"
                                    className="login-form-input"
                                    placeholder="Email"
                                    value={loginEmail}
                                    onChange={(e) => setLoginEmail(e.target.value)}
                                    required
                                  />
                                  <i className="login-form-icon uil uil-at"></i>
                                </div>
                                <div className="login-form-group mt-2">
                                  <input
                                    type="password"
                                    className="login-form-input"
                                    placeholder="Password"
                                    value={loginPassword}
                                    onChange={(e) => setLoginPassword(e.target.value)}
                                    required
                                  />
                                  <i className="login-form-icon uil uil-lock-alt"></i>
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="login-form-group mt-2">
                                  <input
                                    type="tel"
                                    className="login-form-input"
                                    placeholder="Phone Number"
                                    value={loginPhone}
                                    onChange={(e) => setLoginPhone(e.target.value)}
                                    required
                                  />
                                  <i className="login-form-icon uil uil-phone"></i>
                                </div>
                                {!showVerification ? (
                                  <button
                                    type="button"
                                    className="login-btn mt-4"
                                    onClick={() =>
                                      handleSendVerificationCode(loginPhone, false)
                                    }
                                  >
                                    Get Code via Call
                                  </button>
                                ) : (
                                  <div className="login-form-group mt-2">
                                    <input
                                      type="text"
                                      className="login-form-input"
                                      placeholder="Verification Code"
                                      value={verificationCode}
                                      onChange={(e) => setVerificationCode(e.target.value)}
                                      required
                                    />
                                    <i className="login-form-icon uil uil-key-skeleton"></i>
                                  </div>
                                )}
                              </>
                            )}

                            {/* Login Button */}
                            <button type="submit" className="login-btn mt-4">
                              Login
                            </button>
                          </form>

                          {/* Google Login */}
                          <div className="mt-4">
                            <GoogleLogin
                              onSuccess={handleGoogleSuccess}
                              onError={handleGoogleError}
                              useOneTap
                            />
                          </div>

                          {/* Forgot Password Link */}
                          <p className="mb-0 mt-4 text-center">
                            <a href="#!" className="link">
                              Forgot your password?
                            </a>
                          </p>
                        </div>
                      </div>
                    </div>
                    {/* End Card Front */}

                    {/* =================== */}
                    {/* Card Back – Sign Up */}
                    {/* =================== */}
                    <div className="login-card-back">
                      <div className="login-center-wrap">
                        <div className="login-section-content text-center">
                          <h4 className="mb-3 pb-3">Sign Up</h4>

                          {/* Sign Up Form */}
                          <form onSubmit={handleSignupSubmit}>
                            {/* Employer Flag */}
                            <div className="login-form-group text-left">
                              <label>
                                <input
                                  type="checkbox"
                                  checked={employerFlag}
                                  onChange={(e) => setEmployerFlag(e.target.checked)}
                                />{" "}
                                Signup as an Employer
                              </label>
                            </div>

                            <div className="login-form-group mt-2">
                              <input
                                type="text"
                                className="login-form-input"
                                placeholder="Full Name"
                                value={signupName}
                                onChange={(e) => setSignupName(e.target.value)}
                                required
                              />
                              <i className="login-form-icon uil uil-user"></i>
                            </div>

                            <div className="login-form-group mt-2">
                              <input
                                type="tel"
                                className="login-form-input"
                                placeholder="Phone Number"
                                value={signupPhone}
                                onChange={(e) => setSignupPhone(e.target.value)}
                                required
                              />
                              <i className="login-form-icon uil uil-phone"></i>
                            </div>

                            {/* Verification Call Button / Input */}
                            {!showSignupVerification ? (
                              <button
                                type="button"
                                className="login-btn mt-2"
                                onClick={() =>
                                  handleSendVerificationCode(signupPhone, true)
                                }
                              >
                                Verify via Call
                              </button>
                            ) : (
                              <div className="login-form-group mt-2">
                                <input
                                  type="text"
                                  className="login-form-input"
                                  placeholder="Verification Code"
                                  value={signupVerificationCode}
                                  onChange={(e) =>
                                    setSignupVerificationCode(e.target.value)
                                  }
                                  required
                                />
                                <i className="login-form-icon uil uil-key-skeleton"></i>
                              </div>
                            )}

                            <div className="login-form-group mt-2">
                              <input
                                type="email"
                                className="login-form-input"
                                placeholder="Email"
                                value={signupEmail}
                                onChange={(e) => setSignupEmail(e.target.value)}
                                required
                              />
                              <i className="login-form-icon uil uil-at"></i>
                            </div>

                            <div className="login-form-group mt-2">
                              <input
                                type="password"
                                className="login-form-input"
                                placeholder="Password"
                                value={signupPassword}
                                onChange={(e) => setSignupPassword(e.target.value)}
                                required
                              />
                              <i className="login-form-icon uil uil-lock-alt"></i>
                            </div>

                            <button type="submit" className="login-btn mt-4">
                              Register
                            </button>
                          </form>
                        </div>
                      </div>
                    </div>
                    {/* End Card Back */}
                  </div>
                </div>
                {/* End 3D Card Container */}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
