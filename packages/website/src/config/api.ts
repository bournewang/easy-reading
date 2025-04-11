const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export const API_URLS = {
  login: `${API_BASE_URL}/api/auth/login`,
  register: `${API_BASE_URL}/api/auth/register`,
  me: `${API_BASE_URL}/api/auth/me`,
  logout: `${API_BASE_URL}/api/auth/logout`,
  payment: `${API_BASE_URL}/api/payment`,
} as const;

// Log the API URLs in development
if (process.env.NODE_ENV === 'development') {
  console.log('API URLs:', API_URLS);
} 