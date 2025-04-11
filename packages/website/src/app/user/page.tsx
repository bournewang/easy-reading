'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

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

  const subscriptionStatus = user.subscriptionTier || 'free';
  const subscriptionExpires = user.subscriptionExpires ? new Date(user.subscriptionExpires) : null;
  const isExpired = subscriptionExpires && subscriptionExpires < new Date();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-2xl font-bold mb-4">User Center</h1>
          
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-2">Profile Information</h2>
            <div className="space-y-2">
              <p><span className="font-medium">Username:</span> {user.username}</p>
              <p><span className="font-medium">Full Name:</span> {user.fullName || 'Not set'}</p>
            </div>
          </div>

          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-2">Subscription Status</h2>
            <div className="space-y-2">
              <p>
                <span className="font-medium">Plan:</span>{' '}
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  subscriptionStatus === 'free' ? 'bg-gray-100 text-gray-800' :
                  subscriptionStatus === 'pro' ? 'bg-blue-100 text-blue-800' :
                  'bg-purple-100 text-purple-800'
                }`}>
                  {subscriptionStatus.charAt(0).toUpperCase() + subscriptionStatus.slice(1)}
                </span>
              </p>
              {subscriptionExpires && (
                <p>
                  <span className="font-medium">Expires:</span>{' '}
                  <span className={isExpired ? 'text-red-600' : 'text-green-600'}>
                    {subscriptionExpires.toLocaleDateString()}
                    {isExpired && ' (Expired)'}
                  </span>
                </p>
              )}
              {subscriptionStatus === 'free' && (
                <Link
                  href="/pricing"
                  className="inline-block mt-2 px-4 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
                >
                  Upgrade Plan
                </Link>
              )}
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