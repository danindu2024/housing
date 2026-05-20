import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';

const VillageForm = () => {
  const navigate = useNavigate();

  // Form Inputs State
  const [formData, setFormData] = useState({
    name: '',
    development_project: '',
    province: '',
    district_id: '',
    division_id: '',
    category_id: '',
    ownership_body_id: '',
    grama_niladhari_division: '',
    gps_lat: '',
    gps_lng: '',
    total_planned_houses: '',
    status: 'IN_PROGRESS',
    is_conservation_area: false,
    has_infrastructure_issues: false,
    program_start_date: '',
    program_end_date: '',
    notes: '',
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

  // Status & Validation states
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

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

  // 7. Form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setSubmitting(true);

    try {
      const response = await api.post('/villages', formData);
      setSuccessMsg('Village registered successfully!');
      
      // Redirect to village list after 1.5 seconds
      setTimeout(() => {
        navigate(`/villages/${response.data.id}`);
      }, 1500);
    } catch (err) {
      console.error('Validation failed on server:', err);
      if (err.response?.status === 400 && err.response?.data?.details) {
        setErrors(err.response.data.details);
      } else {
        setErrors({ global: err.response?.data?.error || 'Failed to register village record.' });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Back button */}
      <div className="mb-6">
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

      {/* Success Banner */}
      {successMsg && (
        <div className="mb-6 rounded-2xl bg-emerald-50 border border-emerald-100 p-6 flex items-start gap-4 shadow-sm">
          <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 flex-shrink-0">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <h3 className="font-bold text-slate-800">Success</h3>
            <p className="text-sm text-slate-500 mt-1">{successMsg} Redirecting you to details ledger...</p>
          </div>
        </div>
      )}

      {/* Global Error Banner */}
      {errors.global && (
        <div className="mb-6 rounded-2xl bg-rose-50 border border-rose-100 p-6 flex items-start gap-4 shadow-sm">
          <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 flex-shrink-0">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <h3 className="font-bold text-slate-800">Registration Failed</h3>
            <p className="text-sm text-slate-500 mt-1">{errors.global}</p>
          </div>
        </div>
      )}

      {/* Entry Form Card */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-xl font-bold text-slate-800">Register New Village</h2>
        </div>

        <div className="p-8 space-y-8">
          {/* Section 1: Basic details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Village Name (Optional)
              </label>
              <input
                type="text"
                name="name"
                placeholder="e.g. Mahaweli 5B Uda Gammana"
                value={formData.name}
                onChange={handleInputChange}
                className={`w-full px-4 py-3 rounded-xl border bg-slate-50/50 text-sm focus:bg-white transition-all ${
                  errors.name ? 'border-rose-300 focus:ring-rose-500 focus:border-rose-500' : 'border-slate-200 focus:ring-indigo-500 focus:border-indigo-500'
                }`}
              />
              {errors.name && <p className="text-xs text-rose-500 font-medium mt-1.5">{errors.name[0]}</p>}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Village Development Project Name (Optional)
              </label>
              <select
                name="development_project"
                value={formData.development_project}
                onChange={handleInputChange}
                className={`w-full px-4 py-3 rounded-xl border bg-slate-50/50 text-sm focus:bg-white transition-all ${
                  errors.development_project ? 'border-rose-300 focus:ring-rose-500 focus:border-rose-500' : 'border-slate-200 focus:ring-indigo-500 focus:border-indigo-500'
                }`}
              >
                <option value="">-- Choose Project Name --</option>
                <option value="40th Anniversary">40th Anniversary</option>
                <option value="41st Anniversary">41st Anniversary</option>
                <option value="Grama Shakthi">Grama Shakthi</option>
                <option value="Grant Model Village">Grant Model Village</option>
                <option value="Loan Model Village">Loan Model Village</option>
                <option value="Adarsha Gammana">Adarsha Gammana</option>
                <option value="North Province">North Province</option>
                <option value="Welioya Programme">Welioya Programme</option>
              </select>
              {errors.development_project && <p className="text-xs text-rose-500 font-medium mt-1.5">{errors.development_project[0]}</p>}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Village Category (Funding Structure) (Optional)
              </label>
              <select
                name="category_id"
                value={formData.category_id}
                onChange={handleInputChange}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-sm focus:bg-white focus:ring-indigo-500 focus:border-indigo-500 transition-all"
              >
                <option value="">-- Choose Category --</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name} ({cat.code})
                  </option>
                ))}
              </select>
              {errors.category_id && <p className="text-xs text-rose-500 font-medium mt-1.5">{errors.category_id[0]}</p>}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Land Ownership Body (Optional)
              </label>
              <select
                name="ownership_body_id"
                value={formData.ownership_body_id}
                onChange={handleInputChange}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-sm focus:bg-white focus:ring-indigo-500 focus:border-indigo-500 transition-all"
              >
                <option value="">-- Choose Land Owner --</option>
                {ownershipBodies.map((body) => (
                  <option key={body.id} value={body.id}>
                    {body.name}
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
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Province (Optional)
                </label>
                <select
                  name="province"
                  value={formData.province}
                  onChange={handleProvinceChange}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-sm focus:bg-white transition-all"
                >
                  <option value="">-- Province --</option>
                  {provinces.map((prov) => (
                    <option key={prov} value={prov}>
                      {prov}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  District (Optional)
                </label>
                <select
                  name="district_id"
                  disabled={!formData.province}
                  value={formData.district_id}
                  onChange={handleDistrictChange}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-sm focus:bg-white disabled:opacity-50 transition-all"
                >
                  <option value="">-- District --</option>
                  {districts.map((dist) => (
                    <option key={dist.id} value={dist.id}>
                      {dist.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  DS Division (Optional)
                </label>
                <select
                  name="division_id"
                  disabled={!formData.district_id}
                  value={formData.division_id}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-sm focus:bg-white disabled:opacity-50 transition-all"
                >
                  <option value="">-- DS Division --</option>
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
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Grama Niladhari (GN) Division (Optional)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    name="grama_niladhari_division"
                    placeholder={fetchingGn ? "Loading locations database..." : "Type to search GN divisions..."}
                    value={formData.grama_niladhari_division}
                    onChange={handleGnSearch}
                    onFocus={() => setGnSearchFocus(true)}
                    className={`w-full px-4 py-3 rounded-xl border bg-slate-50/50 text-sm focus:bg-white transition-all ${
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

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  GPS Latitude (Optional)
                </label>
                <input
                  type="text"
                  name="gps_lat"
                  placeholder="e.g. 8.0362"
                  value={formData.gps_lat}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-sm focus:bg-white transition-all"
                />
                {errors.gps_lat && <p className="text-xs text-rose-500 font-medium mt-1.5">{errors.gps_lat[0]}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  GPS Longitude (Optional)
                </label>
                <input
                  type="text"
                  name="gps_lng"
                  placeholder="e.g. 80.9784"
                  value={formData.gps_lng}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-sm focus:bg-white transition-all"
                />
                {errors.gps_lng && <p className="text-xs text-rose-500 font-medium mt-1.5">{errors.gps_lng[0]}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Planned Houses (Optional)
                </label>
                <input
                  type="number"
                  name="total_planned_houses"
                  placeholder="e.g. 50"
                  value={formData.total_planned_houses}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-sm focus:bg-white transition-all"
                />
                {errors.total_planned_houses && <p className="text-xs text-rose-500 font-medium mt-1.5">{errors.total_planned_houses[0]}</p>}
              </div>
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Section 3: Status & Dates */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Development Program Status (Optional)
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-sm focus:bg-white transition-all"
              >
                <option value="IN_PROGRESS">In Progress</option>
                <option value="COMPLETED">Completed</option>
                <option value="INCOMPLETE">Incomplete</option>
                <option value="ABANDONED">Abandoned</option>
              </select>
              {errors.status && <p className="text-xs text-rose-500 font-medium mt-1.5">{errors.status[0]}</p>}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Program Start Date
              </label>
              <input
                type="date"
                name="program_start_date"
                value={formData.program_start_date}
                onChange={handleInputChange}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-sm focus:bg-white transition-all"
              />
              {errors.program_start_date && <p className="text-xs text-rose-500 font-medium mt-1.5">{errors.program_start_date[0]}</p>}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Program Target/End Date
              </label>
              <input
                type="date"
                name="program_end_date"
                value={formData.program_end_date}
                onChange={handleInputChange}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-sm focus:bg-white transition-all"
              />
              {errors.program_end_date && <p className="text-xs text-rose-500 font-medium mt-1.5">{errors.program_end_date[0]}</p>}
            </div>

            {/* Environmental flags */}
            <div className="md:col-span-3 flex flex-col sm:flex-row gap-8 bg-slate-50 p-6 rounded-2xl border border-slate-100">
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  name="is_conservation_area"
                  checked={formData.is_conservation_area}
                  onChange={handleInputChange}
                  className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <div>
                  <span className="text-sm font-semibold text-slate-800">Wildlife / Conservation Forest Boundary</span>
                  <p className="text-[10px] text-slate-400 font-medium mt-0.5">Toggle if village lies inside high-risk conservation zones.</p>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  name="has_infrastructure_issues"
                  checked={formData.has_infrastructure_issues}
                  onChange={handleInputChange}
                  className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <div>
                  <span className="text-sm font-semibold text-slate-800">Critical Infrastructure Issues</span>
                  <p className="text-[10px] text-slate-400 font-medium mt-0.5">Toggle if village has major road, water, or grid blockades.</p>
                </div>
              </label>
            </div>

            <div className="md:col-span-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Field Notes & Descriptions
              </label>
              <textarea
                name="notes"
                rows="3"
                placeholder="Describe current road access, surrounding schools, or land disputes..."
                value={formData.notes}
                onChange={handleInputChange}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-sm focus:bg-white transition-all"
              />
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
            type="submit"
            disabled={submitting}
            className="px-8 py-3 rounded-xl bg-indigo-600 text-sm font-bold text-white hover:bg-indigo-500 shadow-md shadow-indigo-500/10 disabled:opacity-50 transition-all flex items-center gap-2"
          >
            {submitting ? (
              <>
                <div className="w-4 h-4 border-2 border-indigo-200 border-t-white rounded-full animate-spin" />
                <span>Saving Details...</span>
              </>
            ) : (
              'Initialize Village'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default VillageForm;
