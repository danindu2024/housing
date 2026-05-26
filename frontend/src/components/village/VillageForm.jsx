import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SingleVillageForm from './SingleVillageForm';
import BulkVillageUpload from './BulkVillageUpload';

const VillageForm = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('single'); // 'single' | 'bulk'

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* 1. Universal Back Breadcrumb */}
      <div className="mb-4">
        <button
          onClick={() => navigate('/villages')}
          className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-500 hover:text-slate-800 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Directory
        </button>
      </div>

      {/* 2. Premium Tabbed Navigation Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Register Housing Village</h1>
          <p className="text-xs text-slate-400 mt-1">නව ගම්මානයක් පද්ධතියට ලියාපදිංචි කිරීමේ ක්‍රමවේදය තෝරන්න.</p>
        </div>

        {/* Tab Switcher Selector */}
        <div className="flex bg-slate-100 p-1.5 rounded-xl border border-slate-200/50">
          <button
            onClick={() => setActiveTab('single')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
              activeTab === 'single'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            තනි ගම්මාන ලියාපදිංචිය
          </button>
          
          <button
            onClick={() => setActiveTab('bulk')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
              activeTab === 'bulk'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Excel තොග වශයෙන්
          </button>
        </div>
      </div>

      {/* 3. Render Tab Content Views */}
      <div className="mt-8 transition-all duration-300">
        {activeTab === 'single' ? (
          <SingleVillageForm />
        ) : (
          <BulkVillageUpload />
        )}
      </div>
    </div>
  );
};

export default VillageForm;
