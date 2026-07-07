import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const DashboardPage = () => {
  // Filters State
  const [selectedProvince, setSelectedProvince] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedDivision, setSelectedDivision] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedOwnership, setSelectedOwnership] = useState('');

  // Lookup Reference Data
  const [provinces, setProvinces] = useState([]);
  const [districtsTree, setDistrictsTree] = useState([]);
  const [filteredDistricts, setFilteredDistricts] = useState([]);
  const [filteredDivisions, setFilteredDivisions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [ownershipBodies, setOwnershipBodies] = useState([]);

  // Data States
  const [summaryData, setSummaryData] = useState(null);
  const [progressData, setProgressData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // 1. Fetch reference lookup data
  useEffect(() => {
    const fetchReferences = async () => {
      try {
        const [catRes, bodyRes, distRes] = await Promise.all([
          api.get('/reference/village-categories'),
          api.get('/reference/land-ownership-bodies'),
          api.get('/reference/districts'),
        ]);

        setCategories(catRes.data);
        setOwnershipBodies(bodyRes.data);
        setDistrictsTree(distRes.data);

        // Unique provinces
        const uniqueProvinces = [...new Set(distRes.data.map((d) => d.province))].sort();
        setProvinces(uniqueProvinces);
      } catch (err) {
        console.error('Failed to load lookup references:', err);
      }
    };

    fetchReferences();
  }, []);

  // 2. Cascade districts when province changes
  useEffect(() => {
    if (selectedProvince) {
      const filtered = districtsTree.filter((d) => d.province === selectedProvince);
      setFilteredDistricts(filtered);
    } else {
      setFilteredDistricts([]);
    }
    setSelectedDistrict('');
    setSelectedDivision('');
    setFilteredDivisions([]);
  }, [selectedProvince, districtsTree]);

  // 3. Cascade divisions when district changes
  useEffect(() => {
    if (selectedDistrict) {
      const match = districtsTree.find((d) => d.id === parseInt(selectedDistrict));
      setFilteredDivisions(match ? match.divisions : []);
    } else {
      setFilteredDivisions([]);
    }
    setSelectedDivision('');
  }, [selectedDistrict, districtsTree]);

  // 4. Fetch dashboard data based on current filters
  const fetchDashboardData = async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (selectedProvince) params.province = selectedProvince;
      if (selectedDistrict) params.district_id = selectedDistrict;
      if (selectedDivision) params.division_id = selectedDivision;
      if (selectedCategory) params.category = selectedCategory;
      if (selectedStatus) params.status = selectedStatus;
      if (selectedOwnership) params.ownership_body_id = selectedOwnership;

      const [summaryRes, progressRes] = await Promise.all([
        api.get('/dashboard/summary', { params }),
        api.get('/dashboard/construction-progress', { params }),
      ]);

      setSummaryData(summaryRes.data);
      setProgressData(progressRes.data);
    } catch (err) {
      console.error('Error fetching dashboard insights:', err);
      setError('Could not retrieve data analysis stats from the backend server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [
    selectedProvince,
    selectedDistrict,
    selectedDivision,
    selectedCategory,
    selectedStatus,
    selectedOwnership,
  ]);

  // Reset Filters handler
  const resetFilters = () => {
    setSelectedProvince('');
    setSelectedDistrict('');
    setSelectedDivision('');
    setSelectedCategory('');
    setSelectedStatus('');
    setSelectedOwnership('');
  };

  // Helper to format currency
  const formatLKR = (value) => {
    return new Intl.NumberFormat('en-LK', {
      style: 'currency',
      currency: 'LKR',
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Color Palette Constants for Premium Look
  const COLORS_PRIMARY = ['#6366f1', '#a855f7', '#f43f5e', '#10b981', '#f59e0b', '#3b82f6'];
  const COLORS_STATUS = {
    OPEN: '#10b981',
    CLOSED: '#94a3b8',
  };

  // Loading Overlay
  if (loading && !summaryData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <div className="w-12 h-12 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin" />
        <p className="text-slate-500 font-medium">Aggregating real-time stats...</p>
      </div>
    );
  }

  // Pre-process chart data
  const categoryChartData = summaryData?.villages.category_breakdown
    ? summaryData.villages.category_breakdown.map((item) => ({
        name: item.name || item.code,
        value: parseInt(item.count),
      }))
    : [];

  const statusChartData = summaryData
    ? [
        { name: 'Open / විවෘතයි', value: summaryData.villages.open, color: COLORS_STATUS.OPEN },
        { name: 'Closed / විවෘත නොවේ', value: summaryData.villages.closed, color: COLORS_STATUS.CLOSED },
      ].filter((d) => d.value > 0)
    : [];

  const ownershipChartData = summaryData?.villages.ownership_breakdown
    ? summaryData.villages.ownership_breakdown.map((item) => ({
        name: item.name || item.code,
        count: parseInt(item.count),
      }))
    : [];

  // Loan statuses
  const loanStatusChartData = summaryData
    ? [
        { name: 'Fully Paid', value: summaryData.loans.fully_paid },
        { name: 'Currently Paying', value: summaryData.loans.currently_paying },
        { name: 'Partially Paid', value: summaryData.loans.partially_paid },
        { name: 'Not Paid', value: summaryData.loans.not_paid },
      ].filter((d) => d.value > 0)
    : [];

  // Occupancy statuses
  const occupancyChartData = summaryData?.occupancy
    ? summaryData.occupancy.map((item) => {
        const labels = {
          BORROWER_LIVING: 'Borrower Living',
          SOLD: 'Sold',
          ABANDONED: 'Abandoned',
          NOT_APPLICABLE: 'Not Applicable',
        };
        return {
          name: labels[item.occupancy_status] || item.occupancy_status,
          value: parseInt(item.count),
        };
      }).filter((d) => d.value > 0)
    : [];

  // Financial KPI calculations
  const totalDisbursed = summaryData?.loans.total_disbursed || 0;
  const totalRecovered = summaryData?.loans.total_recovered || 0;
  const recoveryRate = totalDisbursed > 0 ? (totalRecovered / totalDisbursed) * 100 : 0;

  return (
    <div className="space-y-8 pb-12">
      {/* Dynamic Interactive Filter Panel */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
            <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Live Filters Panel
          </h3>
          <button
            onClick={resetFilters}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors uppercase tracking-wider flex items-center gap-1.5"
          >
            Clear Filters
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {/* Province */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Province</label>
            <select
              value={selectedProvince}
              onChange={(e) => setSelectedProvince(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer"
            >
              <option value="">All Provinces</option>
              {provinces.map((prov) => (
                <option key={prov} value={prov}>
                  {prov}
                </option>
              ))}
            </select>
          </div>

          {/* District */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">District</label>
            <select
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
              disabled={!selectedProvince}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">All Districts</option>
              {filteredDistricts.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          {/* DS Division */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">DS Division</label>
            <select
              value={selectedDivision}
              onChange={(e) => setSelectedDivision(e.target.value)}
              disabled={!selectedDistrict}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">All Divisions</option>
              {filteredDivisions.map((div) => (
                <option key={div.id} value={div.id}>
                  {div.name}
                </option>
              ))}
            </select>
          </div>

          {/* Village Category */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer"
            >
              <option value="">All Programme Types</option>
              {categories.map((c) => (
                <option key={c.id} value={c.code}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Public Access</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer"
            >
              <option value="">All Public Access Statuses</option>
              <option value="OPEN">Open / විවෘතයි</option>
              <option value="CLOSED">Closed / විවෘත නොවේ</option>
            </select>
          </div>

          {/* Land Ownership Body */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Ownership Body</label>
            <select
              value={selectedOwnership}
              onChange={(e) => setSelectedOwnership(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer"
            >
              <option value="">All Land Owners</option>
              {ownershipBodies.map((ob) => (
                <option key={ob.id} value={ob.id}>
                  {ob.name_en || ob.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 px-6 py-4 rounded-2xl border border-red-100 flex items-center gap-3">
          <svg className="w-5 h-5 text-red-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span className="text-sm font-medium">{error}</span>
        </div>
      )}

      {/* Row 1: KPI Summary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* KPI 1 */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Villages</p>
            <h3 className="text-3xl font-extrabold text-slate-800">{summaryData?.villages.total || 0}</h3>
            <p className="text-slate-500 text-xs">
              {summaryData?.villages.category_breakdown
                ? summaryData.villages.category_breakdown.map((c) => `${c.count} ${c.name || c.code}`).join(' | ')
                : 'No registered program villages'}
            </p>
          </div>
          <div className="p-4 bg-indigo-50 rounded-2xl text-indigo-600">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Registered Houses</p>
            <h3 className="text-3xl font-extrabold text-slate-800">{summaryData?.houses.total || 0}</h3>
            <p className="text-slate-500 text-xs">
              {summaryData?.houses.fully_developed || 0} Fully developed houses registered
            </p>
          </div>
          <div className="p-4 bg-emerald-50 rounded-2xl text-emerald-600">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </div>
        </div>

        {/* KPI 3 */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Planned Houses</p>
            <h3 className="text-3xl font-extrabold text-slate-800">{summaryData?.houses.total_planned || 0}</h3>
            <div className="flex items-center gap-2 mt-1">
              <div className="w-24 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-indigo-500 h-full rounded-full"
                  style={{
                    width: `${
                      summaryData?.houses.total_planned > 0
                        ? Math.min(100, (summaryData.houses.total / summaryData.houses.total_planned) * 100)
                        : 0
                    }%`,
                  }}
                />
              </div>
              <span className="text-[10px] text-indigo-600 font-bold">
                {summaryData?.houses.total_planned > 0
                  ? Math.round((summaryData.houses.total / summaryData.houses.total_planned) * 100)
                  : 0}
                % recorded
              </span>
            </div>
          </div>
          <div className="p-4 bg-purple-50 rounded-2xl text-purple-600">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
          </div>
        </div>
      </div>

      {/* Row 2: Village Analysis (Three Charts Side-by-Side/Grid) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Category Breakdown (Donut Chart) */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
          <h4 className="text-sm font-bold text-slate-700 tracking-tight">Village Programme Category</h4>
          <div className="h-64 flex items-center justify-center relative">
            {categoryChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {categoryChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS_PRIMARY[index % COLORS_PRIMARY.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val) => [`${val} Villages`]} />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-slate-400 text-xs">No data for filters selected</p>
            )}
          </div>
        </div>

        {/* Status Breakdown (Donut Chart) */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
          <h4 className="text-sm font-bold text-slate-700 tracking-tight">Public Access Status</h4>
          <div className="h-64 flex items-center justify-center relative">
            {statusChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {statusChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val) => [`${val} Villages`]} />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-slate-400 text-xs">No data for filters selected</p>
            )}
          </div>
        </div>

        {/* Land Ownership Body Breakdown (Horizontal Bar Chart) */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
          <h4 className="text-sm font-bold text-slate-700 tracking-tight">Land Ownership Distribution</h4>
          <div className="h-64 flex items-center justify-center">
            {ownershipChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ownershipChartData} layout="vertical" margin={{ left: 10, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis type="number" stroke="#94a3b8" fontSize={11} />
                  <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={11} width={80} />
                  <Tooltip formatter={(val) => [`${val} Villages`]} />
                  <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-slate-400 text-xs">No data for ownership distribution</p>
            )}
          </div>
        </div>
      </div>

      {/* Row 3: Construction Progress Funnel (Full Width Horizontal Bar Chart) */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h4 className="text-sm font-bold text-slate-700 tracking-tight">Construction Development Funnel</h4>
            <p className="text-xs text-slate-400">Total house construction progression across 8 unified phases</p>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs font-semibold text-slate-500">
            <div className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 bg-indigo-500 rounded-full" />
              Not Started / Under Construction
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full" />
              Fully Developed (Stage 8)
            </div>
          </div>
        </div>
        <div className="h-80 flex items-center justify-center">
          {progressData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={progressData} margin={{ top: 10, right: 30, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="stage_label" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip formatter={(val) => [`${val} Houses`]} />
                <Bar
                  dataKey="count"
                  radius={[6, 6, 0, 0]}
                  fill="#6366f1"
                >
                  {progressData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.stage_order === 8 ? '#10b981' : '#6366f1'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-slate-400 text-xs">No construction progress metrics registered.</p>
          )}
        </div>
      </div>

      {/* Row 4: Financial/Loan Performance & Occupancy Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Side: Loan performance */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-6 flex flex-col justify-between">
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-bold text-slate-700 tracking-tight">Loan Recovery & Performance Ledger</h4>
              <p className="text-xs text-slate-400">Aggregated cash collections vs active capital investments</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Disbursed</p>
                <h5 className="text-md font-bold text-slate-700 mt-1">{formatLKR(totalDisbursed)}</h5>
              </div>
              <div className="bg-emerald-50/50 rounded-2xl p-4 border border-emerald-100/50">
                <p className="text-[10px] font-bold text-emerald-600/80 uppercase tracking-wider">Total Recovered</p>
                <h5 className="text-md font-bold text-emerald-700 mt-1">{formatLKR(totalRecovered)}</h5>
              </div>
              <div className="bg-indigo-50/50 rounded-2xl p-4 border border-indigo-100/50">
                <p className="text-[10px] font-bold text-indigo-600/80 uppercase tracking-wider">Recovery Rate</p>
                <h5 className="text-md font-extrabold text-indigo-700 mt-1">{recoveryRate.toFixed(1)}%</h5>
              </div>
            </div>
          </div>

          <div className="h-64 flex items-center justify-center pt-4">
            {loanStatusChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={loanStatusChartData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} />
                  <Tooltip formatter={(val) => [`${val} Loans`]} />
                  <Bar dataKey="value" fill="#a855f7" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-slate-400 text-xs">No active loan records detected matching current scope filters.</p>
            )}
          </div>
        </div>

        {/* Right Side: Land Issues and Occupancy */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-6 flex flex-col justify-between">
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-bold text-slate-700 tracking-tight">Land Ownership & Occupancy Insights</h4>
              <p className="text-xs text-slate-400">Environmental conservation violations and residency statuses</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
              <div className="bg-rose-50/40 rounded-2xl p-3 border border-rose-100/50 flex flex-col justify-between">
                <span className="text-[10px] font-bold text-rose-600/90 uppercase tracking-wider">Conservation Zones</span>
                <span className="text-lg font-black text-rose-700 mt-1">{summaryData?.land_issues.conservation_area_villages || 0}</span>
              </div>
              <div className="bg-amber-50/40 rounded-2xl p-3 border border-amber-100/50 flex flex-col justify-between">
                <span className="text-[10px] font-bold text-amber-600/90 uppercase tracking-wider">Infra Issues</span>
                <span className="text-lg font-black text-amber-700 mt-1">{summaryData?.land_issues.infrastructure_issue_villages || 0}</span>
              </div>
              <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100 flex flex-col justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Land Sold</span>
                <span className="text-lg font-black text-slate-600 mt-1">{summaryData?.land_issues.land_sold_houses || 0}</span>
              </div>
              <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100 flex flex-col justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">House Sold</span>
                <span className="text-lg font-black text-slate-600 mt-1">{summaryData?.land_issues.house_sold_houses || 0}</span>
              </div>
            </div>
          </div>

          <div className="h-64 flex items-center justify-center pt-4">
            {occupancyChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={occupancyChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {occupancyChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS_PRIMARY[(index + 3) % COLORS_PRIMARY.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val) => [`${val} Houses`]} />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-slate-400 text-xs">No occupancy records available in this configuration.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
