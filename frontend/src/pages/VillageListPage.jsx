import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

const VillageListPage = () => {
  const navigate = useNavigate();
  const [villages, setVillages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filtering states
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [isConservation, setIsConservation] = useState('');
  const [infraIssue, setInfraIssue] = useState('');

  // Pagination states
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  const fetchVillages = async () => {
    setLoading(true);
    setError('');
    try {
      const params = {
        page,
        per_page: 10,
      };

      if (category) params.category = category;
      if (status) params.status = status;
      if (isConservation) params.is_conservation_area = isConservation;
      if (infraIssue) params.infrastructure_issue = infraIssue;

      const response = await api.get('/villages', { params });
      setVillages(response.data.data);
      setTotalPages(response.data.meta.last_page);
      setTotalRecords(response.data.meta.total);
    } catch (err) {
      console.error('Failed to load villages directory:', err);
      setError('An error occurred while loading the village directory registry.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVillages();
  }, [page, category, status, isConservation, infraIssue]);

  // Handle filter resets
  const resetFilters = () => {
    setCategory('');
    setStatus('');
    setIsConservation('');
    setInfraIssue('');
    setPage(1);
  };

  const getStatusBadge = (statusVal) => {
    const badges = {
      OPEN: 'bg-emerald-50/70 text-emerald-700 border-emerald-100/80 shadow-sm',
      CLOSED: 'bg-rose-50/70 text-rose-700 border-rose-100/80 shadow-sm',
    };
    const labels = {
      OPEN: 'මහජනතාව සඳහා විවෘතයි',
      CLOSED: 'විවෘත කර නැත',
    };
    return (
      <span className={`px-3 py-1.5 rounded-xl text-xs font-bold border uppercase tracking-wider inline-block ${badges[statusVal] || 'bg-slate-50 text-slate-700'}`}>
        {labels[statusVal] || statusVal}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Villages Directory</h1>
          <p className="text-slate-500 text-xs mt-1">Total {totalRecords} development sites initialized across the country.</p>
        </div>
        <button
          onClick={() => navigate('/villages/new')}
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm px-6 py-3 rounded-xl shadow-md shadow-indigo-600/10 hover:shadow-indigo-500/20 transition-all flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          Register Village
        </button>
      </div>

      {/* Filter Options Panel */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          Filter Investigations
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <select
              value={category}
              onChange={(e) => { setCategory(e.target.value); setPage(1); }}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 bg-slate-50 focus:bg-white focus:ring-indigo-500 focus:border-indigo-500 transition-all"
            >
              <option value="">සියලුම ක්‍රමවේද</option>
              <option value="LOAN">ණය</option>
              <option value="GRANT">ආධාර</option>
            </select>
          </div>

          <div>
            <select
              value={status}
              onChange={(e) => { setStatus(e.target.value); setPage(1); }}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 bg-slate-50 focus:bg-white focus:ring-indigo-500 focus:border-indigo-500 transition-all"
            >
              <option value="">සියලුම ග්‍රාම සංවර්ධන මට්ටම්</option>
              <option value="OPEN">මහජනතාව සඳහා විවෘතයි</option>
              <option value="CLOSED">විවෘත කර නැත</option>
            </select>
          </div>

          <div>
            <select
              value={isConservation}
              onChange={(e) => { setIsConservation(e.target.value); setPage(1); }}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 bg-slate-50 focus:bg-white focus:ring-indigo-500 focus:border-indigo-500 transition-all"
            >
              <option value="">සියලුම පරිසර කලාප (All Env Zones)</option>
              <option value="1">සංරක්ෂිත කලාප තුල (Inside Conservation)</option>
              <option value="0">සංරක්ෂිත නොවන (Outside Conservation)</option>
              <option value="WILDLIFE">වන ජීවී (Wildlife)</option>
              <option value="FOREST">වන සංරක්ෂණ (Forest)</option>
              <option value="COASTAL">වෙරල සංරක්ෂණ (Coastal)</option>
              <option value="ARCHAEOLOGICAL">පුරාවිද්‍යා (Archaeological)</option>
              <option value="SACRED">පූජා භූමි (Sacred Land)</option>
              <option value="OTHER">වෙනත් සංරක්ෂණ (Other)</option>
            </select>
          </div>

          <div>
            <select
              value={infraIssue}
              onChange={(e) => { setInfraIssue(e.target.value); setPage(1); }}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 bg-slate-50 focus:bg-white focus:ring-indigo-500 focus:border-indigo-500 transition-all"
            >
              <option value="">සියලුම යටිතල පහසුකම් ගැටළු</option>
              <option value="WATER">ජලය</option>
              <option value="ELECTRICITY">විදුලිය</option>
              <option value="ACCESS_ROADS">ගමට ප්‍රවේශ මාර්ග</option>
              <option value="INTERNAL_ROADS">අභ්‍යන්තර මාර්ග</option>
              <option value="OTHER">වෙනත් පොදු පහසුකම්</option>
            </select>
          </div>
        </div>

        {(category || status || isConservation !== '' || infraIssue !== '') && (
          <div className="mt-4 pt-4 border-t border-slate-100 flex justify-end">
            <button
              onClick={resetFilters}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors uppercase tracking-wider"
            >
              Clear Filter Tags
            </button>
          </div>
        )}
      </div>

      {/* Directory Table Grid */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-20 flex flex-col items-center justify-center">
          <div className="w-10 h-10 border-4 border-slate-100 border-t-indigo-600 rounded-full animate-spin mb-4" />
          <p className="text-slate-500 text-sm font-semibold">Retrieving investigation files...</p>
        </div>
      ) : error ? (
        <div className="bg-rose-50 border border-rose-100 rounded-2xl p-6 text-center text-sm font-semibold text-rose-600">
          {error}
        </div>
      ) : villages.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-16 text-center">
          <svg className="w-12 h-12 text-slate-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="font-bold text-slate-800 text-base">No Villages Found</h3>
          <p className="text-slate-500 text-xs mt-1">Try modifying your filters or initialize a new development site.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-200 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <th className="px-6 py-4.5">Village Info</th>
                  <th className="px-6 py-4.5">Structure</th>
                  <th className="px-6 py-4.5">Regional Division</th>
                  <th className="px-6 py-4.5 text-center">Recorded Houses Progress</th>
                  <th className="px-6 py-4.5">Status</th>
                  <th className="px-6 py-4.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-650">
                {villages.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50/30 transition-colors">
                    <td className="px-6 py-5.5">
                      <div className="space-y-1.5">
                        <span 
                          onClick={() => navigate(`/villages/${v.id}`)}
                          className="font-extrabold text-slate-800 text-base hover:text-indigo-650 cursor-pointer transition-colors block"
                        >
                          {v.name}
                        </span>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          {v.development_project && (
                            <span className="text-xs bg-indigo-50/70 text-indigo-700 border border-indigo-100/60 px-2.5 py-0.5 rounded-lg font-bold uppercase tracking-wide">
                              {v.development_project.name_si}
                            </span>
                          )}
                          <span className="text-xs bg-slate-100/80 text-slate-650 px-2.5 py-0.5 rounded-lg border border-slate-200/50 font-medium">
                            GN: {v.grama_niladhari_division}
                          </span>
                          {v.is_conservation_area && v.is_conservation_area !== 'NONE' && (
                            <span className="text-xs bg-rose-50/70 text-rose-600 border border-rose-100/60 px-2.5 py-0.5 rounded-lg font-bold flex items-center gap-1 shadow-sm">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                              {v.is_conservation_area === 'WILDLIFE' ? 'වන ජීවී' :
                               v.is_conservation_area === 'FOREST' ? 'වන සංරක්ෂණ' :
                               v.is_conservation_area === 'COASTAL' ? 'වෙරල සංරක්ෂණ' :
                               v.is_conservation_area === 'ARCHAEOLOGICAL' ? 'පුරාවිද්‍යා' :
                               v.is_conservation_area === 'SACRED' ? 'පූජා භූමි' : 'සංරක්ෂිත කලාපය'}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5.5">
                      <div className="space-y-1">
                        <span className="text-sm font-bold text-slate-700">
                          {v.category.code === 'LOAN' ? 'ණය' : v.category.code === 'GRANT' ? 'ආධාර' : v.category.name}
                        </span>
                        <p className="text-xs text-slate-400 font-semibold">Owner: {v.ownership_body.name_si}</p>
                      </div>
                    </td>
                    <td className="px-6 py-5.5">
                      <div className="space-y-1">
                        <span className="text-sm font-bold text-slate-700">{v.division.name}</span>
                        <p className="text-xs text-slate-400 font-semibold">{v.division.district} District</p>
                      </div>
                    </td>
                    <td className="px-6 py-5.5">
                      <div className="space-y-2 max-w-xs mx-auto">
                        <div className="flex justify-between items-center text-xs font-bold text-slate-800">
                          <span>{v.total_houses_recorded} / {v.total_planned_houses} Houses</span>
                          <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-[10px] font-black">
                            {v.total_planned_houses > 0 ? Math.round((v.total_houses_recorded / v.total_planned_houses) * 100) : 0}%
                          </span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50 shadow-inner">
                          <div 
                            className="h-full bg-indigo-600 rounded-full transition-all duration-500 shadow-sm shadow-indigo-600/30" 
                            style={{ width: `${v.total_planned_houses > 0 ? Math.min(100, (v.total_houses_recorded / v.total_planned_houses) * 100) : 0}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5.5">{getStatusBadge(v.status)}</td>
                    <td className="px-6 py-5.5 text-right">
                      <button
                        onClick={() => navigate(`/villages/${v.id}`)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 border border-slate-200 hover:border-indigo-200 text-xs font-bold text-indigo-650 hover:text-white bg-slate-50/50 hover:bg-indigo-600 rounded-xl transition-all shadow-sm active:scale-95"
                      >
                        <span>Inspect Site</span>
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

          {/* Table Pagination */}
          {totalPages > 1 && (
            <div className="p-6 border-t border-slate-100 bg-slate-50/20 flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">
                Showing Page {page} of {totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 text-xs font-bold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-2 text-xs font-bold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default VillageListPage;
