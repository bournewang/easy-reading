'use client';

import React from 'react';
import Reader from '../../components/Reader';
import type { Article } from '../../types';

const testArticle: Article = {
  id: 1,
  title: "The Importance of Reading",
  site_name: "Test Site",
  url: "https://example.com",
  word_count: 150,
  paragraphs: {
    "1": {"type": "text", "content": "Reading is one of the most fundamental skills a person can learn. It opens doors to new worlds, ideas, and possibilities that might otherwise remain unknown."},
    "2": {"type": "text", "content": "Through reading, we can travel to distant places, learn about different cultures, and expand our understanding of the world. It's a gateway to knowledge and personal growth."},
    "3": {"type": "text", "content": "Moreover, regular reading improves vocabulary, writing skills, and critical thinking abilities. It's an essential tool for lifelong learning and personal development."}
  },
  unfamiliar_words: [],
  created_at: new Date().toISOString(),
  // translations: {}
};

export default function ReaderTestPage() {
  return (
    <div className="container mx-auto py-8">
        <Reader article={testArticle} />
    </div>
  );
}