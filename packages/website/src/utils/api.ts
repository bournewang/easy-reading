import axios from 'axios';
import { clearStoredAuthToken, getStoredAuthToken } from './auth-token';

const getBaseUrl = () => {
  const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '');

  if (configuredApiUrl) {
    return `${configuredApiUrl}/api`;
  }

  return '/api-proxy';
};

console.log(`Frontend API calls will use base URL: ${getBaseUrl()}.`);

const apiClient = axios.create({
  baseURL: getBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
});

// Optional: Request Interceptor (Example: for logging)
apiClient.interceptors.request.use(
  (config) => {
    const token = getStoredAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    } else if (config.headers?.Authorization) {
      delete config.headers.Authorization;
    }
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
      clearStoredAuthToken();
      console.warn('Received 401 Unauthorized response. Consider global logout or redirect.');
      // Example: window.location.href = '/login'; // or dispatch an event
    }
    return Promise.reject(error);
  }
);

export { apiClient as api };
