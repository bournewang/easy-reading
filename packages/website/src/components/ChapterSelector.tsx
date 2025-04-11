import React, { useState } from 'react';

interface ChapterSelectorProps {
  currentChapter: number;
  totalChapters: number;
  onChapterChange: (index: number) => void;
}

export const MOBILE_SELECTOR_HEIGHT = '56px';  // height for mobile view
export const DESKTOP_SELECTOR_HEIGHT = '144px'; // height for desktop view with grid (32px grid + 44px nav + 0.5px progress)

export const ChapterSelector: React.FC<ChapterSelectorProps> = ({
  currentChapter,
  totalChapters,
  onChapterChange,
}) => {
  const [showChapterGrid, setShowChapterGrid] = useState(false);

  return (
    <>
      {/* Mobile Chapter Selector - Only Arrows */}
      <div 
        className="sm:hidden w-screen fixed bottom-0 left-0 w-full bg-white/80 backdrop-blur-sm border-t border-gray-100"
        style={{ height: MOBILE_SELECTOR_HEIGHT }}
      >
        <div className="flex justify-between items-center h-full px-3">
          <button
            onClick={() => onChapterChange(Math.max(0, currentChapter - 1))}
            disabled={currentChapter === 0}
            className="w-10 h-10 flex items-center justify-center bg-white rounded-full shadow-md transition-all duration-200
              disabled:opacity-50 disabled:cursor-not-allowed
              enabled:hover:bg-gray-50 enabled:active:scale-95"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <div className="bg-white px-3 py-1.5 rounded-full shadow-md text-sm font-medium">
            {currentChapter + 1} / {totalChapters}
          </div>

          <button
            onClick={() => onChapterChange(Math.min(totalChapters - 1, currentChapter + 1))}
            disabled={currentChapter === totalChapters - 1}
            className="w-10 h-10 flex items-center justify-center bg-white rounded-full shadow-md transition-all duration-200
              disabled:opacity-50 disabled:cursor-not-allowed
              enabled:hover:bg-gray-50 enabled:active:scale-95"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Desktop Chapter Selector */}
      <div 
        className="hidden sm:block fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 shadow-lg"
        style={{ height: DESKTOP_SELECTOR_HEIGHT }}
      >
        {/* Progress Bar */}
        <div className="h-0.5 w-full bg-gray-100">
          <div 
            className="h-full bg-blue-500 transition-all duration-300"
            style={{ width: `${((currentChapter + 1) / totalChapters) * 100}%` }}
          />
        </div>

        {/* Navigation Controls */}
        <div className="flex items-center justify-between px-4 py-2 text-sm border-b border-gray-100">
          <button
            onClick={() => onChapterChange(Math.max(0, currentChapter - 1))}
            disabled={currentChapter === 0}
            className="px-3 py-1.5 text-sm font-medium rounded transition-all duration-200
              disabled:opacity-50 disabled:cursor-not-allowed
              enabled:hover:bg-blue-50 enabled:text-blue-600 enabled:hover:text-blue-700"
          >
            ← Previous
          </button>

          <span className="text-sm text-gray-600">
            Chapter {currentChapter + 1} of {totalChapters}
          </span>

          <button
            onClick={() => onChapterChange(Math.min(totalChapters - 1, currentChapter + 1))}
            disabled={currentChapter === totalChapters - 1}
            className="px-3 py-1.5 text-sm font-medium rounded transition-all duration-200
              disabled:opacity-50 disabled:cursor-not-allowed
              enabled:hover:bg-blue-50 enabled:text-blue-600 enabled:hover:text-blue-700"
          >
            Next →
          </button>
        </div>

        {/* Chapter Grid */}
        <div className="max-h-32 overflow-y-auto bg-white/80 backdrop-blur-sm">
          <div className="grid grid-cols-6 md:grid-cols-8 lg:grid-cols-12 gap-1 p-2">
            {Array.from({ length: totalChapters }, (_, index) => (
              <button
                key={`chapter-${index}`}
                onClick={() => onChapterChange(index)}
                className={`px-2 py-1 text-xs rounded transition-all duration-200 ${
                  currentChapter === index
                    ? 'bg-blue-100 text-blue-700 font-medium'
                    : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
                }`}
              >
                Ch.{index + 1}
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};