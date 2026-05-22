import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import HouseForm from '../components/house/HouseForm';

const VillageDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  // Page States
  const [village, setVillage] = useState(null);
  const [houses, setHouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [housesLoading, setHousesLoading] = useState(true);
  const [error, setError] = useState('');

  // House Directory Filter States
  const [stageCode, setStageCode] = useState('');
  const [occupancyStatus, setOccupancyStatus] = useState('');
  const [isHouseSold, setIsHouseSold] = useState('');
  const [isLandSold, setIsLandSold] = useState('');

  // Form Modal States
  const [showHouseModal, setShowHouseModal] = useState(false);

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
      const params = {};
      if (stageCode) params.stage_code = stageCode;
      if (occupancyStatus) params.occupancy_status = occupancyStatus;
      if (isHouseSold !== '') params.is_house_sold = isHouseSold;
      if (isLandSold !== '') params.is_land_sold = isLandSold;

      const response = await api.get(`/villages/${id}/houses`, { params });
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
  }, [id, stageCode, occupancyStatus, isHouseSold, isLandSold]);

  const handleHouseCreated = () => {
    setShowHouseModal(false);
    // Refresh both village counts and houses list in-memory dynamically!
    fetchVillageDetail();
    fetchHousesList();
  };

  const getStageBadge = (stage) => {
    const stageCode = stage?.code;
    const label = stage?.label || 'Unknown';

    if (stageCode === 'FULLY_DEVELOPED') {
      return <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] font-semibold">{label}</span>;
    }
    if (stageCode === 'NO_FOUNDATION') {
      return <span className="px-2 py-0.5 rounded bg-slate-50 text-slate-500 border border-slate-100 text-[10px] font-semibold">{label}</span>;
    }
    return <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-100 text-[10px] font-semibold">{label}</span>;
  };

  const getOccupancyBadge = (status) => {
    const badges = {
      BORROWER_LIVING: 'text-slate-700 font-semibold',
      SOLD: 'text-rose-600 font-bold bg-rose-50 border border-rose-100 px-2 py-0.5 rounded',
      ABANDONED: 'text-amber-600 font-semibold bg-amber-50 border border-amber-100 px-2 py-0.5 rounded',
      NOT_APPLICABLE: 'text-slate-400 font-medium',
    };
    const labels = {
      BORROWER_LIVING: 'Occupant',
      SOLD: 'Sold (Transferred)',
      ABANDONED: 'Abandoned',
      NOT_APPLICABLE: 'None',
    };
    return <span className={`text-xs ${badges[status] || ''}`}>{labels[status] || status}</span>;
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
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                isLoanVillage ? 'bg-indigo-500 text-white shadow-sm' : 'bg-amber-500 text-white shadow-sm'
              }`}>
                {village.category_code === 'LOAN' ? 'ණය' : village.category_code === 'GRANT' ? 'ආධාර' : village.category_name}
              </span>
              {village.development_project_name_si && (
                <span className="px-2 py-0.5 rounded bg-slate-700 text-slate-100 text-[10px] font-black uppercase tracking-wider shadow-sm">
                  {village.development_project_name_si}
                </span>
              )}
              <span className="text-[10px] font-semibold text-slate-400">Owner: {village.ownership_body_name_si}</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight">{village.name}</h1>
            <p className="text-xs text-slate-400 font-medium">
              Administrative Location: {village.division_name} Division, {village.district_name} District &bull; GN: {village.grama_niladhari_division}
            </p>
          </div>

          <div className="flex items-center gap-3 relative z-10">
            <button
              onClick={() => setShowHouseModal(true)}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase tracking-wider px-6 py-3.5 rounded-xl shadow-lg shadow-indigo-600/10 hover:shadow-indigo-500/20 transition-all flex items-center gap-2"
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
        {village.is_conservation_area && (
          <div className="px-8 py-4 bg-rose-500/10 border-b border-rose-100 text-rose-800 text-xs font-semibold flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse flex-shrink-0" />
            <span>WARNING: This housing development is inside a declared Forest/Wildlife Conservation Boundary! Land sales inside this boundary are strictly illegal.</span>
          </div>
        )}

        {/* Notes & dates */}
        <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50/50">
          <div className="md:col-span-2 space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Field Survey Notes</span>
            <p className="text-xs text-slate-600 font-medium leading-relaxed">{village.notes || 'No detailed field notes are recorded for this village.'}</p>
          </div>
          <div className="space-y-1 border-t md:border-t-0 md:border-l border-slate-200 pt-4 md:pt-0 md:pl-6">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Investigative Schedule</span>
            <div className="text-xs text-slate-600 font-semibold space-y-1 mt-1">
              <p>Commenced: {village.program_start_date || 'Unknown'}</p>

            </div>
          </div>
        </div>
      </div>

      {/* Village summary Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Recorded Houses</span>
          <p className="text-2xl font-black text-slate-800">{village.summary.total_houses} / {village.total_planned_houses}</p>
          <span className="text-[10px] text-slate-500 font-medium block">Allotment registration</span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Fully Developed</span>
          <p className="text-2xl font-black text-emerald-600">{village.summary.fully_developed}</p>
          <span className="text-[10px] text-slate-500 font-medium block">Roof & plastering done</span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Unlawful Transfers</span>
          <p className="text-2xl font-black text-rose-600">
            {parseInt(village.summary.land_sold_count) + parseInt(village.summary.house_sold_count)}
          </p>
          <span className="text-[10px] text-slate-500 font-medium block">Sold properties & allotments</span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Active Open Issues</span>
          <p className="text-2xl font-black text-amber-600">{village.summary.open_issues}</p>
          <span className="text-[10px] text-slate-500 font-medium block">Pending DS audit actions</span>
        </div>
      </div>

      {/* Houses list Section */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-800 tracking-tight">Recorded Houses Ledger</h2>

        {/* Houses filtering panel */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <select
                value={stageCode}
                onChange={(e) => setStageCode(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-slate-50 focus:bg-white transition-all"
              >
                <option value="">All Progress Stages</option>
                <option value="NO_FOUNDATION">No Foundation</option>
                <option value="FULLY_DEVELOPED">House Fully Developed</option>
              </select>
            </div>

            <div>
              <select
                value={occupancyStatus}
                onChange={(e) => setOccupancyStatus(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-slate-50 focus:bg-white transition-all"
              >
                <option value="">All Occupancies</option>
                <option value="BORROWER_LIVING">Borrower Living</option>
                <option value="SOLD">Property Transferred (Sold)</option>
                <option value="ABANDONED">Abandoned</option>
              </select>
            </div>

            <div>
              <select
                value={isLandSold}
                onChange={(e) => setIsLandSold(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-slate-50 focus:bg-white transition-all"
              >
                <option value="">All Land Statuses</option>
                <option value="1">Allotment Land Sold</option>
                <option value="0">Allotment Land Intact</option>
              </select>
            </div>
          </div>

          {(stageCode || occupancyStatus || isLandSold !== '') && (
            <button
              onClick={() => {
                setStageCode('');
                setOccupancyStatus('');
                setIsLandSold('');
                setIsHouseSold('');
              }}
              className="text-xs font-bold text-slate-400 hover:text-indigo-600 transition-colors uppercase tracking-wider mt-2 md:mt-0"
            >
              Reset Filters
            </button>
          )}
        </div>

        {/* Houses Ledger Table */}
        {housesLoading ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 flex flex-col items-center justify-center">
            <div className="w-8 h-8 border-2 border-slate-100 border-t-indigo-600 rounded-full animate-spin mb-4" />
            <p className="text-slate-400 text-xs font-medium">Updating houses directory...</p>
          </div>
        ) : houses.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center text-slate-400 text-xs font-medium">
            No house records match your current directory filters. Click 'Register House' to seed a new unit.
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="px-6 py-4">House No</th>
                    <th className="px-6 py-4">Allotment Owner Details</th>
                    <th className="px-6 py-4">Construction Stage</th>
                    <th className="px-6 py-4">Occupant status</th>
                    {isLoanVillage && <th className="px-6 py-4 text-center">Loan issued</th>}
                    <th className="px-6 py-4">Illegal sale</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm text-slate-600">
                  {houses.map((h) => (
                    <tr key={h.id} className="hover:bg-slate-50/30 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-800">{h.house_number}</td>
                      <td className="px-6 py-4">
                        <div>
                          <span className="font-semibold text-slate-800">{h.owner_name}</span>
                          <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                            NIC: {h.owner_nic} &bull; Ph: {h.owner_contact || 'None'}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">{getStageBadge(h.construction_stage)}</td>
                      <td className="px-6 py-4">{getOccupancyBadge(h.occupancy_status)}</td>
                      {isLoanVillage && (
                        <td className="px-6 py-4 text-center">
                          {h.has_loan ? (
                            <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[10px] font-bold border border-indigo-100">
                              LKR Active
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs">-</span>
                          )}
                        </td>
                      )}
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-0.5">
                          {h.is_land_sold && (
                            <span className="text-[9px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded w-max">
                              Land Sold
                            </span>
                          )}
                          {h.is_house_sold && (
                            <span className="text-[9px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded w-max mt-0.5">
                              House Sold
                            </span>
                          )}
                          {!h.is_land_sold && !h.is_house_sold && (
                            <span className="text-slate-400 text-xs">No</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Register House Sliding Modal */}
      {showHouseModal && (
        <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-end bg-slate-900/50 backdrop-blur-sm">
          <div className="w-full max-w-xl bg-white h-screen shadow-2xl flex flex-col animate-slide-in">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="font-bold text-slate-800">Register Allotment House</h3>
                <p className="text-[10px] text-slate-500 mt-0.5">Initialize a structure in village {village.name}</p>
              </div>
              <button
                onClick={() => setShowHouseModal(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 p-6 overflow-y-auto">
              <HouseForm
                villageId={id}
                isLoanVillage={isLoanVillage}
                onSuccess={handleHouseCreated}
                onClose={() => setShowHouseModal(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VillageDetailPage;
