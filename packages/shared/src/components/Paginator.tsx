import React from 'react';

interface PaginatorProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const Paginator: React.FC<PaginatorProps> = ({ currentPage, totalPages, onPageChange }) => {
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <div className="flex justify-center items-center gap-2 mt-4">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="px-3 py-1 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-indigo-50 transition-colors"
      >
        ←
      </button>
      
      {pages.map(page => (
        <button
          key={page}
          onClick={() => onPageChange(page)}
          className={`w-8 h-8 rounded-lg transition-colors ${
            currentPage === page
              ? 'bg-indigo-100 text-indigo-600'
              : 'hover:bg-indigo-50 text-gray-600'
          }`}
        >
          {page}
        </button>
      ))}

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="px-3 py-1 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-indigo-50 transition-colors"
      >
        →
      </button>
    </div>
  );
};

export default Paginator;