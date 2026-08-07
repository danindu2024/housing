import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';

const SingleVillageForm = () => {
  const navigate = useNavigate();

  // Form Inputs State
  const [formData, setFormData] = useState({
    name: '',
    province: '',
    district_id: '',
    division_id: '',
    category_id: '',
    ownership_body_id: '',
    grama_niladhari_division: '',
    boundary_type: '',
    total_planned_houses: '',
    status: '',
    is_conservation_area: 'NONE',
    infrastructure_issues: [],
    program_start_date: '',
    notes: '',
    google_map_link: '',
  });

  // Lookup data states
  const [categories, setCategories] = useState([]);
  const [ownershipBodies, setOwnershipBodies] = useState([]);
  const [districtsTree, setDistrictsTree] = useState([]);
  
  // Cascading lists states
  const [provinces, setProvinces] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [divisions, setDivisions] = useState([]);

  // GN autocomplete states
  const [gnList, setGnList] = useState([]);
  const [gnSuggestions, setGnSuggestions] = useState([]);
  const [gnSearchFocus, setGnSearchFocus] = useState(false);
  const [fetchingGn, setFetchingGn] = useState(false);
  const gnRef = useRef(null);
  const bannerRef = useRef(null);

  // Status & Validation states
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [scrollToggle, setScrollToggle] = useState(false);

  // 1. Load initial reference lookup lists
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

        // Extract unique provinces
        const uniqueProvinces = [...new Set(distRes.data.map((d) => d.province))].sort();
        setProvinces(uniqueProvinces);
      } catch (err) {
        console.error('Failed to load form lookup references:', err);
      }
    };

    fetchReferences();
  }, []);

  // 2. Fetch GN Divisions dynamically from the public repository
  useEffect(() => {
    const fetchGnDivisions = async () => {
      setFetchingGn(true);
      try {
        // Public open-source dataset of all Grama Niladhari divisions in Sri Lanka
        const res = await fetch(
          'https://raw.githubusercontent.com/Rdilshan/SL_Grama-Niladhari-division-List-/master/districts.json'
        );
        if (res.ok) {
          const districtsTree = await res.json();
          
          // Flatten the hierarchical structure into { name, ds_division } format
          const flatGnList = [];
          districtsTree.forEach((dist) => {
            if (dist.cities) {
              dist.cities.forEach((city) => {
                const dsName = city.name;
                if (city.dnDivisions) {
                  city.dnDivisions.forEach((gnName) => {
                    flatGnList.push({
                      name: gnName,
                      ds_division: dsName,
                    });
                  });
                }
              });
            }
          });
          
          setGnList(flatGnList);
        }
      } catch (err) {
        console.warn('Could not fetch GN Divisions list, falling back to manual text entry.', err);
      } finally {
        setFetchingGn(false);
      }
    };

    fetchGnDivisions();
  }, []);

  // 3. Handle outer clicks to dismiss autocomplete suggestions
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (gnRef.current && !gnRef.current.contains(e.target)) {
        setGnSearchFocus(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // 4. Cascade Province -> District
  const handleProvinceChange = (e) => {
    const province = e.target.value;
    setFormData((prev) => ({
      ...prev,
      province,
      district_id: '',
      division_id: '',
    }));
    
    if (province) {
      const filtered = districtsTree.filter((d) => d.province === province);
      setDistricts(filtered);
    } else {
      setDistricts([]);
    }
    setDivisions([]);
  };

  // 5. Cascade District -> DS Division
  const handleDistrictChange = (e) => {
    const districtId = e.target.value;
    setFormData((prev) => ({
      ...prev,
      district_id: districtId,
      division_id: '',
    }));

    if (districtId) {
      const matchedDistrict = districtsTree.find((d) => d.id === parseInt(districtId));
      setDivisions(matchedDistrict?.divisions || []);
    } else {
      setDivisions([]);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    // Clear validation error on change
    if (errors[name]) {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy[name];
        return copy;
      });
    }
  };

  const handleInfraCheckboxChange = (e) => {
    const { value, checked } = e.target;
    setFormData((prev) => {
      const current = prev.infrastructure_issues || [];
      const updated = checked 
        ? [...current, value] 
        : current.filter(item => item !== value);
      
      return { ...prev, infrastructure_issues: updated };
    });
    
    if (errors.infrastructure_issues) {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy.infrastructure_issues;
        return copy;
      });
    }
  };

  // 6. GN search logic - dynamically filters based on input text & selected division
  const handleGnSearch = (e) => {
    const value = e.target.value;
    setFormData((prev) => ({ ...prev, grama_niladhari_division: value }));

    if (!value.trim()) {
      setGnSuggestions([]);
      return;
    }

    // Get active DS Division name if selected
    const selectedDivisionId = parseInt(formData.division_id);
    const selectedDivisionName = divisions.find((d) => d.id === selectedDivisionId)?.name;

    // Filter list
    let filtered = gnList;
    if (selectedDivisionName) {
      // If we have selected a DS division, prioritize suggestions from that division!
      filtered = gnList.filter(
        (gn) => gn.ds_division?.toLowerCase() === selectedDivisionName.toLowerCase()
      );
    }

    const matches = filtered
      .filter((gn) => gn.name?.toLowerCase().includes(value.toLowerCase()))
      .slice(0, 10); // Limit to top 10 matches for responsive performance

    setGnSuggestions(matches);
  };

  const selectGnSuggestion = (name) => {
    setFormData((prev) => ({ ...prev, grama_niladhari_division: name }));
    setGnSuggestions([]);
    setGnSearchFocus(false);
  };

  // 7. Form submission with status override (no redirection, stays on page)
  const handleSubmitWithStatus = async (statusOverride) => {
    setErrors({});
    setSuccessMsg('');
    setSubmitting(true);

    const trimmedFormData = {};
    Object.keys(formData).forEach((key) => {
      const val = formData[key];
      if (typeof val === 'string') {
        trimmedFormData[key] = val.trim();
      } else {
        trimmedFormData[key] = val;
      }
    });

    const payload = {
      ...trimmedFormData,
      status: statusOverride,
    };

    try {
      const response = await api.post('/villages', payload);
      
      if (response.data.merged) {
        setSuccessMsg('පවතින ගම්මාන තොරතුරු සාර්ථකව යාවත්කාලීන කරන ලදී! (Existing village record updated successfully!)');
      } else {
        setSuccessMsg('ගම්මානය සාර්ථකව ලියාපදිංචි කරන ලදී! (Village registered successfully!)');
      }
      
      // Smooth scroll to bottom banner
      setTimeout(() => {
        bannerRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err) {
      console.error('Validation failed on server:', err);
      if (err.response?.status === 400 && err.response?.data?.details) {
        setErrors(err.response.data.details);
      } else if (err.response?.status === 409 && err.response?.data?.details) {
        // Handle natural key conflict explicitly
        setErrors(err.response.data.details);
      } else {
        setErrors({ global: err.response?.data?.error || 'Failed to register village record.' });
      }
      
      // Smooth scroll to bottom banner
      setTimeout(() => {
        bannerRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } finally {
      setSubmitting(false);
    }
  };

  const handleNativeSubmit = (e) => {
    e.preventDefault();
    handleSubmitWithStatus(formData.status);
  };

  return (
    <div className="max-w-4xl mx-auto pb-12">
      {/* Entry Form Card */}
      <form onSubmit={handleNativeSubmit} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-xl font-bold text-slate-800">New Village Registration Form</h2>
            <p className="text-sm text-slate-600 mt-1">Fill below details correctly/ පහත දක්වා ඇති තොරතුරු නිවැරදිව පුරවන්න</p>
          </div>
          <p className="text-xs font-semibold text-slate-500">
            <span className="text-rose-500 font-bold">*</span> Mandatory fields
          </p>
        </div>

        <div className="p-8 space-y-8">
          {/* Section 1: Basic details */}
          <h3 className="text-xs font-black uppercase tracking-widest text-indigo-500 mb-4">Primary Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold uppercase tracking-wider text-slate-500 mb-2">
                Village Name/ ගම්මානයේ නම <span className="text-rose-500 font-bold ml-0.5">*</span>
              </label>
              <input
                type="text"
                name="name"
                placeholder="උදා: සම්පත්ගම"
                value={formData.name}
                onChange={handleInputChange}
                className={`w-full px-4 py-3 rounded-xl border bg-slate-50/50 text-base focus:bg-white transition-all ${
                  errors.name ? 'border-rose-300 focus:ring-rose-500 focus:border-rose-500' : 'border-slate-200 focus:ring-indigo-500 focus:border-indigo-500'
                }`}
              />
              {errors.name && <p className="text-xs text-rose-500 font-medium mt-1.5">{errors.name[0]}</p>}
            </div>



            <div>
              <label className="block text-sm font-bold uppercase tracking-wider text-slate-500 mb-2">
                Funding Method/ මුදල් සම්පාදන ක්‍රමය <span className="text-rose-500 font-bold ml-0.5">*</span>
              </label>
              <select
                name="category_id"
                value={formData.category_id}
                onChange={handleInputChange}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-base focus:bg-white focus:ring-indigo-500 focus:border-indigo-500 transition-all"
              >
                <option value="">-- ක්‍රමය තෝරන්න --</option>
                {categories.map((cat) => {
                  const englishNames = {
                    LOAN: 'Loan Village',
                    GRANT: 'Grant Village',
                    GRANT_INDIAN: 'Indian Grant',
                    GRANT_HOUSING: 'Housing Authority Grant'
                  };
                  const engName = englishNames[cat.code] || cat.code;
                  return (
                    <option key={cat.id} value={cat.id}>
                      {cat.name} ({engName})
                    </option>
                  );
                })}
              </select>
              {errors.category_id && <p className="text-xs text-rose-500 font-medium mt-1.5">{errors.category_id[0]}</p>}
            </div>

            <div>
              <label className="block text-sm font-bold uppercase tracking-wider text-slate-500 mb-2">
                Land Ownership/ ඉඩමේ හිමිකාරීත්වය
              </label>
              <select
                name="ownership_body_id"
                value={formData.ownership_body_id}
                onChange={handleInputChange}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-base focus:bg-white focus:ring-indigo-500 focus:border-indigo-500 transition-all"
              >
                <option value="">-- ඉඩමේ හිමිකාරීත්වය තෝරන්න --</option>
                {ownershipBodies.map((body) => (
                  <option key={body.id} value={body.id}>
                    {body.name_si} ({body.name_en})
                  </option>
                ))}
              </select>
              {errors.ownership_body_id && <p className="text-xs text-rose-500 font-medium mt-1.5">{errors.ownership_body_id[0]}</p>}
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Section 2: Cascading location and GN division */}
          <div>
            <h3 className="text-xs font-black uppercase tracking-widest text-indigo-500 mb-4">Location & Boundaries</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Province/ පළාත <span className="text-rose-500 font-bold ml-0.5">*</span>
                </label>
                <select
                  name="province"
                  value={formData.province}
                  onChange={handleProvinceChange}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-base focus:bg-white transition-all"
                >
                  <option value="">-- පළාත තෝරන්න --</option>
                  {provinces.map((prov) => (
                    <option key={prov} value={prov}>
                      {prov}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold uppercase tracking-wider text-slate-500 mb-2">
                  District/ දිස්ත්‍රික්කය <span className="text-rose-500 font-bold ml-0.5">*</span>
                </label>
                <select
                  name="district_id"
                  disabled={!formData.province}
                  value={formData.district_id}
                  onChange={handleDistrictChange}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-base focus:bg-white disabled:opacity-50 transition-all"
                >
                  <option value="">-- දිස්තික්කය තෝරන්න --</option>
                  {districts.map((dist) => (
                    <option key={dist.id} value={dist.id}>
                      {dist.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold uppercase tracking-wider text-slate-500 mb-2">
                  DS/ ප්‍රාදේශීය ලේකම් කොට්ඨාශය <span className="text-rose-500 font-bold ml-0.5">*</span>
                </label>
                <select
                  name="division_id"
                  disabled={!formData.district_id}
                  value={formData.division_id}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-base focus:bg-white disabled:opacity-50 transition-all"
                >
                  <option value="">-- ප්‍රා. ලේ. තෝරන්න --</option>
                  {divisions.map((div) => (
                    <option key={div.id} value={div.id}>
                      {div.name}
                    </option>
                  ))}
                </select>
                {errors.division_id && <p className="text-xs text-rose-500 font-medium mt-1.5">{errors.division_id[0]}</p>}
              </div>

              {/* GN Autocomplete field container */}
              <div className="md:col-span-3 relative" ref={gnRef}>
                <label className="block text-sm font-bold uppercase tracking-wider text-slate-500 mb-2">
                  GN/ ග්‍රාමනිළධාරී කොට්ඨාශය
                </label>
                <div className="relative">
                  <input
                    type="text"
                    name="grama_niladhari_division"
                    placeholder={fetchingGn ? "Loading locations database..." : "කොට්ඨාශය ඉංග්‍රීසි භාෂාවෙන් ටයිප් කරන්න (type GN division)"}
                    value={formData.grama_niladhari_division}
                    onChange={handleGnSearch}
                    onFocus={() => setGnSearchFocus(true)}
                    className={`w-full px-4 py-3 rounded-xl border bg-slate-50/50 text-base focus:bg-white transition-all ${
                      errors.grama_niladhari_division ? 'border-rose-300' : 'border-slate-200'
                    }`}
                  />
                  {fetchingGn && (
                    <div className="absolute right-4 top-3.5 flex items-center">
                      <div className="w-4 h-4 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                    </div>
                  )}
                </div>

                {/* Autocomplete dynamic suggestion cards */}
                {gnSearchFocus && gnSuggestions.length > 0 && (
                  <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto divide-y divide-slate-100">
                    {gnSuggestions.map((suggestion, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => selectGnSuggestion(suggestion.name)}
                        className="w-full px-4 py-3 text-left text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 flex items-center justify-between transition-colors"
                      >
                        <span className="font-semibold">{suggestion.name}</span>
                        <span className="text-xs text-slate-400 font-medium">DS: {suggestion.ds_division}</span>
                      </button>
                    ))}
                  </div>
                )}
                {errors.grama_niladhari_division && <p className="text-xs text-rose-500 font-medium mt-1.5">{errors.grama_niladhari_division[0]}</p>}
              </div>

              {/* Village Boundary */}
              <div>
                <label className="block text-sm font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Village Boundary/ ගමේ පිහිටීමේ සීමාව
                </label>
                <select
                  name="boundary_type"
                  value={formData.boundary_type}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 rounded-xl border bg-slate-50/50 text-base focus:bg-white transition-all ${
                    errors.boundary_type ? 'border-rose-300 focus:ring-rose-500 focus:border-rose-500' : 'border-slate-200 focus:ring-indigo-500 focus:border-indigo-500'
                  }`}
                >
                  <option value="">-- සීමාව තෝරන්න --</option>
                  <option value="MUNICIPAL">මහනගර සභාව (Municipal)</option>
                  <option value="URBAN">නගරසභාව (Urban)</option>
                  <option value="DS">ප්‍රාදේශීය සභාව (DS)</option>
                  <option value="VILLAGE">දුෂ්කර ගම්මාන (Village)</option>
                </select>
                {errors.boundary_type && <p className="text-xs text-rose-500 font-medium mt-1.5">{errors.boundary_type[0]}</p>}
              </div>

              <div>
                <label className="block text-sm font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Planned Houses/ ඉදිකිරීමට සැළසුම්කල නිවාස සංඛ්‍යාව <span className="text-rose-500 font-bold ml-0.5">*</span>
                </label>
                <input
                  type="number"
                  name="total_planned_houses"
                  placeholder="උදා: 50"
                  value={formData.total_planned_houses}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-base focus:bg-white transition-all"
                />
                {errors.total_planned_houses && <p className="text-xs text-rose-500 font-medium mt-1.5">{errors.total_planned_houses[0]}</p>}
              </div>

              <div>
                <label className="block text-sm font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Foundation Day/ මුල්ගල් තැබු දිනය
                </label>
                <input
                  type="date"
                  name="program_start_date"
                  value={formData.program_start_date}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-base focus:bg-white transition-all"
                />
                {errors.program_start_date && <p className="text-xs text-rose-500 font-medium mt-1.5">{errors.program_start_date[0]}</p>}
              </div>

              <div className="md:col-span-3">
                <label className="block text-sm font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Google Map Link
                </label>
                <input
                  type="url"
                  name="google_map_link"
                  placeholder="https://maps.google.com/..."
                  value={formData.google_map_link}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 rounded-xl border bg-slate-50/50 text-base focus:bg-white transition-all ${
                    errors.google_map_link ? 'border-rose-300' : 'border-slate-200'
                  }`}
                />
                {errors.google_map_link && <p className="text-xs text-rose-500 font-medium mt-1.5">{errors.google_map_link[0]}</p>}
              </div>
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Section 3: Status & Dates */}
          <div>
            <h3 className="text-xs font-black uppercase tracking-widest text-indigo-500 mb-4">Status & Flags</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Is open to public/ මහජනතාවට විවෘතද?
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 rounded-xl border bg-slate-50/50 text-base focus:bg-white transition-all ${
                    errors.status ? 'border-rose-300 focus:ring-rose-500 focus:border-rose-500' : 'border-slate-200 focus:ring-indigo-500 focus:border-indigo-500'
                  }`}
                >
                  <option value="">-- තෝරන්න --</option>
                  <option value="CLOSED">විවෘත නොවේ (No)</option>
                  <option value="OPEN">විවෘතයි (Yes)</option>
                </select>
                {errors.status && <p className="text-xs text-rose-500 font-medium mt-1.5">{errors.status[0]}</p>}
              </div>

              <div className="w-full md:col-span-3">
                  <label className="block text-sm font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Infrastructure/ යටිතල පහසුකම්
                  </label>
                  <p className="text-xs text-slate-600 font-medium mb-3">
                    Select available facilities/ වත්මන් යටිතල පහසුකම් තෝරන්න
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-4 bg-white p-4 rounded-xl border border-slate-200">
                    {[
                      { value: 'WATER', label: 'ජලය (water)' },
                      { value: 'ELECTRICITY', label: 'විදුලිය (electricity)' },
                      { value: 'ACCESS_ROADS', label: 'ගමට ප්‍රවේශ මාර්ග (access roads to the village)' },
                      { value: 'INTERNAL_ROADS', label: 'අභ්‍යන්තර මාර්ග (internal roads)' },
                      { value: 'OTHER', label: 'වෙනත් පොදු පහසුකම් (other)' }
                    ].map((opt) => (
                      <label key={opt.value} className="flex items-start gap-3 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          value={opt.value}
                          checked={formData.infrastructure_issues?.includes(opt.value) || false}
                          onChange={handleInfraCheckboxChange}
                          className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 transition-all mt-0.5"
                        />
                        <span className="text-base font-semibold text-slate-700">{opt.label}</span>
                      </label>
                    ))}
                  </div>
                  {errors.infrastructure_issues && <p className="text-xs text-rose-500 font-medium mt-2">{errors.infrastructure_issues[0]}</p>}
                </div>

              {/* Environmental flags */}
              <div className="md:col-span-3">
                <label className="block text-sm font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Located in Conservation Area? /සංරක්ෂිත භූමි තුල පිහිටීම?
                </label>
                <select
                  name="is_conservation_area"
                  value={formData.is_conservation_area}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 rounded-xl border bg-slate-50/50 text-base focus:bg-white transition-all ${
                    errors.is_conservation_area ? 'border-rose-300 focus:ring-rose-500 focus:border-rose-500' : 'border-slate-200 focus:ring-indigo-500 focus:border-indigo-500'
                  }`}
                >
                  <option value="NONE">සංරක්ෂිත භූමියක පිහිටා නැත (Not in conservation area)</option>
                  <option value="WILDLIFE">වන ජීවී භූමි තුල පිහිටයි (Wildlife Land)</option>
                  <option value="FOREST">වන සංරක්ෂණ භූමි තුල පිහිටයි (Forest Conservation Land)</option>
                  <option value="COASTAL">වෙරල සංරක්ෂණ භූමි තුල පිහිටයි (Coastal Conservation Land)</option>
                  <option value="ARCHAEOLOGICAL">පුරාවිද්‍යා භූමි තුල පිහිටයි (Archaeological Land)</option>
                  <option value="SACRED">පූජා භූමි තුල පිහිටයි (Sacred Land)</option>
                  <option value="OTHER">වෙනත් සංරක්ෂණ භූමි තුල පිහිටයි (Other Conservation Land)</option>
                </select>
                {errors.is_conservation_area && <p className="text-xs text-rose-500 font-medium mt-1.5">{errors.is_conservation_area[0]}</p>}
              </div>

              <div className="md:col-span-3">
                <label className="block text-sm font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Other Details/ වෙනත් තොරතුරු
                </label>
                <textarea
                  name="notes"
                  rows="3"
                  placeholder="ඉහත සඳහන් නොවන වෙනත් ගැටලු ඇත්නම් ඇතුලත් කරන්න"
                  value={formData.notes}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-base focus:bg-white transition-all"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Action Panel Footer */}
        <div className="p-8 border-t border-slate-100 bg-slate-50/30 flex justify-end gap-4">
          <button
            type="button"
            onClick={() => navigate('/villages')}
            className="px-6 py-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={() => handleSubmitWithStatus(formData.status)}
            className="px-8 py-3 rounded-xl bg-indigo-600 text-sm font-bold text-white hover:bg-indigo-500 shadow-md shadow-indigo-500/10 disabled:opacity-50 transition-all flex items-center gap-2"
          >
            {submitting ? (
              <>
                <div className="w-4 h-4 border-2 border-indigo-200 border-t-white rounded-full animate-spin" />
                <span>Saving Details...</span>
              </>
            ) : (
              'Save Details'
            )}
          </button>
        </div>
      </form>

      {/* Bottom Success / Failure Banners */}
      <div ref={bannerRef} className="mt-6 space-y-4">
        {successMsg && (
          <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-6 flex items-start gap-4 shadow-md">
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 flex-shrink-0">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-slate-800 text-base">සාර්ථකයි! (Success)</h3>
              <p className="text-sm text-emerald-800 mt-1 font-medium">{successMsg}</p>
            </div>
            <button
              type="button"
              onClick={() => setSuccessMsg('')}
              className="text-slate-400 hover:text-slate-600 p-1"
              aria-label="Dismiss banner"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {Object.keys(errors).length > 0 && (
          <div className="rounded-2xl bg-rose-50 border border-rose-200 p-6 flex items-start gap-4 shadow-md">
            <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 flex-shrink-0">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-rose-800 text-base">ඇතුලත් කිරීම අසාර්ථක විය (Registration Failed)</h3>
              {errors.global ? (
                <p className="text-sm text-rose-700 mt-1 font-medium">{errors.global}</p>
              ) : (
                <div className="mt-2 text-xs text-rose-750 space-y-1">
                  <p className="font-semibold">ඉහත දක්වා ඇති දත්ත නිවැරදි කර නැවත උත්සාහ කරන්න (Please correct the errors in the form above and try again)</p>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => setErrors({})}
              className="text-slate-400 hover:text-slate-600 p-1"
              aria-label="Dismiss banner"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SingleVillageForm;
