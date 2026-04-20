export type BookLevel = {
  id: string;
  label: string;
  shortLabel: string;
  file: string;
  description: string;
};

export const BOOK_LEVELS: BookLevel[] = [
  {
    id: 'a1',
    label: 'A1 English Books',
    shortLabel: 'A1',
    file: 'index-a1.json',
    description: 'Best for complete beginners who know basic everyday words and want very short, simple stories to build reading confidence.',
  },
  {
    id: 'a2',
    label: 'A2 English Books',
    shortLabel: 'A2',
    file: 'index-a2.json',
    description: 'Best for early learners who can handle familiar sentences and want easy stories that grow everyday vocabulary and fluency.',
  },
  {
    id: 'b11',
    label: 'B1.1 English Books',
    shortLabel: 'B1.1',
    file: 'index-b11.json',
    description: 'Best for lower-intermediate readers who are moving beyond easy texts and want longer stories with manageable new vocabulary.',
  },
  {
    id: 'b12',
    label: 'B1.2 English Books',
    shortLabel: 'B1.2',
    file: 'index-b12.json',
    description: 'Best for solid intermediate learners who want richer plots, more natural sentence patterns, and broader day-to-day vocabulary.',
  },
  {
    id: 'b21',
    label: 'B2.1 English Books',
    shortLabel: 'B2.1',
    file: 'index-b21.json',
    description: 'Best for upper-intermediate readers who can read independently and want deeper narratives with more descriptive and abstract language.',
  },
  {
    id: 'b22',
    label: 'B2.2 English Books',
    shortLabel: 'B2.2',
    file: 'index-b22.json',
    description: 'Best for strong upper-intermediate learners who want near-authentic reading practice and smoother comprehension across longer chapters.',
  },
  {
    id: 'c1',
    label: 'C1 English Books',
    shortLabel: 'C1',
    file: 'index-c1.json',
    description: 'Best for advanced readers who want challenging, authentic-style books with nuanced vocabulary, complex structure, and mature themes.',
  },
];