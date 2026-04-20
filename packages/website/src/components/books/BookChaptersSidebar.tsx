type BookChaptersSidebarProps = {
  bookTitle: string;
  levelLabel: string;
  currentChapter: number;
  totalChapters: number;
  onChapterChange: (index: number) => void;
  loading?: boolean;
};

export default function BookChaptersSidebar({
  bookTitle,
  levelLabel,
  currentChapter,
  totalChapters,
  onChapterChange,
  loading = false,
}: BookChaptersSidebarProps) {
  const progress = Math.round(((currentChapter + 1) / totalChapters) * 100);

  return (
    <aside className="hidden h-full min-h-0 xl:block">
      <div className="flex h-full min-h-0 flex-col rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="shrink-0 border-b border-slate-100 pb-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{levelLabel}</p>
          <h2 className="mt-1.5 text-lg font-semibold text-slate-900">{bookTitle}</h2>
          <p className="mt-1.5 text-sm text-slate-600">
            Chapter {currentChapter + 1} of {totalChapters}
          </p>
          <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-blue-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="mt-3 flex shrink-0 items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => onChapterChange(currentChapter - 1)}
            disabled={loading || currentChapter === 0}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Previous
          </button>
          <button
            type="button"
            onClick={() => onChapterChange(currentChapter + 1)}
            disabled={loading || currentChapter === totalChapters - 1}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
          </button>
        </div>

        <div className="mt-3 min-h-0 flex-1 overflow-y-auto pr-1">
          <div className="space-y-1">
            {Array.from({ length: totalChapters }, (_, index) => {
              const active = index === currentChapter;
              return (
                <button
                  key={`sidebar-chapter-${index}`}
                  type="button"
                  onClick={() => onChapterChange(index)}
                  disabled={loading && !active}
                  aria-current={active ? 'page' : undefined}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition-colors ${
                    active
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  } ${loading && !active ? 'cursor-not-allowed opacity-60' : ''}`}
                >
                  <span className="font-medium">Chapter {index + 1}</span>
                  {active ? (
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
                      Current
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </aside>
  );
}
