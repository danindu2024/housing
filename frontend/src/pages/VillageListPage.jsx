import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

const VillageListPage = () => {
  const navigate = useNavigate();
  const [villages, setVillages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filtering states — debounced values sent to API
  const [searchTerm, setSearchTerm] = useState('');
  const [province, setProvince] = useState('');
  const [districtId, setDistrictId] = useState('');
  const [divisionId, setDivisionId] = useState('');
  const [gnDivision, setGnDivision] = useState('');

  // Raw input values — updated on every keystroke, debounced before hitting API
  const [searchInput, setSearchInput] = useState('');
  const [gnInput, setGnInput] = useState('');

  // Lookup reference & cascading dropdown lists
  const [districtsTree, setDistrictsTree] = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [divisions, setDivisions] = useState([]);

  // Pagination states
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  // Load districts tree reference data on mount
  useEffect(() => {
    const fetchReferences = async () => {
      try {
        const res = await api.get('/reference/districts');
        setDistrictsTree(res.data);
        const uniqueProvinces = [...new Set(res.data.map((d) => d.province))].sort();
        setProvinces(uniqueProvinces);
      } catch (err) {
        console.error('Failed to load district lookup references:', err);
      }
    };
    fetchReferences();
  }, []);

  // Debounce: commit search input to actual filter state after 400ms idle
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchTerm(searchInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Debounce: commit GN division input after 400ms idle
  useEffect(() => {
    const timer = setTimeout(() => {
      setGnDivision(gnInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [gnInput]);

  // Stable fetch function — AbortController cancels any in-flight request
  // when filters change before the previous one finishes, preventing stale data
  const fetchVillages = useCallback(
    async (signal) => {
      setLoading(true);
      setError('');
      try {
        const params = {
          page,
          per_page: 10,
        };

        if (searchTerm.trim()) params.search = searchTerm.trim();
        if (province) params.province = province;
        if (districtId) params.district_id = districtId;
        if (divisionId) params.division_id = divisionId;
        if (gnDivision.trim()) params.grama_niladhari_division = gnDivision.trim();

        const response = await api.get('/villages', { params, signal });
        setVillages(response.data.data);
        setTotalPages(response.data.meta.last_page);
        setTotalRecords(response.data.meta.total);
      } catch (err) {
        if (err.name === 'CanceledError' || err.name === 'AbortError') return; // stale request cancelled
        console.error('Failed to load villages directory:', err);
        setError('An error occurred while loading the village directory registry.');
      } finally {
        setLoading(false);
      }
    },
    [page, searchTerm, province, districtId, divisionId, gnDivision]
  );

  // Re-fetch whenever stable filter values change; cancel previous in-flight request
  useEffect(() => {
    const controller = new AbortController();
    fetchVillages(controller.signal);
    return () => controller.abort();
  }, [fetchVillages]);

  // Cascading Location Handlers
  const handleProvinceChange = (e) => {
    const selectedProv = e.target.value;
    setProvince(selectedProv);
    setDistrictId('');
    setDivisionId('');
    setGnDivision('');
    setPage(1);

    if (selectedProv) {
      const filtered = districtsTree.filter((d) => d.province === selectedProv);
      setDistricts(filtered);
    } else {
      setDistricts([]);
    }
    setDivisions([]);
  };

  const handleDistrictChange = (e) => {
    const selectedDistId = e.target.value;
    setDistrictId(selectedDistId);
    setDivisionId('');
    setGnDivision('');
    setPage(1);

    if (selectedDistId) {
      const matchedDistrict = districtsTree.find((d) => d.id === parseInt(selectedDistId));
      setDivisions(matchedDistrict?.divisions || []);
    } else {
      setDivisions([]);
    }
  };

  const handleDivisionChange = (e) => {
    setDivisionId(e.target.value);
    setGnDivision('');
    setPage(1);
  };

  const handleGnChange = (e) => {
    setGnDivision(e.target.value);
    setPage(1);
  };

  const getCategoryDisplay = (v) => {
    const code = v.category_code || v.category?.code;
    const nameSi = v.category_name || v.category?.name || '';
    const englishNames = {
      LOAN: 'Loan Village',
      GRANT: 'Grant Village',
      GRANT_INDIAN: 'Indian Grant',
      GRANT_HOUSING: 'Housing Authority Grant',
    };

    const categoryStyles = {
      LOAN: {
        bg: 'bg-sky-50/90 border-sky-200/80',
        textSi: 'text-sky-800',
        textEn: 'text-sky-600',
      },
      GRANT: {
        bg: 'bg-emerald-50/90 border-emerald-200/80',
        textSi: 'text-emerald-800',
        textEn: 'text-emerald-600',
      },
      GRANT_INDIAN: {
        bg: 'bg-amber-50/90 border-amber-200/80',
        textSi: 'text-amber-900',
        textEn: 'text-amber-700',
      },
      GRANT_HOUSING: {
        bg: 'bg-purple-50/90 border-purple-200/80',
        textSi: 'text-purple-900',
        textEn: 'text-purple-700',
      },
    };

    const style = categoryStyles[code] || {
      bg: 'bg-indigo-50/90 border-indigo-200/80',
      textSi: 'text-indigo-800',
      textEn: 'text-indigo-600',
    };

    const nameEn = englishNames[code] || '';
    return { nameSi, nameEn, style };
  };

  // Handle filter resets — also clear raw input states so UI reflects the reset
  const resetFilters = () => {
    setSearchInput('');
    setSearchTerm('');
    setGnInput('');
    setGnDivision('');
    setProvince('');
    setDistrictId('');
    setDivisionId('');
    setDistricts([]);
    setDivisions([]);
    setPage(1);
  };

  const getStatusBadge = (statusVal) => {
    if (!statusVal || statusVal === 'N/A') {
      return (
        <span className="px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-200 bg-slate-50 text-slate-500 uppercase tracking-wider inline-block">
          N/A
        </span>
      );
    }
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Villages Directory</h1>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-black bg-indigo-50 text-indigo-700 border border-indigo-200/80 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
              Total {totalRecords} Villages Registered So Far
            </span>
          </div>
        </div>
        <button
          onClick={() => navigate('/villages/new')}
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm px-6 py-3 rounded-xl shadow-md shadow-indigo-600/10 hover:shadow-indigo-500/20 transition-all flex items-center justify-center gap-2 self-start sm:self-auto"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          Register Village
        </button>
      </div>

      {/* Filter Options Panel */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="ගම්මානයේ නම අනුව සොයන්න / Search by Village Name"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-11 pr-10 py-3 rounded-xl border border-slate-300 bg-slate-50/80 text-sm font-semibold text-slate-800 placeholder-slate-500 placeholder:font-semibold focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm"
          />
          {searchInput && (
            <button
              onClick={() => setSearchInput('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
              aria-label="Clear search"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        <h3 className="text-sm font-bold tracking-wider text-slate-600 flex items-center gap-2 pt-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          පිහිටීම අනුව සොයන්න / Filter by Location
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {/* Province */}
          <div>
            <select
              value={province}
              onChange={handleProvinceChange}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 bg-slate-50 focus:bg-white focus:ring-indigo-500 focus:border-indigo-500 transition-all"
            >
              <option value="">සියලුම පළාත් (All Provinces)</option>
              {provinces.map((prov) => (
                <option key={prov} value={prov}>
                  {prov}
                </option>
              ))}
            </select>
          </div>

          {/* District */}
          <div>
            <select
              value={districtId}
              disabled={!province}
              onChange={handleDistrictChange}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 bg-slate-50 focus:bg-white focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50 transition-all"
            >
              <option value="">සියලුම දිස්ත්‍රික්ක (All Districts)</option>
              {districts.map((dist) => (
                <option key={dist.id} value={dist.id}>
                  {dist.name}
                </option>
              ))}
            </select>
          </div>

          {/* DS Division */}
          <div>
            <select
              value={divisionId}
              disabled={!districtId}
              onChange={handleDivisionChange}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 bg-slate-50 focus:bg-white focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50 transition-all"
            >
              <option value="">සියලුම ප්‍රාදේශීය ලේකම් (All DS)</option>
              {divisions.map((div) => (
                <option key={div.id} value={div.id}>
                  {div.name}
                </option>
              ))}
            </select>
          </div>

          {/* GN Division */}
          <div>
            <input
              type="text"
              placeholder="ග්‍රාමනිළධාරී කොට්ඨාශය (GN Division)"
              value={gnInput}
              onChange={(e) => setGnInput(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 bg-slate-50 placeholder-slate-400 focus:bg-white focus:ring-indigo-500 focus:border-indigo-500 transition-all"
            />
          </div>
        </div>

        {(searchInput || province || districtId || divisionId || gnInput) && (
          <div className="mt-4 pt-4 border-t border-slate-100 flex justify-end">
            <button
              onClick={resetFilters}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors uppercase tracking-wider"
            >
              Clear Location Filters
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
          <h3 className="font-bold text-slate-800 text-base">No Villages Found</h3>
          <p className="text-slate-500 text-xs mt-1">No Village Registered Under the Selected Filters</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wider">
                  <th className="px-6 py-4.5">Village Info</th>
                  <th className="px-6 py-4.5">Location Info</th>
                  <th className="px-6 py-4.5 text-center">Houses Register Progress</th>
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
                        <div className="mt-1">
                          {(() => {
                            const { nameSi, nameEn, style } = getCategoryDisplay(v);
                            return (
                              <div className={`inline-flex flex-col border px-2.5 py-1 rounded-lg ${style.bg}`}>
                                <span className={`text-xs font-extrabold leading-tight ${style.textSi}`}>{nameSi}</span>
                                {nameEn && (
                                  <span className={`text-[10px] font-bold leading-tight mt-0.5 ${style.textEn}`}>{nameEn}</span>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5.5">
                      <div className="space-y-1">
                        <span className="text-sm font-extrabold text-slate-800 block">
                          {v.district_name || v.division?.district}
                        </span>
                        <p className="text-xs text-slate-600 font-bold">
                          DS: {v.division_name || v.division?.name}
                        </p>
                        {v.grama_niladhari_division && (
                          <p className="text-xs text-slate-500 font-medium">
                            GN: {v.grama_niladhari_division}
                          </p>
                        )}
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
                    <td className="px-6 py-5.5 text-right">
                      <button
                        onClick={() => navigate(`/villages/${v.id}`)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 border border-slate-200 hover:border-indigo-200 text-xs font-bold text-indigo-650 hover:text-white bg-slate-50/50 hover:bg-indigo-600 rounded-xl transition-all shadow-sm active:scale-95"
                      >
                        <span>View Village</span>
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
