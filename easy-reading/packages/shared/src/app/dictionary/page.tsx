'use client';

import React from 'react';
import DictionaryTest from '../../pages/DictionaryTest';

export default function DictTestPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold text-indigo-600 mb-8 text-center">
        Dictionary Test
      </h1>
      <DictionaryTest />
    </div>
  );
}