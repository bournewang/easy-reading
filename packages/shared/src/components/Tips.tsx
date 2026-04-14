import React from 'react';

const Tips: React.FC = () => {
  return (
    <div className="">
      <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Dictionary Tips</p>
        <h3 className="mt-1 text-base font-semibold text-slate-900">Select a word to get started</h3>
      </div>

      <div className="space-y-3 px-4 py-4 text-sm text-slate-600">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-sky-50 text-sky-600">
            👆
          </span>
          <p>Click any word in the article to open its meaning, pronunciation, and examples.</p>
        </div>

        <div className="flex items-start gap-3">
          <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
            🔍
          </span>
          <p>Use the search box above when you want to look up a word directly.</p>
        </div>

        <div className="flex items-start gap-3">
          <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            🌟
          </span>
          <p>Words you click are automatically added to your word list for later review.</p>
        </div>

        <div className="flex items-start gap-3">
          <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-amber-50 text-amber-600">
            🔊
          </span>
          <p>Use the speaker icon to hear pronunciation and example sentences.</p>
        </div>

        <div className="flex items-start gap-3">
          <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-violet-50 text-violet-600">
            🌐
          </span>
          <p>Translate paragraphs as you read when you need extra support with comprehension.</p>
        </div>
      </div>
    </div>
  );
};

export default Tips;
