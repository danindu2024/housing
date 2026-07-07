import React from 'react';
import { useAuth } from '../../context/AuthContext';

const Navbar = ({ title }) => {
  const { user } = useAuth();

  return (
    <header className="h-16 border-b border-slate-200 bg-white px-8 flex items-center justify-between sticky top-0 z-30 shadow-sm">
      {/* Title & Context */}
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-bold text-slate-800 tracking-tight">{title || 'Housing Portal'}</h2>
      </div>

      {/* Profile & Settings Details */}
      <div className="flex items-center gap-6">
        {/* User Card */}
        {user && (
          <div className="flex items-center gap-3">
            <div className="text-right">
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
