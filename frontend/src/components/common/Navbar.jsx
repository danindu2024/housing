import React from 'react';

const Navbar = ({ title, onMenuClick }) => {
  return (
    <header className="h-16 border-b border-slate-200 bg-white px-4 md:px-8 flex items-center justify-between sticky top-0 z-30 shadow-sm">
      {/* Title & Context */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="md:hidden p-2 -ml-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 focus:outline-none"
          aria-label="Open Menu"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <h2 className="text-sm sm:text-base md:text-lg font-bold text-slate-800 tracking-tight truncate max-w-[180px] sm:max-w-xs md:max-w-none">{title || 'Housing Portal'}</h2>
      </div>
    </header>
  );
};

export default Navbar;
