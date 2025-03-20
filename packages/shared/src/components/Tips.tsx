import React from 'react';

const Tips: React.FC = () => {
  return (
    <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
      <h3 className="text-lg font-semibold text-blue-800 mb-2">Tips</h3>
      <ul className="space-y-2 text-blue-700">
        <li className="flex items-center gap-2">
          <span>👆</span>
          <span>Click any word in the article to look it up</span>
        </li>
        <li className="flex items-center gap-2">
          <span>🔍</span>
          <span>Use the search box above to look up any word</span>
        </li>
        <li className="flex items-center gap-2">
          <span>🌟</span>
          <span>Clicked words are automatically saved to your word list</span>
        </li>
        <li className="flex items-center gap-2">
          <span>🔊</span>
          <span>Click the speaker icon to hear pronunciation</span>
        </li>
        <li className="flex items-center gap-2">
          <span>🌐</span>
          <span>Click the globe icon to translate paragraphs</span>
        </li>
      </ul>
    </div>
  );
};

export default Tips;