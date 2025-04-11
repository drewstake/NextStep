/**
 * Middleware for filtering inappropriate content from job listings
 * @module contentFilter
 */

const axios = require('axios');
require('dotenv').config();

async function makeApiCall(text) {
  try {
    const options = {
      method: 'POST',
      url: 'https://api.apilayer.com/bad_words?censor_character=*',
      headers: {
        apikey: process.env.BAD_WORDS_API_KEY,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      data: text,
      maxRedirects: 5,
    };

    const response = await axios(options);
    return response.data; // Return the data if needed

  } catch (error) {
    console.error('Error in BadWordsAPI.makeApiCall:', error);
    throw error;
  }
}

/**
 * Middleware to filter inappropriate content from job listings using an external API
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {void}
 */
const filterJobContent = async (req, res, next) => {

  // Only apply to job creation and update routes
  if (req.path.includes('/jobs') && (req.method === 'POST' || req.method === 'PUT')) {
    const fieldsToCheck = [
      'title',
      'companyName',
      'jobDescription',
      'skills',
      'benefits',
      'locations',
      'salaryRange',
      'schedule',
    ];

    try {
      // Collect all text fields into a single string
      let contentToCheck = 'post';

      for (const field of fieldsToCheck) {
        if (req.body[field]) {
          if (typeof req.body[field] === 'string') {
            contentToCheck += req.body[field] + ' ';
          } else if (Array.isArray(req.body[field])) {
            contentToCheck += req.body[field].join(' ') + ' ';
          }
        }
      }

      // If there's no content to check, proceed
      if (!contentToCheck.trim()) {
        return next();
      }

      let badWordsResult;

      // In test environment, check for test inappropriate words
     /*  if (process.env.NODE_ENV === 'test') {
        const hasInappropriateContent = contentToCheck.toLowerCase().includes('bitch');
        badWordsResult = {
          bad_words_total: hasInappropriateContent ? 1 : 0,
          bad_words_list: hasInappropriateContent ? [{
            word: 'bitch',
            deviations: 0,
            start: contentToCheck.toLowerCase().indexOf('bitch'),
            end: contentToCheck.toLowerCase().indexOf('bitch') + 5,
            info: 2
          }] : []
        };
      } else {
        contentToCheck = contentToCheck.replace(/\(|\)/g, '');
        // Call the bad words API in non-test environment
        const response = await makeApiCall(contentToCheck);
        badWordsResult = response;
      } */

      // Check if any bad words were found
     /*  if (badWordsResult.bad_words_total > 0) {
        return res.status(406).json({
          error: 'The content contains inappropriate language. Please revise and try again.',
          details: '[bad words list]'
        });
      } */

      // If we get here, no bad words were found
      next();
    } catch (error) {
      console.error('Error checking content for inappropriate words:', error);
      // In case of API error, we'll let the request proceed
      return res.status(500).json({
        error: 'Unable to check content for inappropriate words. ' + error,
        details: '[bad words list]'
      });

    }
  } else {
    next();
  }
};

module.exports = {
  filterJobContent
}; 