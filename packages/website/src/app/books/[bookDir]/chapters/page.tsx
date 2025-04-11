// Create: packages/website/src/app/books/[bookDir]/chapters/page.tsx
import BookChapters from "@/components/BookChapters";

import React from 'react';

// This page component itself doesn't need to be a client component
// because BookChapters is the one using hooks.
export default function BookChaptersPage() {
  return <BookChapters />;
}