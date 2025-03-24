'use client';

import { AuthForm } from '@/components/auth/AuthForm';
import { API_URLS } from '@/config/api';
import { useAuth } from '@/contexts/AuthContext';

export default function RegisterPage() {
  const { checkAuth } = useAuth();

  const handleRegister = async (data: any) => {
    console.log('Attempting registration to:', API_URLS.register);
    const response = await fetch(API_URLS.register, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Registration failed');
    }

    // Update auth context after successful registration
    await checkAuth();
    return response.json();
  };

  return <AuthForm mode="register" onSubmit={handleRegister} />;
} 