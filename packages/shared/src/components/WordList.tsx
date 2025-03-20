import React, { useState, useEffect } from 'react';
import { useWordList } from '../hooks/useWordList';
import Dictionary from './Dictionary';
import Paginator from './Paginator';
import '../styles/tailwind.css';

function WordList() {
  const { words, removeWord } = useWordList();
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'cloud'>('grid');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const wordArray = Array.from(words);
  const totalPages = Math.ceil(wordArray.length / itemsPerPage);

  // Update current page when deleting items makes the current page empty
  useEffect(() => {
    if (currentPage > 1 && currentPage > totalPages) {
      setCurrentPage(Math.max(1, totalPages));
    }
  }, [words, currentPage, totalPages]);

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentWords = wordArray.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    setSelectedWord(null);
  };

  const renderGridView = () => (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {currentWords.map(word => (
          <div
            key={word}
            className="group flex items-center justify-between p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-200 border-t border-l border-r border-gray-100"
          >
            <button
              className="flex-1 text-left font-medium text-gray-700 hover:text-indigo-600 transition-colors"
              onClick={() => setSelectedWord(word)}
            >
              {word}
            </button>
            <button
              onClick={() => removeWord(word)}
              className="ml-1 opacity-0 group-hover:opacity-100 w-4 h-4 inline-flex items-center justify-center rounded-full bg-red-100 text-red-600 text-xs hover:bg-red-200 hover:text-red-700 transition-all"
              title="Remove word"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
      {totalPages > 1 && (
        <Paginator
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
        />
      )}
    </>
  );

  const renderCloudView = () => (
    <div className="min-h-[300px] flex flex-wrap gap-3 justify-center items-center p-4">
      {Array.from(words).map(word => {
        const fontSize = Math.random() * (1.5 - 0.8) + 0.8;
        const rotation = Math.random() * 20 - 10;
        
        return (
          <button
            key={word}
            className="group inline-flex items-center"
            style={{
              transform: `rotate(${rotation}deg)`,
              fontSize: `${fontSize}rem`
            }}
            onClick={() => setSelectedWord(word)}
          >
            <span className={`px-3 py-1 rounded-full transition-colors duration-200 ${
              selectedWord === word 
                ? 'bg-indigo-100 text-indigo-700' 
                : 'bg-white/80 hover:bg-indigo-50 text-gray-700 hover:text-indigo-600'
            }`}>
              {word}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                removeWord(word);
              }}
              className="ml-1 opacity-0 group-hover:opacity-100 w-4 h-4 inline-flex items-center justify-center rounded-full bg-red-100 text-red-600 text-xs hover:bg-red-200 hover:text-red-700 transition-all"
              title="Remove word"
            >
              ✕
            </button>
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50">
      <div className="container mx-auto p-2 max-w-5xl">
        <header className="text-center py-2">
          <h1 className="text-3xl font-bold text-indigo-900 mb-2">My Vocabulary Journal</h1>
          <p className="text-gray-600">Track and review your learning progress</p>
        </header>
        
        <div className="flex flex-col md:flex-row gap-4 relative min-h-screen w-full">
          <div className="flex-1 mb-4 md:mb-0">
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-xl">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-800">
                  Saved Words <span className="text-sm text-gray-500">({words.size})</span>
                </h2>
                <div className="flex gap-2 hidden">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded-lg transition-colors ${
                      viewMode === 'grid' 
                        ? 'bg-indigo-100 text-indigo-600' 
                        : 'hover:bg-gray-100 text-gray-600'
                    }`}
                    title="Grid view"
                  >
                    ⊞
                  </button>
                  <button
                    onClick={() => setViewMode('cloud')}
                    className={`p-2 rounded-lg transition-colors ${
                      viewMode === 'cloud' 
                        ? 'bg-indigo-100 text-indigo-600' 
                        : 'hover:bg-gray-100 text-gray-600'
                    }`}
                    title="Cloud view"
                  >
                    ☁️
                  </button>
                </div>
              </div>
              
              {words.size === 0 ? (
                <div className="text-center py-12">
                  <div className="text-4xl mb-4">📚</div>
                  <p className="text-gray-500">
                    Your word list is empty.
                    <br />
                    <span className="text-sm">Click on words while reading to add them to your list.</span>
                  </p>
                </div>
              ) : viewMode === 'grid' ? (
                renderGridView()
              ) : (
                renderCloudView()
              )}
            </div>
          </div>

          {/* Dictionary panel */}
          <div className={`fixed md:sticky bottom-0 md:top-0 left-0 right-0 md:w-1/2 h-[200px] md:h-screen bg-white md:bg-slate-50 overflow-y-auto border-t border-slate-200 md:border-l md:border-t-0 shadow-lg md:shadow-none z-50 ${!selectedWord ? 'hidden md:block' : ''}`}>
              <Dictionary selectedWord={selectedWord} />
            </div>
        </div>
      </div>
    </div>
  );
};

export default WordList;