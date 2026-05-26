import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import BulkHouseUpload from './BulkHouseUpload';

const SECTION_ICON = ({ children }) => (
  <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 flex-shrink-0">
    {children}
  </div>
);

const FormSection = ({ title, icon, children }) => (
  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
    <div className="px-8 py-5 border-b border-slate-100 flex items-center gap-3 bg-slate-50/60">
      <SECTION_ICON>{icon}</SECTION_ICON>
      <h3 className="text-sm font-black uppercase tracking-widest text-indigo-600">{title}</h3>
    </div>
    <div className="p-8">{children}</div>
  </div>
);

const FieldLabel = ({ children, required }) => (
  <label className="block text-sm font-bold uppercase tracking-wider text-slate-500 mb-2">
    {children} {required && <span className="text-rose-400 normal-case tracking-normal font-semibold">*</span>}
  </label>
);

const inputCls = "w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-base focus:bg-white focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition-all outline-none";
const selectCls = `${inputCls} cursor-pointer`;

export default function HouseForm({ villageId, isLoanVillage, onSuccess, onClose }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('single'); // 'single' | 'bulk'
  
  // Dynamic Villages list states
  const [villagesList, setVillagesList] = useState([]);
  const [selectedVillageId, setSelectedVillageId] = useState('');

  // Location filter states for 2000+ scaling support
  const [districtsTree, setDistrictsTree] = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [districtsList, setDistrictsList] = useState([]);
  const [divisionsList, setDivisionsList] = useState([]);
  
  const [filterProvince, setFilterProvince] = useState('');
  const [filterDistrictId, setFilterDistrictId] = useState('');
  const [filterDivisionId, setFilterDivisionId] = useState('');
  const [searchGnQuery, setSearchGnQuery] = useState('');

  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    owner_name: '',
    owner_nic: '',
    owner_contact: '',
    permanent_address: '',
    house_number: '',
    land_area_perches: '',
    ownership: '', // අයිතිය (NEW, REPAIR, RELOCATION)
    infrastructure_issues: [], // ජලය, විදුලිය, ප්‍රවේශ මාර්ග
    construction_stage: '', // ඉදිකිරීම් තත්ත්වය (NOT_STARTED, FOUNDATION, WALL, etc.)
    current_status: '', // වත්මන් තත්ත්වය
    estimated_value: '', // ඉදිකර ඇති කොටසේ දළ වටිනාකම
    notes: '' // වෙනත් සටහන්
  });

  // Fetch villages list and reference locations if not passed as a prop
  useEffect(() => {
    if (!villageId) {
      const fetchReferences = async () => {
        try {
          const [villagesRes, distRes] = await Promise.all([
            api.get('/villages?per_page=1000'),
            api.get('/reference/districts')
          ]);
          setVillagesList(villagesRes.data.data || []);
          setDistrictsTree(distRes.data || []);

          // Extract unique provinces
          const uniqueProvinces = [...new Set(distRes.data.map((d) => d.province))].sort();
          setProvinces(uniqueProvinces);
        } catch (err) {
          console.error('Failed to load filter references:', err);
        }
      };
      fetchReferences();
    }
  }, [villageId]);

  // Cascade Province -> District
  const handleProvinceChange = (e) => {
    const province = e.target.value;
    setFilterProvince(province);
    setFilterDistrictId('');
    setFilterDivisionId('');
    setSelectedVillageId('');
    
    if (province) {
      const filtered = districtsTree.filter((d) => d.province === province);
      setDistrictsList(filtered);
    } else {
      setDistrictsList([]);
    }
    setDivisionsList([]);
  };

  // Cascade District -> DS Division
  const handleDistrictChange = (e) => {
    const districtId = e.target.value;
    setFilterDistrictId(districtId);
    setFilterDivisionId('');
    setSelectedVillageId('');

    if (districtId) {
      const matched = districtsTree.find((d) => d.id === parseInt(districtId));
      setDivisionsList(matched?.divisions || []);
    } else {
      setDivisionsList([]);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleInfraCheckboxChange = (e) => {
    const { value, checked } = e.target;
    setFormData((prev) => {
      const current = prev.infrastructure_issues || [];
      const updated = checked
        ? [...current, value]
        : current.filter((item) => item !== value);
      return { ...prev, infrastructure_issues: updated };
    });
  };

  // Filter villages dynamically based on selected cascading dropdowns and query
  const getFilteredVillages = () => {
    return villagesList.filter((v) => {
      if (filterDivisionId && parseInt(v.division_id) !== parseInt(filterDivisionId)) return false;
      if (filterDistrictId) {
        // Find if this division belongs to selected district
        const selectedDistrictObj = districtsTree.find(d => d.id === parseInt(filterDistrictId));
        const dsDivisionIds = selectedDistrictObj?.divisions.map(div => div.id) || [];
        if (!dsDivisionIds.includes(parseInt(v.division_id))) return false;
      }
      if (filterProvince && v.province_name !== filterProvince) {
        // Fallback district lookup if needed
        const selectedDistrictsInProvince = districtsTree.filter(d => d.province === filterProvince);
        const allDsIdsInProvince = selectedDistrictsInProvince.reduce((acc, current) => {
          return [...acc, ...current.divisions.map(div => div.id)];
        }, []);
        if (!allDsIdsInProvince.includes(parseInt(v.division_id))) return false;
      }
      if (searchGnQuery.trim() !== '') {
        const query = searchGnQuery.toLowerCase();
        const gnName = v.grama_niladhari_division ? v.grama_niladhari_division.toLowerCase() : '';
        const vName = v.name ? v.name.toLowerCase() : '';
        if (!gnName.includes(query) && !vName.includes(query)) return false;
      }
      return true;
    });
  };

  const filteredVillages = getFilteredVillages();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrors({});
    setSubmitted(false);

    const targetVillageId = villageId || selectedVillageId;
    if (!targetVillageId) {
      setErrors({ global: ['කරුණාකර ප්‍රථමයෙන් නිවාස ඇතුලත් කිරීමට අදාළ ගම්මානය තෝරන්න. (Please select a target village first.)'] });
      setSubmitting(false);
      return;
    }

    try {
      // Map frontend values to backend schema columns
      const stageCodeMap = {
        'NOT_STARTED': 1,
        'FOUNDATION': 2,
        'WALL': 4,
        'ROOF': 3,
        'FINISHING': 5,
        'FINISHING2': 6,
        'FINISHING3': 7,
        'COMPLETED': 8
      };

      const stageId = stageCodeMap[formData.construction_stage] || 1;

      // Occupancy status mapping based on ownership dropdown
      let occupancyStatus = 'NOT_APPLICABLE';
      if (formData.ownership === 'NEW') occupancyStatus = 'BORROWER_LIVING';
      else if (formData.ownership === 'RELOCATION') occupancyStatus = 'SOLD';

      // Combine notes
      let finalNotes = '';
      if (formData.permanent_address) finalNotes += `ස්ථිර ලිපිනය: ${formData.permanent_address}`;
      if (formData.estimated_value) finalNotes += `\nඇස්තමේන්තුගත වටිනාකම: රු. ${formData.estimated_value}`;
      if (formData.current_status) finalNotes += `\nවත්මන් තත්ත්වය: ${formData.current_status === 'FOUNDATION' ? 'ඉදිකිරීම් නවතා ඇත' : 'ඉදිකිරීම් වර්තමානයේ ක්‍රියාත්මක වේ'}`;
      if (formData.notes) finalNotes += `\nවෙනත් සටහන්: ${formData.notes}`;

      const payload = {
        house_number: formData.house_number,
        owner_name: formData.owner_name,
        owner_nic: formData.owner_nic,
        owner_contact: formData.owner_contact || null,
        household_members: 1,
        land_area_perches: formData.land_area_perches !== '' ? parseFloat(formData.land_area_perches) : null,
        construction_stage_id: stageId,
        is_land_sold: formData.ownership === 'RELOCATION' ? 1 : 0,
        is_house_sold: formData.ownership === 'RELOCATION' ? 1 : 0,
        occupancy_status: occupancyStatus,
        has_infrastructure_issues: formData.infrastructure_issues.length > 0 ? 1 : 0,
        notes: finalNotes
      };

      await api.post(`/villages/${targetVillageId}/houses`, payload);
      setSubmitted(true);
      
      if (onSuccess) {
        setTimeout(() => {
          onSuccess();
        }, 1500);
      } else {
        setTimeout(() => {
          navigate(`/villages/${targetVillageId}`);
        }, 1500);
      }
    } catch (err) {
      if (err.response?.status === 400 && err.response?.data?.details) {
        setErrors(err.response.data.details);
      } else {
        console.error('Failed to save house record:', err);
        setErrors({ global: [err.response?.data?.error || 'ලියාපදිංචි කිරීම අසාර්ථක විය.'] });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      
      {/* Tab Switcher Selector */}
      <div className="flex bg-slate-100 p-1.5 rounded-xl border border-slate-200/50 max-w-md mx-auto mb-6">
        <button
          type="button"
          onClick={() => setActiveTab('single')}
          className={`flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
            activeTab === 'single'
              ? 'bg-white text-indigo-600 shadow-sm'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          තනි නිවාස ලියාපදිංචිය
        </button>
        
        <button
          type="button"
          onClick={() => setActiveTab('bulk')}
          className={`flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
            activeTab === 'bulk'
              ? 'bg-white text-indigo-600 shadow-sm'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Excel තොග වශයෙන්
        </button>
      </div>

      {activeTab === 'bulk' ? (
        <BulkHouseUpload villageId={villageId} onSuccess={onSuccess} />
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {Object.keys(errors).length > 0 && (
            <div className="mb-6 rounded-2xl bg-rose-50 border border-rose-100 p-6 flex items-start gap-4 shadow-sm">
              <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 flex-shrink-0">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-rose-800">ඇතුලත් කිරීම අසාර්ථක විය (Registration Failed)</h3>
                {errors.global ? (
                  <p className="text-sm text-rose-700 mt-1">{errors.global[0]}</p>
                ) : (
                  <div className="mt-2 text-xs text-rose-750 space-y-1">
                    <p className="font-semibold">පහත දක්වා ඇති දත්ත නිවැරදි කර නැවත උත්සාහ කරන්න (Please correct the following errors):</p>
                    <ul className="list-disc list-inside space-y-0.5 mt-1 font-medium font-sans">
                      {Object.keys(errors).map((field) => (
                        <li key={field}>
                          <span className="font-bold uppercase text-[10px] bg-rose-100/50 px-1 py-0.5 rounded mr-1">
                            {field.replace('_', ' ')}
                          </span>
                          {errors[field][0]}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {submitted && (
            <div className="flex items-center justify-center gap-2 bg-emerald-50 border border-emerald-250 text-emerald-700 font-semibold text-sm px-4 py-3 rounded-xl">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              ලේඛනය සාර්ථකව සුරකින ලදී!
            </div>
          )}

          {/* Section 1: Beneficiary Info */}
          <FormSection
            title="ප්‍රතිලාභකරු පිළිබඳ විස්තර"
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            }
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Standalone Target Village Selector with Cascading Location Filters */}
              {!villageId && (
                <div className="md:col-span-3 bg-slate-50/50 p-6 rounded-2xl border border-slate-200/80 space-y-4 mb-4">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Village Location Filter (පෙරහන)</span>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Province Filter */}
                    <div>
                      <FieldLabel>පළාත (Province)</FieldLabel>
                      <select value={filterProvince} onChange={handleProvinceChange} className={selectCls}>
                        <option value="">-- පළාත තෝරන්න --</option>
                        {provinces.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>

                    {/* District Filter */}
                    <div>
                      <FieldLabel>දිස්ත්‍රික්කය (District)</FieldLabel>
                      <select value={filterDistrictId} onChange={handleDistrictChange} disabled={!filterProvince} className={selectCls}>
                        <option value="">-- දිස්ත්‍රික්කය තෝරන්න --</option>
                        {districtsList.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                      </select>
                    </div>

                    {/* DS Division Filter */}
                    <div>
                      <FieldLabel>ප්‍රාදේශීය ලේකම් (DS Division)</FieldLabel>
                      <select value={filterDivisionId} onChange={(e) => { setFilterDivisionId(e.target.value); setSelectedVillageId(''); }} disabled={!filterDistrictId} className={selectCls}>
                        <option value="">-- ප්‍රා. ලේ. තෝරන්න --</option>
                        {divisionsList.map(div => <option key={div.id} value={div.id}>{div.name}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* GN Division / Village Search Text Query */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <FieldLabel>සෙවුම් පදය (GN division / Village Name)</FieldLabel>
                      <input
                        type="text"
                        value={searchGnQuery}
                        onChange={(e) => { setSearchGnQuery(e.target.value); setSelectedVillageId(''); }}
                        placeholder="ග්‍රාමනිළධාරී කොට්ඨාශය හෝ ගමේ නම ලියන්න..."
                        className={inputCls}
                      />
                    </div>

                    {/* target Village Select input */}
                    <div>
                      <FieldLabel required>අදාළ නිවාස ගම්මානය (Target Housing Village)</FieldLabel>
                      <select
                        name="selectedVillageId"
                        value={selectedVillageId}
                        onChange={(e) => setSelectedVillageId(e.target.value)}
                        className={selectCls}
                        required
                      >
                        <option value="">-- ගම්මානය තෝරන්න ({filteredVillages.length} matched) --</option>
                        {filteredVillages.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.name} ({v.division_name} - GN: {v.grama_niladhari_division || 'N/A'})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              <div className="md:col-span-2">
                <FieldLabel required>ප්‍රතිලාභකරුගේ සම්පූර්ණ නම</FieldLabel>
                <input
                  type="text"
                  name="owner_name"
                  value={formData.owner_name}
                  onChange={handleChange}
                  placeholder="සම්පූර්ණ නම ඇතුළත් කරන්න"
                  className={inputCls}
                  required
                />
                {errors.owner_name && <p className="text-xs text-rose-500 font-medium mt-1">{errors.owner_name[0]}</p>}
              </div>
              <div>
                <FieldLabel required>ජාතික හැඳුනුම්පත් අංකය (NIC)</FieldLabel>
                <input
                  type="text"
                  name="owner_nic"
                  value={formData.owner_nic}
                  onChange={handleChange}
                  placeholder="XXXXXXXXXV / XXXXXXXXXXXX"
                  className={inputCls}
                  required
                />
                {errors.owner_nic && <p className="text-xs text-rose-500 font-medium mt-1">{errors.owner_nic[0]}</p>}
              </div>
              <div>
                <FieldLabel>ජංගම දුරකථන අංකය</FieldLabel>
                <input
                  type="tel"
                  name="owner_contact"
                  value={formData.owner_contact}
                  onChange={handleChange}
                  placeholder="07XXXXXXXX"
                  className={inputCls}
                />
                {errors.owner_contact && <p className="text-xs text-rose-500 font-medium mt-1">{errors.owner_contact[0]}</p>}
              </div>
              <div className="md:col-span-3">
                <FieldLabel>ස්ථිර නිවාස ලිපිනය</FieldLabel>
                <textarea
                  rows="2"
                  name="permanent_address"
                  value={formData.permanent_address}
                  onChange={handleChange}
                  placeholder="ලිපිනය ඇතුළත් කරන්න..."
                  className={inputCls}
                />
              </div>
            </div>
          </FormSection>

          {/* Section 2: House / Plot Details */}
          <FormSection
            title="නිවාස / ඉඩම් විස්තර"
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            }
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <FieldLabel required>මූලික පිඹුරේ හෝ කට්ටි සැලැස්මේ අංකය</FieldLabel>
                <input
                  type="text"
                  name="house_number"
                  value={formData.house_number}
                  onChange={handleChange}
                  placeholder="HOU-XXXX"
                  className={inputCls}
                  required
                />
                {errors.house_number && <p className="text-xs text-rose-500 font-medium mt-1">{errors.house_number[0]}</p>}
              </div>
              <div>
                <FieldLabel>ඉඩමේ ප්‍රමාණය (පර්ච)</FieldLabel>
                <input
                  type="number"
                  name="land_area_perches"
                  value={formData.land_area_perches}
                  onChange={handleChange}
                  placeholder="උදා: 20"
                  className={inputCls}
                />
                {errors.land_area_perches && <p className="text-xs text-rose-500 font-medium mt-1">{errors.land_area_perches[0]}</p>}
              </div>
              <div>
                <FieldLabel required>අයිතිය</FieldLabel>
                <select
                  name="ownership"
                  value={formData.ownership}
                  onChange={handleChange}
                  className={selectCls}
                  required
                >
                  <option value="">-- අයිතිය තෝරන්න --</option>
                  <option value="NEW">අයිතිය ප්‍රතිලාභියා සතුයි</option>
                  <option value="REPAIR">නිවස කුලියට දී ඇත</option>
                  <option value="RELOCATION">ඉඩම/ නිවස විකුණා ඇත</option>
                </select>
                {errors.ownership && <p className="text-xs text-rose-500 font-medium mt-1">{errors.ownership[0]}</p>}
              </div>
              
              <div className="md:col-span-3">
                <label className="block text-sm font-bold uppercase tracking-wider text-slate-500 mb-3">
                  යටිතල පහසුකම්
                </label>
                <div className="flex flex-wrap gap-6 bg-white p-4 rounded-xl border border-slate-200">
                  {[
                    { value: 'WATER', label: 'ජලය' },
                    { value: 'ELECTRICITY', label: 'විදුලිය' },
                    { value: 'ACCESS_ROADS', label: 'ප්‍රවේශ මාර්ග' }
                  ].map((opt) => (
                    <label key={opt.value} className="flex items-center gap-2.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        value={opt.value}
                        checked={formData.infrastructure_issues?.includes(opt.value) || false}
                        onChange={handleInfraCheckboxChange}
                        className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 transition-all"
                      />
                      <span className="text-base font-semibold text-slate-700">{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </FormSection>

          {/* Section 3: Construction Progress */}
          <FormSection
            title="ඉදිකිරීම් ප්‍රගතිය"
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            }
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <FieldLabel required>ඉදිකිරීම් තත්ත්වය</FieldLabel>
                <select
                  name="construction_stage"
                  value={formData.construction_stage}
                  onChange={handleChange}
                  className={selectCls}
                  required
                >
                  <option value="">-- තත්ත්වය තෝරන්න --</option>
                  <option value="NOT_STARTED">ආරම්භ කර නොමැත</option>
                  <option value="FOUNDATION">අඩිතාලම දමා ඇත</option>
                  <option value="WALL">ජනෙල් මට්ටමට නිමකර ඇත</option>
                  <option value="ROOF">ලින්ටල් මට්ටමට නිමකර ඇත</option>
                  <option value="FINISHING">වහල මට්ටමට නිමකර ඇත</option>
                  <option value="FINISHING2">වහලය නිමකර ඇත</option>
                  <option value="FINISHING3">කපරාරු නිමකර ඇත</option>
                  <option value="COMPLETED">නිවස සම්පූර්ණයෙන් ඉදිකර ඇත</option>
                </select>
                {errors.construction_stage_id && <p className="text-xs text-rose-500 font-medium mt-1">{errors.construction_stage_id[0]}</p>}
              </div>
              
              <div>
                <FieldLabel required>වත්මන් තත්ත්වය</FieldLabel>
                <select
                  name="current_status"
                  value={formData.current_status}
                  onChange={handleChange}
                  className={selectCls}
                  required
                >
                  <option value="">-- තත්ත්වය තෝරන්න --</option>
                  <option value="NOT_STARTED">ඉදිකිරීම් වර්තමානයේ ක්‍රියාත්මක වේ</option>
                  <option value="FOUNDATION">ඉදිකිරීම් නවතා ඇත</option>
                </select>
              </div>

              <div>
                <FieldLabel>ඉදිකර ඇති කොටසේ දළ වටිනාකම</FieldLabel>
                <input
                  type="number"
                  name="estimated_value"
                  value={formData.estimated_value}
                  onChange={handleChange}
                  placeholder="රු. 0.00"
                  className={inputCls}
                />
              </div>
              
              <div className="md:col-span-3">
                <FieldLabel>වෙනත් සටහන්</FieldLabel>
                <textarea
                  rows="3"
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  placeholder="ඉදිකිරීම් ප්‍රගතිය, ප්‍රශ්න, ආදිය ඇතුළත් කරන්න..."
                  className={inputCls}
                />
              </div>
            </div>
          </FormSection>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-4 py-2">
            <button
              type="button"
              onClick={onClose || (() => navigate(-1))}
              className="px-6 py-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-100 transition-all font-sans"
            >
              අවලංගු කරන්න
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-8 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold shadow-lg shadow-indigo-600/20 hover:shadow-indigo-500/30 transition-all flex items-center gap-2 font-sans"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-200 border-t-white rounded-full animate-spin" />
                  <span>සුරකිමින්...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>ලේඛනය සුරකින්න</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
