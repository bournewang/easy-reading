import axios from 'axios';

// In development, use the proxy prefix
// In production, use the actual API URL
const getBaseUrl = () => {
  if (process.env.NODE_ENV === 'production') {
    return 'https://api.english-reader.com/api';
  }
  return '/api-proxy';
};

console.log(`Frontend API calls will use proxy prefix: ${getBaseUrl()}. ` +
            `Ensure next.config.js rewrites this to your target backend.`);

const apiClient = axios.create({
  // All client-side calls go to this relative path. 
  // e.g., http://localhost:3000/api-proxy/auth/login
  baseURL: getBaseUrl(), 
  withCredentials: true, // Important for sending cookies with proxied requests
  headers: {
    'Content-Type': 'application/json',
  },
});

// Optional: Request Interceptor (Example: for logging)
apiClient.interceptors.request.use(
  (config) => {
    // console.log(`Starting API Request: ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
    return config;
  },
  (error) => {
    console.error('API Request Interceptor Error:', error);
    return Promise.reject(error);
  }
);

// Optional: Response Interceptor (Example: for global error handling)
apiClient.interceptors.response.use(
  (response) => {
    // console.log(`Received API Response Status: ${response.status} for ${response.config.url}`);
    return response;
  },
  (error) => {
    const status = error.response?.status;
    const url = error.response?.config.url;
    const fullUrl = error.response?.config.baseURL ? `${error.response.config.baseURL}${url}` : url;
    console.error(`API Response Error Status: ${status} for ${fullUrl}`);
    console.error('API Response Error Data:', error.response?.data);

    if (status === 401) {
      console.warn('Received 401 Unauthorized response. Consider global logout or redirect.');
      // Example: window.location.href = '/login'; // or dispatch an event
    }
    return Promise.reject(error);
  }
);

export { apiClient as api };
