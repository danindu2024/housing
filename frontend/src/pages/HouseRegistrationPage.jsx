import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import HouseForm from '../components/house/HouseForm';

export default function HouseRegistrationPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [village, setVillage] = useState(null);
  const [loading, setLoading] = useState(true);

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
    <div className="space-y-6">
      {/* Header section with back button */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(`/villages/${id}`)}
          className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-slate-800 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to {village ? village.name : 'Village'}
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50">
          <h3 className="font-bold text-slate-800 text-lg">Register Allotment House</h3>
          <p className="text-xs text-slate-500 mt-0.5">Initialize a structure in village {village ? village.name : ''}</p>
        </div>

        <div className="p-6">
          <HouseForm
            villageId={id}
            isLoanVillage={isLoanVillage}
            onSuccess={() => navigate(`/villages/${id}`)}
            onClose={() => navigate(`/villages/${id}`)}
          />
        </div>
      </div>
    </div>
  );
}
