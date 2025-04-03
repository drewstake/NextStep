import React from 'react';
import ContentFilterTester from '../components/ContentFilterTester';
import '../styles/ContentFilterTester.css';

/**
 * Page for testing the content filter
 * @returns {JSX.Element} The test page
 */
const ContentFilterTest = () => {
  return (
    <div className="content-filter-test-page">
      <h1>Content Filter Testing</h1>
      <p>
        This page allows you to test the content filter to ensure it's working correctly.
        Use it to verify that the filter correctly identifies inappropriate content while
        allowing legitimate content to pass through.
      </p>
      
      <ContentFilterTester />
    </div>
  );
};

export default ContentFilterTest; 