/**
 * Middleware for filtering inappropriate content from job listings
 * @module contentFilter
 */

/**
 * List of inappropriate words to filter out
 * @type {string[]}
 */
const inappropriateWords = [
  'fuck', 'shit', 'ass', 'bitch', 'cunt', 'dick', 'pussy', 'cock', 'whore', 'slut',
  'nigger', 'nigga', 'chink', 'gook', 'kike', 'spic', 'wetback', 'beaner', 'towelhead',
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
 * Middleware to filter inappropriate content from job listings
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {void}
 */
const filterJobContent = (req, res, next) => {
  // Only apply to job creation and update routes
  if (req.path.includes('/jobs') && (req.method === 'POST' || req.method === 'PUT')) {
    const fieldsToCheck = [
      'title',
      'companyName',
      'companyWebsite',
      'salaryRange',
      'jobDescription',
      'schedule'
    ];

    // Check string fields
    for (const field of fieldsToCheck) {
      if (req.body[field] && typeof req.body[field] === 'string') {
        for (const word of inappropriateWords) {
          if (containsWord(req.body[field], word)) {
            return res.status(406).json({ 
              error: `The ${field} contains inappropriate content. Please revise and try again.` 
            });
          }
        }
      }
    }

    // Check array fields
    const arrayFieldsToCheck = ['benefits', 'locations', 'skills'];
    for (const field of arrayFieldsToCheck) {
      if (req.body[field]) {
        const arrayValue = Array.isArray(req.body[field]) 
          ? req.body[field] 
          : [req.body[field]];
        
        for (const item of arrayValue) {
          if (typeof item === 'string') {
            for (const word of inappropriateWords) {
              if (containsWord(item, word)) {
                return res.status(406).json({ 
                  error: `The ${field} contains inappropriate content. Please revise and try again.` 
                });
              }
            }
          }
        }
      }
    }
  }
  
  next();
};

/**
 * Test function to verify the content filter is working correctly
 * @param {string} text - The text to test
 * @returns {Object} - Object with test results
 */
/* const testContentFilter = (text) => {
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
 */
module.exports = {
  filterJobContent
}; 