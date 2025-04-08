// API Configuration
import { Platform } from 'react-native';

const IS_DEV = process.env.NODE_ENV === 'development';

export const API_BASE_URL = IS_DEV 
  ? Platform.select({
      android: 'http://10.0.2.2:4000',
      ios: 'http://192.168.1.100:4000', // Replace with your computer's IP
      default: 'http://localhost:4000'
    })
  : 'https://your-production-api.com'; // Replace with your production API URL

// Other configuration constants
export const APP_NAME = 'NextStep';
export const APP_VERSION = '1.0.0';
export const GOOGLE_CLIENT_ID = '681971948277-sghsen822vlul0c98ffs8mqrnn4u8god.apps.googleusercontent.com';