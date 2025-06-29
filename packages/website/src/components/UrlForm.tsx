'use client';

import React from 'react';

interface UrlFormProps {
  url: string;
  onUrlChange: (url: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  loading: boolean;
}

export const UrlForm: React.FC<UrlFormProps> = ({
  url,
  onUrlChange,
  onSubmit,
  loading
}) => { 
  return (
    <div className="flex flex-col items-center gap-4">
      {/* <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-800 mb-3">English Reader</h1>
        <p className="text-gray-600 text-lg">Improve your English reading skills with any article</p>
      </div> */}
      <form onSubmit={onSubmit} className="w-full">
        <div className="flex flex-col md:flex-row gap-2 w-full">
          <input
            type="url"
            value={url}
            onChange={(e) => onUrlChange(e.target.value)}
            placeholder="Paste any article URL here..."
            className="flex-1 border rounded-lg p-2 text-sm bg-white/50 backdrop-blur-sm border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none shadow-sm"
            required
          />
          <button
            type="submit"
            className="bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-blue-300 transition-all duration-200 font-medium shadow-sm hover:shadow-md hover:translate-y-[-1px] px-4 py-2 text-sm whitespace-nowrap"
            disabled={loading || !url.trim()}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="inline-block animate-spin-slow">⏳</span>
                Loading...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                Read
                {/* replace with a book emoji */}
                <span className="text-lg">📖</span>
              </span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};