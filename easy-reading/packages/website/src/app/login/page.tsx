'use client';

import { AuthForm } from '@/components/auth/AuthForm';
// import { API_URLS } from '@/config/api';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '../../utils/api';

export default function LoginPage() {
  const { checkAuth } = useAuth();

  const handleLogin = async (data: any) => {
    console.log('Attempting login to:');
    const response = await api.post('/auth/login', data);

    if (response.status !== 200) {
      const error = response.data;
      throw new Error(error.message || 'Login failed');
    }

    // Update auth context after successful login
    await checkAuth();
    return response.data;
  };

  return <AuthForm mode="login" onSubmit={handleLogin} />;
} 