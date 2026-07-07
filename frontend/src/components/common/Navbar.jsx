import React from 'react';
import { useAuth } from '../../context/AuthContext';

const Navbar = ({ title, onMenuClick }) => {
  const { user } = useAuth();

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

      {/* Profile & Settings Details */}
      <div className="flex items-center gap-6">
        {/* User Card */}
        {user && (
          <div className="flex items-center gap-3">
            <div className="hidden sm:block text-right">
              <p className="text-xs font-bold text-slate-800">{user.full_name}</p>
              <p className="text-[10px] text-slate-500 font-medium capitalize mt-0.5">
                {user.role === 'ADMIN' ? 'Administrator' : 'DS Investigator'}
              </p>
            </div>
            <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold uppercase shadow-sm">
              {user.full_name.charAt(0)}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Navbar;
