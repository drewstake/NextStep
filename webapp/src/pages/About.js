// File: /src/pages/About.js
import React from 'react';
import { FaBullseye, FaRocket, FaShieldAlt, FaChartLine } from 'react-icons/fa';
import '../styles/About.css';

const About = () => {
  return (
    <div className="about-container">
      <header className="about-header">
        <h1 className="about-header__title">About NextStep</h1>
        <p className="about-header__subtitle">Your next career move, simplified.</p>
      </header>

      <section className="about-section">
        <div className="about-section__icon-container">
          <FaBullseye className="about-section__icon" />
        </div>
        <h2 className="about-section__title">📌 Purpose</h2>
        <p className="about-section__text">
          NextStep is designed to make job searching easier and more interactive. With a <strong>swipe-based interface</strong>, users can browse jobs effortlessly and apply with just one click.
        </p>
      </section>

      <section className="about-section">
        <div className="about-section__icon-container">
          <FaRocket className="about-section__icon" />
        </div>
        <h2 className="about-section__title">🚀 Key Features</h2>
        <ul className="about-section__list">
          <li className="about-section__list-item">🔹 Swipe-based job browsing for an engaging experience.</li>
          <li className="about-section__list-item">🔹 AI-powered <strong>personalized job recommendations</strong>.</li>
          <li className="about-section__list-item">🔹 One-Click Apply for faster job applications.</li>
          <li className="about-section__list-item">🔹 Application tracking to manage job searches efficiently.</li>
        </ul>
      </section>

      <section className="about-section">
        <div className="about-section__icon-container">
          <FaShieldAlt className="about-section__icon" />
        </div>
        <h2 className="about-section__title">🔒 Data Privacy & Security</h2>
        <p className="about-section__text">
          We take privacy seriously. Your data is <strong>securely stored and encrypted</strong> to ensure a safe job-hunting experience.
        </p>
      </section>

      <section className="about-section">
        <div className="about-section__icon-container">
          <FaChartLine className="about-section__icon" />
        </div>
        <h2 className="about-section__title">📊 Optimized for Success</h2>
        <p className="about-section__text">
          NextStep helps users <strong>track and analyze</strong> job applications with built-in insights, so they can refine their job search strategy.
        </p>
      </section>
    </div>
  );
};

export default About;
