'use client';

import React from 'react';
import Dictionary from '../components/Dictionary';
// import { useDictionary } from '../hooks/useDictionary';

const DictionaryTest: React.FC = () => {

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Dictionary Test</h1>

      <Dictionary />
    </div>
  );
};

export default DictionaryTest;