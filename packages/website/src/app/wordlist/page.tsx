'use client';

import PageShell from '@/components/PageShell';
import { WordList } from '@easy-reading/shared';

export default function WordListPage() {
  return (
    <PageShell>
      <div className="w-full">
        <WordList />
      </div>
    </PageShell>
  );
}
