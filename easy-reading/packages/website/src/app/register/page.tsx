'use client';

import { AuthForm } from '@/components/auth/AuthForm';
// import { API_URLS } from '@/config/api';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/utils/api';

export default function RegisterPage() {
  const { checkAuth } = useAuth();

  const handleRegister = async (data: any) => {
    // console.log('Attempting registration to:', API_URLS.register);
    const response = await api.post('/auth/register', data);

    if (response.status !== 200) {
      const error = response.data;
      throw new Error(error.message || 'Registration failed');
    }

    // Update auth context after successful registration
    await checkAuth();
    return response.data;
  };

  return <AuthForm mode="register" onSubmit={handleRegister} />;
} 