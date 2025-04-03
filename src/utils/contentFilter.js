/**
 * Utility for filtering inappropriate content
 * @module contentFilter
 */

/**
 * List of inappropriate words to filter out
 * @type {string[]}
 */
const inappropriateWords = [
  // Profanity and offensive language
  'fuck', 'shit', 'ass', 'bitch', 'cunt', 'dick', 'pussy', 'cock', 'whore', 'slut',
  // Racial slurs and discriminatory terms
  'nigger', 'nigga', 'chink', 'gook', 'kike', 'spic', 'wetback', 'beaner', 'towelhead',
  // Add more inappropriate words as needed
];

/**
 * Checks if a string contains an inappropriate word as a whole word
 * @param {string} text - The text to check
 * @param {string} word - The inappropriate word to look for
 * @returns {boolean} - True if the word is found as a whole word
 */
const containsWord = (text, word) => {
  if (!text || !word) return false;
  
  // Create a regex that matches the word as a whole word (with word boundaries)
  const regex = new RegExp(`\\b${word}\\b`, 'i');
  return regex.test(text);
};

/**
 * Checks if a string contains inappropriate content
 * @param {string} text - The text to check
 * @returns {boolean} - True if inappropriate content is found
 */
export const containsInappropriateContent = (text) => {
  if (!text) return false;
  
  for (const word of inappropriateWords) {
    if (containsWord(text, word)) {
      return true;
    }
  }
  
  return false;
};

/**
 * Test function to verify the content filter is working correctly
 * @param {string} text - The text to test
 * @returns {Object} - Object with test results
 */
export const testContentFilter = (text) => {
  const results = {
    text,
    containsInappropriate: false,
    matchedWords: []
  };
  
  for (const word of inappropriateWords) {
    if (containsWord(text, word)) {
      results.containsInappropriate = true;
      results.matchedWords.push(word);
    }
  }
  
  return results;
};

/**
 * Validates a job form object for inappropriate content
 * @param {Object} formData - The job form data
 * @returns {Object} - Object with validation result and error message
 */
export const validateJobContent = (formData) => {
  const stringFields = [
    { name: 'title', label: 'Title' },
    { name: 'companyName', label: 'Company Name' },
    { name: 'companyWebsite', label: 'Company Website' },
    { name: 'salaryRange', label: 'Salary Range' },
    { name: 'jobDescription', label: 'Job Description' },
    { name: 'schedule', label: 'Schedule' }
  ];

  // Check string fields
  for (const field of stringFields) {
    if (formData[field.name] && containsInappropriateContent(formData[field.name])) {
      return {
        isValid: false,
        error: `The ${field.label} contains inappropriate content. Please revise.`
      };
    }
  }

  // Check array fields
  const arrayFields = [
    { name: 'benefits', label: 'Benefits' },
    { name: 'locations', label: 'Locations' },
    { name: 'skills', label: 'Skills' }
  ];

  for (const field of arrayFields) {
    if (formData[field.name]) {
      const arrayValue = Array.isArray(formData[field.name]) 
        ? formData[field.name] 
        : [formData[field.name]];
      
      for (const item of arrayValue) {
        if (typeof item === 'string' && containsInappropriateContent(item)) {
          return {
            isValid: false,
            error: `The ${field.label} contains inappropriate content. Please revise.`
          };
        }
      }
    }
  }

  return { isValid: true, error: null };
}; 