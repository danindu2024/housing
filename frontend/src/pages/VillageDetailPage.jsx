import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';

const VillageDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  // Page States
  const [village, setVillage] = useState(null);
  const [houses, setHouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [housesLoading, setHousesLoading] = useState(true);
  const [error, setError] = useState('');

  // House Directory Search State
  const [searchQuery, setSearchQuery] = useState('');

  // Form Modal States
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // 1. Fetch Village metadata summaries
  const fetchVillageDetail = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/villages/${id}`);
      setVillage(response.data);
    } catch (err) {
      console.error('Failed to load village details:', err);
      setError('Village file could not be found or retrieved.');
    } finally {
      setLoading(false);
    }
  };

  // 2. Fetch houses recorded inside the village
  const fetchHousesList = async () => {
    setHousesLoading(true);
    try {
      const response = await api.get(`/villages/${id}/houses`);
      setHouses(response.data.data);
    } catch (err) {
      console.error('Failed to load houses ledger:', err);
    } finally {
      setHousesLoading(false);
    }
  };

  useEffect(() => {
    fetchVillageDetail();
  }, [id]);

  useEffect(() => {
    fetchHousesList();
  }, [id]);

  // Client-side search filtering by beneficiary number, beneficiary name, house number, or NIC
  const filteredHouses = houses.filter((h) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const benNo = h.beneficiary_number ? h.beneficiary_number.toLowerCase() : '';
    const ownerName = h.owner_name ? h.owner_name.toLowerCase() : '';
    const houseNo = h.house_number ? h.house_number.toLowerCase() : '';
    const ownerNic = h.owner_nic ? h.owner_nic.toLowerCase() : '';
    return benNo.includes(q) || ownerName.includes(q) || houseNo.includes(q) || ownerNic.includes(q);
  });

  const handleDeleteVillage = async () => {
    setDeleting(true);
    setDeleteError('');
    try {
      await api.delete(`/villages/${id}`);
      setShowDeleteModal(false);
      navigate('/villages');
    } catch (err) {
      console.error('Failed to delete village:', err);
      setDeleteError(err.response?.data?.error || 'ගම්මානය ඉවත් කිරීම අසාර්ථක විය. පද්ධති දෝෂයකි. (Failed to delete village.)');
    } finally {
      setDeleting(false);
    }
  };

  const getStageBadge = (stage) => {
    const stageCode = stage?.code;
    const label = stage?.label || 'Unknown';

    if (stageCode === 'FULLY_DEVELOPED') {
      return <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-100 text-[12px] font-semibold">{label}</span>;
    }
    if (stageCode === 'NO_FOUNDATION') {
      return <span className="px-2 py-0.5 rounded bg-slate-50 text-slate-500 border border-slate-100 text-[12px] font-semibold">{label}</span>;
    }
    return <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-100 text-[12px] font-semibold">{label}</span>;
  };

  const getOccupancyBadge = (status) => {
    const badges = {
      BORROWER_LIVING: 'text-emerald-700 font-semibold bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded',
      ABANDONED: 'text-indigo-700 font-semibold bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded',
      SOLD: 'text-rose-600 font-bold bg-rose-50 border border-rose-100 px-2 py-0.5 rounded',
      NOT_APPLICABLE: 'text-slate-400 font-medium',
    };
    const labels = {
      BORROWER_LIVING: 'Beneficiary Owned',
      ABANDONED: 'House Rented',
      SOLD: 'Land/House Sold',
      NOT_APPLICABLE: '-',
    };
    return <span className={`text-xs ${badges[status] || ''}`}>{labels[status] || status}</span>;
  };

  const getCategoryDisplay = (code, nameSi) => {
    const englishNames = {
      LOAN: 'Loan Village',
      GRANT: 'Grant Village',
      GRANT_INDIAN: 'Indian Grant',
      GRANT_HOUSING: 'Housing Authority Grant',
    };
    const engName = englishNames[code];
    if (nameSi && engName) {
      return `${nameSi} / ${engName}`;
    }
    if (code === 'LOAN') return 'ණය / Loan Village';
    if (code === 'GRANT') return 'ආධාර / Grant Village';
    return nameSi || engName || code || '';
  };

  const getOwnershipBodyDisplay = () => {
    if (!village) return null;
    const si = village.ownership_body_name_si;
    const en = village.ownership_body_name_en;
    if (si && en) {
      return `${si} / ${en}`;
    }
    return si || en || null;
  };

  const getBoundaryTypeDisplay = (boundary) => {
    const boundaries = {
      MUNICIPAL: 'මහනගර සභා (Municipal Council)',
      URBAN:     'නගරසභා (Urban Council)',
      DS:        'ප්‍රාදේශීය සභා (DS Division)',
      VILLAGE:   'දුෂ්කර ගම්මාන (Village)',
    };
    return boundaries[boundary] || boundary || 'සටහන් කර නැත (Not Specified)';
  };


  const getInfrastructureBadges = (infraArray) => {
    if (!infraArray || !Array.isArray(infraArray) || infraArray.length === 0) {
      return <span className="text-xs font-bold text-slate-800">පහසුකම් සටහන් කර නැත / No facilities recorded</span>;
    }
    const infraMap = {
      WATER: { label: 'ජලය (Water)'},
      ELECTRICITY: { label: 'විදුලිය (Electricity)'},
      ACCESS_ROADS: { label: 'ගමට ප්‍රවේශ මාර්ග (Access Roads)'},
      INTERNAL_ROADS: { label: 'අභ්‍යන්තර මාර්ග (Internal Roads)'},
      OTHER: { label: 'වෙනත් පොදු පහසුකම් (Other)'},
    };
    return infraArray.map((item) => {
      const info = infraMap[item] || { label: item, icon: '✨' };
      return (
        <span key={item} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-extrabold bg-white text-slate-700 border border-slate-200 shadow-sm">
          <span>{info.icon}</span>
          <span>{info.label}</span>
        </span>
      );
    });
  };

  if (loading) {
    return (
      <div className="p-20 flex flex-col items-center justify-center bg-white rounded-2xl border border-slate-200">
        <div className="w-10 h-10 border-4 border-slate-100 border-t-indigo-600 rounded-full animate-spin mb-4" />
        <p className="text-slate-500 text-sm font-semibold">Opening investigation file...</p>
      </div>
    );
  }

  if (error || !village) {
    return (
      <div className="bg-rose-50 border border-rose-100 text-rose-600 rounded-2xl p-8 text-center font-semibold">
        {error || 'Village record not found.'}
      </div>
    );
  }

  const isLoanVillage = village.category_code === 'LOAN';

  return (
    <div className="space-y-8">
      {/* Detail Header navigation link */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/villages')}
          className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-slate-800 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Directory
        </button>
      </div>

      {/* Metadata Overview Panel */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-8 bg-slate-900 text-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-6 relative">
          <div className="space-y-2 relative z-10">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`px-2.5 py-1 rounded-lg text-xs font-extrabold uppercase tracking-wider ${
                village.category_code === 'LOAN'
                  ? 'bg-sky-500 text-white shadow-sm'
                  : village.category_code === 'GRANT'
                  ? 'bg-emerald-500 text-white shadow-sm'
                  : 'bg-amber-500 text-white shadow-sm'
              }`}>
                {getCategoryDisplay(village.category_code, village.category_name)}
              </span>
            </div>
            <h1 className="text-2xl font-black tracking-tight">{village.name}</h1>
            <p className="text-xs text-slate-300 font-medium">
              Location: {village.district_name} District, {village.division_name}, {village.grama_niladhari_division}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 relative z-10 w-full sm:w-auto">
            <button
              onClick={() => navigate(`/villages/${id}/edit`)}
              className="w-full sm:w-auto border border-indigo-400/40 hover:border-indigo-400 text-indigo-200 hover:text-white font-bold text-xs uppercase tracking-wider px-6 py-3.5 rounded-xl bg-indigo-950/60 hover:bg-indigo-600 transition-all flex items-center justify-center gap-2 active:scale-95 shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit Village Details
            </button>
            <button
              onClick={() => {
                setDeleteError('');
                setShowDeleteModal(true);
              }}
              className="w-full sm:w-auto border border-rose-200 hover:border-rose-350 text-rose-500 hover:text-rose-600 font-bold text-xs uppercase tracking-wider px-6 py-3.5 rounded-xl bg-transparent hover:bg-rose-50/20 transition-all flex items-center justify-center gap-2 active:scale-95"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete Village
            </button>
            <button
              onClick={() => navigate(`/villages/${id}/houses/new`)}
              className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase tracking-wider px-6 py-3.5 rounded-xl shadow-lg shadow-indigo-600/10 hover:shadow-indigo-500/20 transition-all flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              Register House
            </button>
          </div>

          {/* Faint ambient circle glow */}
          <div className="absolute right-0 bottom-[-50%] w-80 h-80 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
        </div>

        {/* Environmental Area Alert */}
        {village.is_conservation_area && village.is_conservation_area !== 'NONE' && (
          <div className="px-8 py-4 bg-rose-500/10 border-b border-rose-100 text-rose-800 text-xs font-semibold flex items-center gap-2.5">
            <span>සංරක්ෂිත භූමි සීමාව: <span className="font-extrabold">{
              village.is_conservation_area === 'WILDLIFE' ? 'වන ජීවී භූමි තුල පිහිටයි (Wildlife Land)' :
              village.is_conservation_area === 'FOREST' ? 'වන සංරක්ෂණ භූමි තුල පිහිටයි (Forest Conservation Land)' :
              village.is_conservation_area === 'COASTAL' ? 'වෙරල සංරක්ෂණ භූමි තුල පිහිටයි (Coastal Conservation Land)' :
              village.is_conservation_area === 'ARCHAEOLOGICAL' ? 'පුරාවිද්‍යා භූමි තුල පිහිටයි (Archaeological Land)' :
              village.is_conservation_area === 'SACRED' ? 'පූජා භූමි තුල පිහිටයි (Sacred Land)' :
              village.is_conservation_area === 'OTHER' ? 'වෙනත් සංරක්ෂණ භූමි තුල පිහිටයි (Other Conservation Land)' : village.is_conservation_area
            }</span></span>
          </div>
        )}

        {/* Specifications Grid */}
        <div className="p-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 border-b border-slate-100 bg-white">
          {/* 1. Land Ownership */}
          <div className="space-y-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-600 block">
              ඉඩමේ හිමිකාරීත්වය / Land Ownership
            </span>
            <p className="text-xs font-bold text-slate-800">
              {getOwnershipBodyDisplay() || 'සටහන් කර නැත (Not Specified)'}
            </p>
          </div>

          {/* 2. Village Boundary */}
          <div className="space-y-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-600 block">
              ගමේ පිහිටීමේ සීමාව / Boundary Type
            </span>
            <p className="text-xs font-bold text-slate-800">
              {getBoundaryTypeDisplay(village.boundary_type)}
            </p>
          </div>

          {/* 3. Foundation Day */}
          <div className="space-y-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-600 block">
              මුල්ගල තැබූ දිනය / Foundation Date
            </span>
            <p className="text-xs font-bold text-slate-800">
              {village.program_start_date || 'සටහන් කර නැත (N/A)'}
            </p>
          </div>

          {/* 4. Public Status */}
          <div className="space-y-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-600 block">
              මහජනතාවට විවෘතද? / Public Status
            </span>
            <div>
              {village.status === 'OPEN' ? (
                <p className="text-xs font-bold text-slate-800">
                  විවෘතයි (Open)
                </p>
              ) : (
                <p className="text-xs font-bold text-slate-800">
                  විවෘත කර නැත (Closed)
                </p>
              )}
            </div>
          </div>

          {/* 5. Google Map Link */}
          <div className="space-y-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-600 block">
              Google Map Location
            </span>
            {village.google_map_link ? (
              <a
                href={village.google_map_link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
              >
                <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Open Google Map ↗
              </a>
            ) : (
              <p className="text-xs font-bold text-slate-800">No Google Map Link</p>
            )}
          </div>
        </div>

        {/* Infrastructure Details Bar */}
        <div className="p-8 border-b border-slate-100 bg-slate-50/70 space-y-2">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-600 block">
            යටිතල පහසුකම් / Infrastructure
          </span>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {getInfrastructureBadges(village.infrastructure_issues)}
          </div>
        </div>

        {/* Notes */}
        <div className="p-8 bg-white">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Other Details/ වෙනත් තොරතුරු</span>
            <p className="text-xs font-bold text-slate-800">{village.notes || 'No other details'}</p>
          </div>
        </div>
      </div>

      {/* Village summary Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Recorded Houses</span>
          <p className="text-2xl font-black text-slate-800">{village.summary.total_houses} / {village.total_planned_houses}</p>
          <span className="text-[10px] text-slate-500 font-medium block">Allotment registration</span>
        </div>
      </div>

      {/* Houses list Section */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-800 tracking-tight">Recorded Houses Ledger</h2>

        {/* Houses Search Bar Panel */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
          <div className="relative w-full">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ප්‍රතිලාභී අංකය හෝ නම මගින් සොයන්න / Search by Beneficiary Number or Name"
              className="w-full pl-11 pr-10 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm font-semibold text-slate-700 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                title="Clear search"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Houses Ledger Table */}
        {housesLoading ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 flex flex-col items-center justify-center">
            <div className="w-8 h-8 border-2 border-slate-100 border-t-indigo-600 rounded-full animate-spin mb-4" />
            <p className="text-slate-400 text-xs font-medium">Updating houses directory...</p>
          </div>
        ) : filteredHouses.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center text-slate-400 text-xs font-medium">
            {searchQuery
              ? `No house records match your search "${searchQuery}".`
              : "No house records registered in this village yet. Click 'Register House' to seed a new unit."}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[13px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="px-6 py-4">Owner Details</th>
                    <th className="px-6 py-4">Construction Progress</th>
                    <th className="px-6 py-4">Ownership</th>
                    {isLoanVillage && <th className="px-6 py-4 text-center">Loan issued</th>}
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm text-slate-600">
                  {filteredHouses.map((h) => (
                    <tr key={h.id} className="hover:bg-slate-50/30 transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <span className="font-semibold text-slate-800">{h.owner_name}</span>
                          <p className="text-xs text-slate-500 font-medium mt-0.5">
                            Ben No: {h.beneficiary_number || 'N/A'}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">{getStageBadge(h.construction_stage)}</td>
                      <td className="px-6 py-4">{getOccupancyBadge(h.occupancy_status)}</td>
                      {isLoanVillage && (
                        <td className="px-6 py-4 text-center">
                          {h.loan_amount && h.loan_amount > 0 ? (
                            <span className="font-semibold text-slate-800">
                              රු. {parseFloat(h.loan_amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs font-semibold">-</span>
                          )}
                        </td>
                      )}
                      <td className="px-6 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => {/* View house feature to be implemented later */}}
                          className="inline-flex items-center gap-1.5 px-4 py-2 border border-slate-200 hover:border-indigo-200 text-xs font-bold text-indigo-650 hover:text-white bg-slate-50/50 hover:bg-indigo-600 rounded-xl transition-all shadow-sm active:scale-95"
                        >
                          <span>View House</span>
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>



      {/* Delete Confirmation Custom Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl border border-slate-200 w-full max-w-md shadow-2xl p-6 space-y-6 animate-scale-in">
            {/* Header / Icon */}
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                village.summary.total_houses > 0 ? 'bg-amber-50 text-amber-650 border border-amber-100' : 'bg-rose-50 text-rose-600 border border-rose-100'
              }`}>
                {village.summary.total_houses > 0 ? (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                )}
              </div>
              <div>
                <h3 className="font-extrabold text-slate-800 text-lg">
                  {village.summary.total_houses > 0 ? 'Cannot Delete Village' : 'Delete Village'}
                </h3>
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mt-0.5">
                  {village.summary.total_houses > 0 ? 'Action Restricted' : 'Warning Confirm'}
                </p>
              </div>
            </div>

            {/* Error Message if deletion fails */}
            {deleteError && (
              <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-xs font-semibold text-rose-600 leading-relaxed">
                {deleteError}
              </div>
            )}

            {/* Content Body */}
            <div className="text-slate-600 text-sm leading-relaxed font-medium">
              {village.summary.total_houses > 0 ? (
                <div className="space-y-3">
                  <p className="font-sinhala">
                    මෙම ගම්මානය පද්ධතියෙන් ඉවත් කළ නොහැක. මෙම ගම්මානය යටතේ නිවාස <span className="font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded">{village.summary.total_houses}</span> ක් ලියාපදිංචි කර ඇත.
                  </p>
                  <p className="font-sinhala text-xs text-slate-400 font-bold italic">
                    කරුණාකර ප්‍රථමයෙන් මෙම ගම්මානයට අදාළ සියලුම නිවාස ලියාපදිංචි කිරීම් මකා දමා නැවත උත්සාහ කරන්න.
                  </p>
                  <p className="text-xs text-slate-450 mt-2 font-sans">
                    (This village cannot be deleted because it has {village.summary.total_houses} registered houses in the ledger. Please delete the houses first.)
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="font-sinhala">
                    මෙම ගම්මානය (<span className="font-bold text-slate-800">"{village.name}"</span>) පද්ධතියෙන් ස්ථිරවම ඉවත් කිරීමට ඔබට අවශ්‍ය බව සහතිකද?
                  </p>
                  <p className="font-sinhala text-xs text-slate-450 font-bold italic">
                    මෙම ක්‍රියාව නැවත කිසිසේත් ආපසු හැරවිය නොහැක.
                  </p>
                  <p className="text-xs text-slate-450 mt-2 font-sans">
                    (Are you sure you want to permanently delete this village? This action is permanent and cannot be undone.)
                  </p>
                </div>
              )}
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center gap-3 pt-2 justify-end">
              {village.summary.total_houses > 0 ? (
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  className="w-full sm:w-auto px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl uppercase tracking-wider transition-colors"
                >
                  Close
                </button>
              ) : (
                <>
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
                    onClick={handleDeleteVillage}
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
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VillageDetailPage;
