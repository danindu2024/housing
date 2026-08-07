import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import HouseForm from '../components/house/HouseForm';
import BulkHouseUpload from '../components/house/BulkHouseUpload';

export default function HouseRegistrationPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [village, setVillage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('single'); // 'single' | 'bulk'

  useEffect(() => {
    const fetchVillage = async () => {
      try {
        const response = await api.get(`/villages/${id}`);
        setVillage(response.data);
      } catch (err) {
        console.error('Failed to load village details:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchVillage();
  }, [id]);

  if (loading) {
    return (
      <div className="p-20 flex flex-col items-center justify-center bg-white rounded-2xl border border-slate-200">
        <div className="w-10 h-10 border-4 border-slate-100 border-t-indigo-600 rounded-full animate-spin mb-4" />
        <p className="text-slate-500 text-sm font-semibold">Loading village details...</p>
      </div>
    );
  }

  const isLoanVillage = village?.category_code === 'LOAN';

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* 1. Universal Back Breadcrumb */}
      <div className="mb-4">
        <button
          onClick={() => navigate(`/villages/${id}`)}
          className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-500 hover:text-slate-800 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to {village ? village.name : 'Village'}
        </button>
      </div>

      {/* 2. Premium Tabbed Navigation Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Register House</h1>
          <p className="text-sm text-slate-600 mt-1">
            Select House Registration Method / නිවාස ලියාපදිංචි ක්‍රමය තෝරන්න
          </p>
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
            Single House Register
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
            Excel File Upload
          </button>
        </div>
      </div>

      {/* 3. Render Tab Content Views */}
      <div className="mt-8 transition-all duration-300">
        {activeTab === 'single' ? (
          <HouseForm
            villageId={id}
            villageCategoryCode={village?.category_code}
            isLoanVillage={isLoanVillage}
            onSuccess={() => navigate(`/villages/${id}`)}
            onClose={() => navigate(`/villages/${id}`)}
            showTabSwitcher={false}
          />
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <BulkHouseUpload
              villageId={id}
              onSuccess={() => navigate(`/villages/${id}`)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
