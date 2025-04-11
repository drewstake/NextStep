/**
 * Company model schema definition
 * @module models/Company
 */

/**
 * Company schema structure
 * @type {Object}
 */
const companySchema = {
  userId: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  industry: {
    type: String,
    required: true
  },
  size: {
    type: String,
    required: true
  },
  location: {
    type: String,
    required: true
  },
  website: {
    type: String
  },
  logoUrl: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
};

module.exports = companySchema; 