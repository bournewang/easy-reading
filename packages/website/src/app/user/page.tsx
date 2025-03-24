'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

export default function UserCenterPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [readArticles, setReadArticles] = useState<string[]>([]);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    // Get read articles from localStorage
    const articles = JSON.parse(localStorage.getItem('readArticles') || '[]');
    setReadArticles(articles);
  }, [user, router]);

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  if (!user) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-2xl font-bold mb-4">User Center</h1>
          
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-2">Profile Information</h2>
            <div className="space-y-2">
              <p><span className="font-medium">Username:</span> {user.username}</p>
              <p><span className="font-medium">Full Name:</span> {user.fullName}</p>
            </div>
          </div>

          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-2">Reading History</h2>
            <p className="text-gray-600">
              You have read {readArticles.length} articles
            </p>
          </div>

          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
} 