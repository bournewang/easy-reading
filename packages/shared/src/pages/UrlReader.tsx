'use client';

import React, { useState } from 'react';
import Reader from '../components/Reader';
import type { Article } from '../types/article';
import { useArticleExtractor } from '../hooks/useArticleExtractor';

interface UrlFormProps {
  url: string;
  onUrlChange: (url: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  loading: boolean;
  inline?: boolean;
}

const UrlForm: React.FC<UrlFormProps> = ({
  url,
  onUrlChange,
  onSubmit,
  loading,
  inline = false
}) => {
  const inputClasses = `flex-1 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none shadow-sm 
    ${inline ? 'p-2' : 'p-4 text-lg bg-white/50 backdrop-blur-sm border-gray-200'}`;
  
  const buttonClasses = `bg-blue-500 text-white rounded-lg hover:bg-blue-600 
    disabled:bg-blue-300 transition-all duration-200 font-medium
    shadow-sm hover:shadow-md hover:translate-y-[-1px] whitespace-nowrap 
    ${inline ? 'px-4 py-2' : 'px-8 py-4 text-lg'}`;

  const form = (
    <div className="flex gap-3 w-full">
      <input
        type="url"
        value={url}
        onChange={(e) => onUrlChange(e.target.value)}
        placeholder="Paste any article URL here..."
        className={inputClasses}
        required
      />
      <button
        type="submit"
        className={buttonClasses}
        disabled={loading || !url.trim()}
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <span className="inline-block animate-spin-slow">⏳</span>
            Loading...
          </span>
        ) : (
          'Read'
        )}
      </button>
    </div>
  );

  if (inline) {
    return (
      <form onSubmit={onSubmit} className="max-w-5xl mx-auto flex items-center justify-center gap-4">
        <h1 className="text-xl font-bold text-gray-800 whitespace-nowrap">English Reader</h1>
        <div className="flex flex-1 justify-center gap-2">{form}</div>
      </form>
    );
  }

  return (
    <div className="flex flex-col items-center gap-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-800 mb-3">English Reader</h1>
        <p className="text-gray-600 text-lg">Improve your English reading skills with any article</p>
      </div>
      <form onSubmit={onSubmit} className="w-full max-w-2xl">
        {form}
      </form>
    </div>
  );
};

const UrlReader: React.FC = () => {
  const [url, setUrl] = useState('');
  const [article, setArticle] = useState<Article | null>(null);
  const { extractArticle, loading, error } = useArticleExtractor();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    const data = await extractArticle(url);
    if (data) {
      setArticle(data);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      {/* URL Input Section */}
      <div className={`${!article ? 'min-h-screen flex items-center justify-center px-4' : 'bg-white shadow-sm border-b'}`}>
        <div className={`w-full ${!article ? 'max-w-4xl mx-auto' : 'container mx-auto px-4 py-4'}`}>
          <UrlForm
            url={url}
            onUrlChange={setUrl}
            onSubmit={handleSubmit}
            loading={loading}
            inline={!!article}
          />

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg 
                          text-red-600 max-w-2xl mx-auto">
              {error}
            </div>
          )}
        </div>
      </div>

      {/* Reader Section */}
      {article && (
        <div className="mx-auto px-4 py-6">
          <Reader article={article} />
        </div>
      )}
    </div>
  );
};

export default UrlReader;
