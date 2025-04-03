import React, { useState } from 'react';
import { testContentFilter } from '../utils/contentFilter';
import axiosInstance from '../utils/axiosConfig';
import '../styles/ContentFilterTester.css';

/**
 * Component for testing the content filter
 * @returns {JSX.Element} The test component
 */
const ContentFilterTester = () => {
  const [text, setText] = useState('');
  const [clientResults, setClientResults] = useState(null);
  const [serverResults, setServerResults] = useState(null);
  const [error, setError] = useState(null);

  const handleTest = () => {
    // Test client-side filter
    const clientTest = testContentFilter(text);
    setClientResults(clientTest);

    // Test server-side filter
    axiosInstance.post('/test-content-filter', { text })
      .then(response => {
        setServerResults(response.data);
        setError(null);
      })
      .catch(err => {
        console.error('Error testing server filter:', err);
        setError('Failed to test server filter. Please try again.');
      });
  };

  return (
    <div className="content-filter-tester">
      <h2>Content Filter Tester</h2>
      <p>Use this tool to test if the content filter is working correctly.</p>
      
      <div className="form-group">
        <label htmlFor="test-text">Text to test:</label>
        <textarea
          id="test-text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Enter text to test..."
          rows={4}
        />
        <button onClick={handleTest}>Test Filter</button>
      </div>
      
      {error && <div className="error">{error}</div>}
      
      {clientResults && (
        <div className="results client-results">
          <h3>Client-side Results</h3>
          <p>Text: "{clientResults.text}"</p>
          <p>Contains inappropriate content: {clientResults.containsInappropriate ? 'Yes' : 'No'}</p>
          {clientResults.matchedWords.length > 0 && (
            <div>
              <p>Matched words:</p>
              <ul>
                {clientResults.matchedWords.map((word, index) => (
                  <li key={index}>{word}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
      
      {serverResults && (
        <div className="results server-results">
          <h3>Server-side Results</h3>
          <p>Text: "{serverResults.text}"</p>
          <p>Contains inappropriate content: {serverResults.containsInappropriate ? 'Yes' : 'No'}</p>
          {serverResults.matchedWords.length > 0 && (
            <div>
              <p>Matched words:</p>
              <ul>
                {serverResults.matchedWords.map((word, index) => (
                  <li key={index}>{word}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
      
      <div className="examples">
        <h3>Example Tests</h3>
        <ul>
          <li>
            <button onClick={() => setText('This is a class')}>
              "This is a class" (should pass)
            </button>
          </li>
          <li>
            <button onClick={() => setText('This is an ass')}>
              "This is an ass" (should fail)
            </button>
          </li>
          <li>
            <button onClick={() => setText('This is a classy person')}>
              "This is a classy person" (should pass)
            </button>
          </li>
          <li>
            <button onClick={() => setText('This is a fucking job')}>
              "This is a fucking job" (should fail)
            </button>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default ContentFilterTester; 