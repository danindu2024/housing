import React, { useState, useEffect } from 'react';
import api from '../../api/axios';

const HouseForm = ({ villageId, isLoanVillage, onSuccess, onClose }) => {
  // Main House Form Inputs
  const [formData, setFormData] = useState({
    house_number: '',
    owner_name: '',
    owner_nic: '',
    owner_contact: '',
    household_members: '',
    land_area_perches: '',
    construction_stage_id: '',
    occupancy_status: 'NOT_APPLICABLE',
    is_land_sold: false,
    is_house_sold: false,
    has_infrastructure_issues: false,
    notes: '',
  });

  // Expandable Loan Inputs
  const [loanData, setLoanData] = useState({
    loan_amount: '',
    approved_by_name: '',
    approved_by_designation: '',
    approved_by_institution: '',
    approval_date: '',
    repayment_start_date: '',
    monthly_installment: '',
    repayment_months: '120', // Default Standard 10 Years
  });

  // Reference States
  const [stages, setStages] = useState([]);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Load construction stages lookup
  useEffect(() => {
    const fetchStages = async () => {
      try {
        const response = await api.get('/reference/construction-stages');
        setStages(response.data);
      } catch (err) {
        console.error('Failed to load construction stages:', err);
      }
    };
    fetchStages();
  }, []);

  const handleHouseChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    if (errors[name]) {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy[name];
        return copy;
      });
    }
  };

  const handleLoanChange = (e) => {
    const { name, value } = e.target;
    setLoanData((prev) => ({ ...prev, [name]: value }));
    
    // Auto-calculate monthly installment helper for convenience
    if (name === 'loan_amount' || name === 'repayment_months') {
      const amt = parseFloat(name === 'loan_amount' ? value : loanData.loan_amount);
      const months = parseInt(name === 'repayment_months' ? value : loanData.repayment_months);
      
      if (!isNaN(amt) && !isNaN(months) && months > 0) {
        // Linear division for local housing loan structure (can be modified)
        const monthly = (amt / months).toFixed(2);
        setLoanData((prev) => ({ ...prev, monthly_installment: monthly }));
      }
    }

    if (errors[`loan_${name}`]) {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy[`loan_${name}`];
        return copy;
      });
    }
  };

  // Process sequential submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setSubmitting(true);

    try {
      // 1. Submit house details
      const houseRes = await api.post(`/villages/${villageId}/houses`, formData);
      const houseId = houseRes.data.id;

      // 2. Submit loan details (if loan village and amount specified)
      if (isLoanVillage && loanData.loan_amount) {
        await api.post(`/houses/${houseId}/loan`, loanData);
      }

      onSuccess();
    } catch (err) {
      console.error('House registration failed:', err);
      if (err.response?.status === 400 && err.response?.data?.details) {
        const serverErrors = err.response.data.details;
        setErrors(serverErrors);
      } else {
        setErrors({ global: err.response?.data?.error || 'An error occurred while creating the house record.' });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {errors.global && (
        <div className="rounded-xl bg-rose-50 border border-rose-100 p-4 text-xs font-semibold text-rose-600">
          {errors.global}
        </div>
      )}

      {/* House Core details Section */}
      <div>
        <h3 className="text-xs font-black uppercase tracking-widest text-indigo-500 mb-4">Structure Details</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              House Serial Number *
            </label>
            <input
              type="text"
              name="house_number"
              required
              placeholder="e.g. H-005"
              value={formData.house_number}
              onChange={handleHouseChange}
              className={`w-full px-3.5 py-2.5 rounded-xl border text-sm focus:bg-white transition-all ${
                errors.house_number ? 'border-rose-300' : 'border-slate-200'
              }`}
            />
            {errors.house_number && <p className="text-[10px] text-rose-500 font-semibold mt-1">{errors.house_number[0]}</p>}
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Owner Full Name *
            </label>
            <input
              type="text"
              name="owner_name"
              required
              placeholder="e.g. Nimal Perera"
              value={formData.owner_name}
              onChange={handleHouseChange}
              className={`w-full px-3.5 py-2.5 rounded-xl border text-sm focus:bg-white transition-all ${
                errors.owner_name ? 'border-rose-300' : 'border-slate-200'
              }`}
            />
            {errors.owner_name && <p className="text-[10px] text-rose-500 font-semibold mt-1">{errors.owner_name[0]}</p>}
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Owner National ID (NIC) *
            </label>
            <input
              type="text"
              name="owner_nic"
              required
              placeholder="e.g. 198801234567 or 881234567V"
              value={formData.owner_nic}
              onChange={handleHouseChange}
              className={`w-full px-3.5 py-2.5 rounded-xl border text-sm focus:bg-white transition-all ${
                errors.owner_nic ? 'border-rose-300' : 'border-slate-200'
              }`}
            />
            {errors.owner_nic && <p className="text-[10px] text-rose-500 font-semibold mt-1">{errors.owner_nic[0]}</p>}
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Owner Contact Number
            </label>
            <input
              type="text"
              name="owner_contact"
              placeholder="e.g. 0771234567"
              value={formData.owner_contact}
              onChange={handleHouseChange}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:bg-white transition-all"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Household Members count
            </label>
            <input
              type="number"
              name="household_members"
              placeholder="e.g. 4"
              value={formData.household_members}
              onChange={handleHouseChange}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:bg-white transition-all"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Land Area (Perches)
            </label>
            <input
              type="number"
              step="0.01"
              name="land_area_perches"
              placeholder="e.g. 12.5"
              value={formData.land_area_perches}
              onChange={handleHouseChange}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:bg-white transition-all"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Construction Stage *
            </label>
            <select
              name="construction_stage_id"
              required
              value={formData.construction_stage_id}
              onChange={handleHouseChange}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:ring-indigo-500 focus:border-indigo-500 transition-all"
            >
              <option value="">-- Choose Stage --</option>
              {stages.map((stg) => (
                <option key={stg.id} value={stg.id}>
                  {stg.label}
                </option>
              ))}
            </select>
            {errors.construction_stage_id && <p className="text-[10px] text-rose-500 font-semibold mt-1">{errors.construction_stage_id[0]}</p>}
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Occupancy Status *
            </label>
            <select
              name="occupancy_status"
              required
              value={formData.occupancy_status}
              onChange={handleHouseChange}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:ring-indigo-500 focus:border-indigo-500 transition-all"
            >
              <option value="NOT_APPLICABLE">Not Applicable</option>
              <option value="BORROWER_LIVING">Borrower Living</option>
              <option value="SOLD">Property Sold</option>
              <option value="ABANDONED">Abandoned</option>
            </select>
            {errors.occupancy_status && <p className="text-[10px] text-rose-500 font-semibold mt-1">{errors.occupancy_status[0]}</p>}
          </div>
        </div>
      </div>

      {/* Environmental & Sale switches */}
      <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-3">
        <label className="flex items-center gap-2.5 cursor-pointer select-none">
          <input
            type="checkbox"
            name="has_infrastructure_issues"
            checked={formData.has_infrastructure_issues}
            onChange={handleHouseChange}
            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
          />
          <span className="text-xs font-semibold text-slate-700">Has Infrastructure Damage / Road blockades</span>
        </label>

        <label className="flex items-center gap-2.5 cursor-pointer select-none">
          <input
            type="checkbox"
            name="is_land_sold"
            checked={formData.is_land_sold}
            onChange={handleHouseChange}
            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
          />
          <span className="text-xs font-semibold text-slate-700">Land Allotment Sold (Unlawful transactions)</span>
        </label>

        <label className="flex items-center gap-2.5 cursor-pointer select-none">
          <input
            type="checkbox"
            name="is_house_sold"
            checked={formData.is_house_sold}
            onChange={handleHouseChange}
            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
          />
          <span className="text-xs font-semibold text-slate-700">House Property Sold</span>
        </label>
      </div>

      {/* Expandable Loan terms details */}
      {isLoanVillage && (
        <div className="border-t border-slate-100 pt-6">
          <div className="bg-indigo-50/50 rounded-xl border border-indigo-100 p-5 space-y-4">
            <h4 className="text-xs font-black uppercase tracking-widest text-indigo-600 flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Housing Loan Account
            </h4>
            <p className="text-[10px] text-slate-500 font-medium">Leave loan amount empty if no loan has been issued to this house.</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Issued Loan Amount (LKR)
                </label>
                <input
                  type="number"
                  name="loan_amount"
                  placeholder="e.g. 500000"
                  value={loanData.loan_amount}
                  onChange={handleLoanChange}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:ring-indigo-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Repayment Duration (Months)
                </label>
                <select
                  name="repayment_months"
                  value={loanData.repayment_months}
                  onChange={handleLoanChange}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:ring-indigo-500 transition-all"
                >
                  <option value="60">60 Months (5 Years)</option>
                  <option value="120">120 Months (10 Years)</option>
                  <option value="180">180 Months (15 Years)</option>
                  <option value="240">240 Months (20 Years)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Estimated Monthly Installment (LKR)
                </label>
                <input
                  type="number"
                  name="monthly_installment"
                  placeholder="e.g. 4167"
                  value={loanData.monthly_installment}
                  onChange={handleLoanChange}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:ring-indigo-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Approval Date
                </label>
                <input
                  type="date"
                  name="approval_date"
                  value={loanData.approval_date}
                  onChange={handleLoanChange}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:ring-indigo-500 transition-all"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Approving Officer Name
                </label>
                <input
                  type="text"
                  name="approved_by_name"
                  placeholder="e.g. K.D. Gunawardena"
                  required={!!loanData.loan_amount}
                  value={loanData.approved_by_name}
                  onChange={handleLoanChange}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:ring-indigo-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Officer Designation
                </label>
                <input
                  type="text"
                  name="approved_by_designation"
                  placeholder="e.g. Project Officer"
                  value={loanData.approved_by_designation}
                  onChange={handleLoanChange}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:ring-indigo-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Approving Institution
                </label>
                <input
                  type="text"
                  name="approved_by_institution"
                  placeholder="e.g. Mahaweli Authority"
                  value={loanData.approved_by_institution}
                  onChange={handleLoanChange}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:ring-indigo-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Repayment Start Date
                </label>
                <input
                  type="date"
                  name="repayment_start_date"
                  value={loanData.repayment_start_date}
                  onChange={handleLoanChange}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:ring-indigo-500 transition-all"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      <div>
        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
          Owner Field Notes
        </label>
        <textarea
          name="notes"
          rows="2"
          placeholder="Owner details, household parameters, or field audit logs..."
          value={formData.notes}
          onChange={handleHouseChange}
          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:bg-white transition-all"
        />
      </div>

      {/* Form Action Controls */}
      <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-colors"
        >
          Close Panel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="px-6 py-2.5 rounded-xl bg-indigo-600 text-xs font-bold text-white hover:bg-indigo-500 hover:shadow-indigo-500/10 disabled:opacity-50 transition-all flex items-center gap-1.5"
        >
          {submitting ? (
            <>
              <div className="w-3 h-3 border-2 border-indigo-200 border-t-white rounded-full animate-spin" />
              <span>Saving...</span>
            </>
          ) : (
            'Register House'
          )}
        </button>
      </div>
    </form>
  );
};

export default HouseForm;
