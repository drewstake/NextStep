import React, { useEffect } from 'react';
import '../styles/NotificationBanner.css';

const NotificationBanner = ({ message, type = 'error', onDismiss, duration = 7000 }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onDismiss]);

  return (
    <div className={`notification-banner ${type}`}>
      <div className="notification-banner-content">
        <span className="notification-banner-message">{message}</span>
        <button className="notification-banner-dismiss" onClick={onDismiss}>×</button>
      </div>
    </div>
  );
};

export default NotificationBanner; 