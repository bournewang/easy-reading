'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function Navigation() {
  const pathname = usePathname();
  const { user } = useAuth();

  const isActive = (path: string) => pathname === path;

  return (
    <nav className="bg-white/80 backdrop-blur-md border-b border-gray-200 w-full top-0 z-50">
      <div className="max-w-[1440px] mx-auto px-6">
        <div className="flex h-16 items-center justify-between">
          <Link 
            href="/" 
            className="px-4 py-2 text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent hover:from-blue-500 hover:to-indigo-500 transition-all"
          >
            English Reader
          </Link>
          
          <div className="flex items-center gap-6">
            <Link
              href="/wordlist"
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all
                ${isActive('/wordlist')
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50/50'
                }`}
            >
              Word List
            </Link>

            {user && (
              <Link
                href="/articles"
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all
                  ${isActive('/articles')
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50/50'
                  }`}
              >
                History
              </Link>
            )}

            {user ? (
              <Link
                href="/user"
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all
                  ${isActive('/user')
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50/50'
                  }`}
              >
                {user.fullName || user.username}
              </Link>
            ) : (
              <Link
                href="/login"
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all
                  ${isActive('/login')
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50/50'
                  }`}
              >
                Login
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}