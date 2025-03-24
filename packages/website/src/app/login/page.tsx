'use client';

import { AuthForm } from '@/components/auth/AuthForm';
import { API_URLS } from '@/config/api';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginPage() {
  const { checkAuth } = useAuth();

  const handleLogin = async (data: any) => {
    console.log('Attempting login to:', API_URLS.login);
    const response = await fetch(API_URLS.login, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Login failed');
    }

    // Update auth context after successful login
    await checkAuth();
    return response.json();
  };

  return <AuthForm mode="login" onSubmit={handleLogin} />;
} 