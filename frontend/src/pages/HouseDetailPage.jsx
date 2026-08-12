import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';

const HouseDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  // Page States
  const [house, setHouse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Delete Modal States
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const fetchHouseDetail = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get(`/houses/${id}`);
      setHouse(response.data);
    } catch (err) {
      console.error('Failed to load house details:', err);
      setError('නිවාස තොරතුරු පද්ධතියෙන් සොයා ගැනීමට නොහැකි විය. (House file could not be found or retrieved.)');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHouseDetail();
  }, [id]);

  const handleDeleteHouse = async () => {
    setDeleting(true);
    setDeleteError('');
    try {
      const res = await api.delete(`/houses/${id}`);
      setShowDeleteModal(false);
      const villageId = res.data?.village_id || house?.village_id;
      if (villageId) {
        navigate(`/villages/${villageId}`);
      } else {
        navigate('/villages');
      }
    } catch (err) {
      console.error('Failed to delete house:', err);
      setDeleteError(err.response?.data?.error || 'නිවස ඉවත් කිරීම අසාර්ථක විය. පද්ධති දෝෂයකි. (Failed to delete house record.)');
    } finally {
      setDeleting(false);
    }
  };

  const getStageBadge = (stage) => {
    const stageCode = stage?.code;
    const label = stage?.label || 'Unknown';

    if (stageCode === 'FULLY_DEVELOPED' || stageCode === 'COMPLETED') {
      return <span className="px-3 py-1 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">{label}</span>;
    }
    if (stageCode === 'NO_FOUNDATION' || stageCode === 'NOT_STARTED') {
      return <span className="px-3 py-1 rounded-xl bg-slate-100 text-slate-600 border border-slate-200 text-xs font-bold">{label}</span>;
    }
    return <span className="px-3 py-1 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold">{label}</span>;
  };

  const getOccupancyBadge = (status) => {
    const badges = {
      BORROWER_LIVING: 'text-emerald-800 font-bold bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-xl',
      ABANDONED: 'text-indigo-800 font-bold bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-xl',
      SOLD: 'text-rose-700 font-extrabold bg-rose-50 border border-rose-200 px-3 py-1 rounded-xl',
      NOT_APPLICABLE: 'text-slate-400 font-medium',
    };
    const labels = {
      BORROWER_LIVING: 'අයිතිය ප්‍රතිලාභියා සතුයි / Beneficiary Owned',
      ABANDONED: 'නිවස කුලියට දී ඇත / House Rented',
      SOLD: 'ඉඩම/නිවස විකුණා ඇත / Land or House Sold',
      NOT_APPLICABLE: '-',
    };
    return <span className={`text-xs ${badges[status] || ''}`}>{labels[status] || status}</span>;
  };

  const getCurrentStatusDisplay = (status) => {
    const map = {
      IN_PROGRESS: { label: 'ඉදිකිරීම් වර්තමානයේ ක්‍රියාත්මක වේ (Active Construction)', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
      STOPPED: { label: 'ඉදිකිරීම් නවතා ඇත (Construction Stopped)', color: 'bg-rose-50 text-rose-700 border-rose-200' },
      FINISHED: { label: 'ඉදිකර අවසන් (Construction Completed)', color: 'bg-sky-50 text-sky-700 border-sky-200' }
    };
    const item = map[status];
    if (!item) return <span className="text-slate-800 font-bold">සටහන් කර නැත (N/A)</span>;
    return <span className={`inline-block px-3 py-1 rounded-xl text-xs font-bold border ${item.color}`}>{item.label}</span>;
  };

  const getInfrastructureBadges = (infraArray) => {
    if (!infraArray || !Array.isArray(infraArray) || infraArray.length === 0) {
      return <span className="text-sm font-bold text-slate-800">සටහන් කර නැත (N/A)</span>;
    }
    const infraMap = {
      WATER: { label: 'ජලය (Water)' },
      ELECTRICITY: { label: 'විදුලිය (Electricity)' },
      ACCESS_ROADS: { label: 'ප්‍රවේශ මාර්ග (Access Roads)' },
      INTERNAL_ROADS: { label: 'අභ්‍යන්තර මාර්ග (Internal Roads)' },
      OTHER: { label: 'වෙනත් (Other)' },
    };
    return infraArray.map((item) => {
      const info = infraMap[item] || { label: item };
      return (
        <span key={item} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-extrabold bg-slate-100 text-slate-700 border border-slate-200 shadow-sm">
          <span>{info.label}</span>
        </span>
      );
    });
  };

  const getRepaymentStatusBadge = (status) => {
    const map = {
      PAYING: { label: 'ගෙවමින් පවතී (Paying)', cls: 'bg-sky-50 text-sky-700 border-sky-200' },
      FULLY_PAID: { label: 'සම්පූර්ණයෙන්ම ගෙවා අවසන් (Fully Paid)', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
      DEFAULTED: { label: 'පැහැර හැර ඇත (Defaulted)', cls: 'bg-rose-50 text-rose-700 border-rose-200' }
    };
    const item = map[status] || { label: status || '-', cls: 'bg-slate-100 text-slate-600 border-slate-200' };
    return <span className={`px-3 py-1 rounded-xl text-xs font-bold border ${item.cls}`}>{item.label}</span>;
  };

  if (loading) {
    return (
      <div className="p-20 flex flex-col items-center justify-center bg-white rounded-2xl border border-slate-200 shadow-sm">
        <div className="w-10 h-10 border-4 border-slate-100 border-t-indigo-600 rounded-full animate-spin mb-4" />
        <p className="text-slate-500 text-sm font-semibold">Loading house details...</p>
      </div>
    );
  }

  if (error || !house) {
    return (
      <div className="bg-rose-50 border border-rose-100 text-rose-600 rounded-2xl p-8 text-center font-semibold">
        {error || 'House record not found.'}
      </div>
    );
  }

  const isLoanVillage = house.village_category_code === 'LOAN';

  return (
    <div className="space-y-8 font-sans max-w-6xl mx-auto">
      {/* 1. Header Navigation Breadcrumb */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(`/villages/${house.village_id}`)}
          className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-slate-800 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to {house.village_name || 'Village'}
        </button>
      </div>

      {/* 2. Metadata Overview Banner Header */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-md p-8 text-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`px-2.5 py-1 rounded-lg text-xs font-extrabold uppercase tracking-wider ${
              isLoanVillage ? 'bg-sky-500 text-white' : 'bg-emerald-500 text-white'
            }`}>
              {isLoanVillage ? 'ණය ගම්මානය / Loan Village' : 'ආධාර ගම්මානය / Grant Village'}
            </span>
            <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-800 text-slate-300 border border-slate-700">
              Village: {house.village_name}
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-tight">{house.owner_name}</h1>
          <p className="text-xs text-slate-300 font-medium">
            Beneficiary Number: <span className="font-bold text-amber-400">{house.beneficiary_number || 'N/A'}</span>
            {house.district_name && ` | ${house.district_name} District, ${house.division_name}${house.grama_niladhari_division ? `, ${house.grama_niladhari_division}` : ''}`}
          </p>
        </div>

        {/* Action Buttons: Edit & Delete */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
          <button
            onClick={() => navigate(`/houses/${house.id}/edit`)}
            className="w-full sm:w-auto border border-indigo-400/40 hover:border-indigo-400 text-indigo-200 hover:text-white font-bold text-xs uppercase tracking-wider px-6 py-3.5 rounded-xl bg-indigo-950/60 hover:bg-indigo-600 transition-all flex items-center justify-center gap-2 active:scale-95 shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit House Details
          </button>

          <button
            onClick={() => {
              setDeleteError('');
              setShowDeleteModal(true);
            }}
            className="w-full sm:w-auto border border-rose-200/40 hover:border-rose-400 text-rose-300 hover:text-white font-bold text-xs uppercase tracking-wider px-6 py-3.5 rounded-xl bg-rose-950/40 hover:bg-rose-600 transition-all flex items-center justify-center gap-2 active:scale-95 shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Delete House
          </button>
        </div>
      </div>

      {/* 3. Detailed Information Cards Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Card 1: Beneficiary Details */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-widest text-indigo-600">
              ප්‍රතිලාභකරුගේ තොරතුරු / Beneficiary Details
            </h3>
          </div>
          <div className="p-6 space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase block">ප්‍රතිලාභී අංකය / Beneficiary No</span>
                <p className="font-bold text-slate-800 text-sm">{house.beneficiary_number || 'සටහන් කර නැත (N/A)'}</p>
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase block">සම්පූර්ණ නම / Full Name</span>
                <p className="font-bold text-slate-800">{house.owner_name}</p>
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase block">හැඳුනුම්පත් අංකය / NIC Number</span>
                <p className="font-bold text-slate-800">{house.owner_nic || 'සටහන් කර නැත (N/A)'}</p>
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase block">දුරකථන අංකය / Contact Number</span>
                <p className="font-bold text-slate-800">{house.owner_contact || 'සටහන් කර නැත (N/A)'}</p>
              </div>
            </div>
            <div className="pt-2 border-t border-slate-100">
              <span className="text-[11px] font-bold text-slate-500 uppercase block">ස්ථිර ලිපිනය / Permanent Address</span>
              <p className="font-bold text-slate-800">{house.permanent_address || 'සටහන් කර නැත (N/A)'}</p>
            </div>
          </div>
        </div>

        {/* Card 2: Housing & Land Details */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-widest text-sky-600">
              නිවාස සහ ඉඩමේ තොරතුරු / Housing & Land Details
            </h3>
          </div>
          <div className="p-6 space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase block">පිඹුරු / සැලැස්මේ අංකය / Plan No</span>
                <p className="font-bold text-slate-800">{house.house_number || 'සටහන් කර නැත (N/A)'}</p>
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase block">ඉඩමේ ප්‍රමාණය / Land Extent</span>
                <p className="font-bold text-slate-800">
                  {house.land_area_perches !== null ? `${house.land_area_perches} Perches` : 'සටහන් කර නැත (N/A)'}
                </p>
              </div>
            </div>
            <div className="pt-2 border-t border-slate-100">
              <span className="text-[11px] font-bold text-slate-500 uppercase block mb-1">අයිතිය / Ownership Status</span>
              {getOccupancyBadge(house.occupancy_status)}
            </div>
          </div>
        </div>

        {/* Card 3: Construction Progress & Active Status */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-widest text-amber-600">
              ඉදිකිරීම් ප්‍රගතිය / Construction Progress
            </h3>
          </div>
          <div className="p-6 space-y-4 text-sm">
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase block mb-1">ඉදිකිරීම් මට්ටම / Stage</span>
              {getStageBadge(house.construction_stage)}
            </div>
            <div className="pt-2 border-t border-slate-100">
              <span className="text-[11px] font-bold text-slate-500 uppercase block mb-1">වත්මන් තත්ත්වය / Current Active Status</span>
              {getCurrentStatusDisplay(house.current_status)}
            </div>
            <div className="pt-2 border-t border-slate-100">
              <span className="text-[11px] font-bold text-slate-500 uppercase block">ඇස්තමේන්තුගත වටිනාකම / Estimated Construction Value</span>
              <p className="font-bold text-slate-800 text-sm mt-0.5">
                {house.estimated_value !== null && house.estimated_value > 0
                  ? `රු. ${parseFloat(house.estimated_value).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                  : 'සටහන් කර නැත (N/A)'}
              </p>
            </div>
          </div>
        </div>

        {/* Card 4: Infrastructure Details */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-widest text-purple-600">
              යටිතල පහසුකම් / Infrastructure
            </h3>
          </div>
          <div className="p-6 space-y-3">
            <div className="flex flex-wrap gap-2 pt-1">
              {getInfrastructureBadges(house.infrastructure_issues)}
            </div>
          </div>
        </div>

        {/* Card 5: Financial (Loan / Grant Details) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden md:col-span-2">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-widest text-pink-600">
              ණය සහ දීමනා විස්තර / Loan & Grant Details
            </h3>
          </div>
          <div className="p-6 space-y-4 text-sm">
            {house.loan ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <span className="text-[11px] font-bold text-slate-500 uppercase block">මුළු ණය මුදල / Total Loan</span>
                    <p className="text-lg font-black text-slate-800 mt-1">
                      රු. {parseFloat(house.loan.loan_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                    <span className="text-[11px] font-bold text-emerald-600 uppercase block">ගෙවා ඇති මුදල / Paid So Far</span>
                    <p className="text-lg font-black text-emerald-800 mt-1">
                      රු. {parseFloat(house.loan.total_paid_so_far).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="bg-rose-50 p-4 rounded-xl border border-rose-100">
                    <span className="text-[11px] font-bold text-rose-600 uppercase block">ඉතිරි ණය මුදල / Balance Remaining</span>
                    <p className="text-lg font-black text-rose-800 mt-1">
                      රු. {parseFloat(house.loan.balance_remaining).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col justify-center">
                    <span className="text-[11px] font-bold text-slate-500 uppercase block mb-1">ආපසු ගෙවීමේ තත්ත්වය / Status</span>
                    {getRepaymentStatusBadge(house.loan.repayment_status)}
                  </div>
                </div>
                {house.loan.notes && (
                  <div className="pt-2">
                    <span className="text-[11px] font-bold text-slate-400 uppercase block">ණය පිළිබඳ සටහන් / Loan Notes</span>
                    <p className="font-semibold text-slate-700 mt-0.5">{house.loan.notes}</p>
                  </div>
                )}
              </div>
            ) : house.grant ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                    <span className="text-[11px] font-bold text-emerald-600 uppercase block">මුළු දීමනා මුදල / Total Grant</span>
                    <p className="text-xl font-black text-emerald-800 mt-1">
                      රු. {parseFloat(house.grant.grant_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  {house.grant.notes && (
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                      <span className="text-[11px] font-bold text-slate-400 uppercase block">දීමනා පිළිබඳ සටහන් / Grant Notes</span>
                      <p className="font-semibold text-slate-700 mt-1">{house.grant.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-xs font-bold text-slate-800">ණය හෝ දීමනා විස්තර ඇතුළත් කර නොමැත. (No loan or grant details recorded for this house.)</p>
            )}
          </div>
        </div>

        {/* Card 6: Other Notes */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden md:col-span-2">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-600">
              වෙනත් සටහන් / Other Notes
            </h3>
          </div>
          <div className="p-6">
            <p className="text-xs font-bold text-slate-800 leading-relaxed whitespace-pre-line">
              {house.notes || 'වෙනත් සටහන් ඇතුලත් කර නොමැත. (No other notes provided.)'}
            </p>
          </div>
        </div>

      </div>

      {/* 4. Delete Confirmation Custom Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl border border-slate-200 w-full max-w-md shadow-2xl p-6 space-y-6 animate-scale-in">
            {/* Header / Icon */}
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <div>
                <h3 className="font-extrabold text-slate-800 text-lg">Delete House Record</h3>
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mt-0.5">Warning Confirm</p>
              </div>
            </div>

            {/* Error Message if deletion fails */}
            {deleteError && (
              <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-xs font-semibold text-rose-600 leading-relaxed">
                {deleteError}
              </div>
            )}

            {/* Content Body */}
            <div className="text-slate-600 text-sm leading-relaxed font-medium space-y-3">
              <p className="font-sinhala">
                මෙම නිවාස වාර්තාව (<span className="font-bold text-slate-800">"{house.owner_name} - {house.beneficiary_number}"</span>) පද්ධතියෙන් ස්ථිරවම ඉවත් කිරීමට ඔබට අවශ්‍ය බව සහතිකද?
              </p>
              <p className="font-sinhala text-xs text-slate-450 font-bold italic">
                මෙම ක්‍රියාව නැවත කිසිසේත් ආපසු හැරවිය නොහැක.
              </p>
              <p className="text-xs text-slate-450 mt-2 font-sans">
                (Are you sure you want to permanently delete this house record? This action cannot be undone.)
              </p>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center gap-3 pt-2 justify-end">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                className="flex-1 sm:flex-initial px-5 py-2.5 border border-slate-200 text-slate-600 bg-white hover:bg-slate-50 font-bold text-xs rounded-xl uppercase tracking-wider transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteHouse}
                disabled={deleting}
                className="flex-1 sm:flex-initial px-6 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-md shadow-rose-500/10 active:scale-95"
              >
                {deleting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-rose-200 border-t-white rounded-full animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HouseDetailPage;
