import React from 'react';

const Tips: React.FC = () => {
  return (
    <div>
      <div className="border-b border-black/6 px-5 py-4">
        <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[#0071e3]">Dictionary Tips</p>
        <h3 className="mt-1 text-[21px] font-semibold tracking-[-0.02em] text-[#1d1d1f]">Select a word to get started</h3>
      </div>

      <div className="space-y-3 px-5 py-5 text-[14px] leading-[1.5] tracking-[-0.22px] text-black/64">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-white text-[#0066cc] shadow-[0_8px_24px_rgba(0,0,0,0.06)]">
            👆
          </span>
          <p>Click any word in the article to open its meaning, pronunciation, and examples.</p>
        </div>

        <div className="flex items-start gap-3">
          <span className="mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-white text-[#0066cc] shadow-[0_8px_24px_rgba(0,0,0,0.06)]">
            🔍
          </span>
          <p>Use the search box above when you want to look up a word directly.</p>
        </div>

        <div className="flex items-start gap-3">
          <span className="mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-white text-[#0066cc] shadow-[0_8px_24px_rgba(0,0,0,0.06)]">
            🌟
          </span>
          <p>Words you click are automatically added to your word list for later review.</p>
        </div>

        <div className="flex items-start gap-3">
          <span className="mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-white text-[#0066cc] shadow-[0_8px_24px_rgba(0,0,0,0.06)]">
            🔊
          </span>
          <p>Use the speaker icon to hear pronunciation and example sentences.</p>
        </div>

        <div className="flex items-start gap-3">
          <span className="mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-white text-[#0066cc] shadow-[0_8px_24px_rgba(0,0,0,0.06)]">
            🌐
          </span>
          <p>Translate paragraphs as you read when you need extra support with comprehension.</p>
        </div>
      </div>
    </div>
  );
};

export default Tips;
