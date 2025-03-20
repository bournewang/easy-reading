'use client';

import { WordList } from '@easy-reading/shared';

export default function WordListPage() {
  return (
    <div className="container mx-auto ">
      {/* <h1 className="text-2xl font-bold mb-6">My Word List</h1> */}
      <WordList />
    </div>
  );
}