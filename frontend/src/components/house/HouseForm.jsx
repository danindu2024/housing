import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import BulkHouseUpload from './BulkHouseUpload';

const FormSection = ({ title, children }) => (
  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
    <div className="px-8 py-5 border-b border-slate-100 flex items-center gap-3 bg-slate-50/60">
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

export default function HouseForm({ villageId, villageCategoryCode, isLoanVillage, onSuccess, onClose, showTabSwitcher = true }) {
  const navigate = useNavigate();
  const bannerRef = useRef(null);
  const [activeTab, setActiveTab] = useState('single'); // 'single' | 'bulk'

  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [villageCategory, setVillageCategory] = useState(villageCategoryCode || '');

  useEffect(() => {
    if (villageCategoryCode) {
      setVillageCategory(villageCategoryCode);
    } else if (villageId) {
      api.get(`/villages/${villageId}`)
        .then((res) => {
          if (res.data && res.data.category_code) {
            setVillageCategory(res.data.category_code);
          }
        })
        .catch((err) => console.error('Failed to fetch village category for house form:', err));
    }
  }, [villageId, villageCategoryCode]);

  const [formData, setFormData] = useState({
    owner_name: '',
    beneficiary_number: '',
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
    notes: '', // වෙනත් සටහන්
    // Dynamic Loan / Grant Fields
    loan_amount: '',
    total_paid_so_far: '',
    repayment_status: 'NOT_PAID',
    loan_notes: '',
    grant_amount: '',
    grant_notes: ''
  });

  const getInputCls = (fieldName) =>
    errors[fieldName]
      ? "w-full px-4 py-3 rounded-xl border border-rose-300 bg-rose-50/20 text-base focus:bg-white focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition-all outline-none"
      : "w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-base focus:bg-white focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition-all outline-none";

  const getSelectCls = (fieldName) => `${getInputCls(fieldName)} cursor-pointer`;

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrors({});
    setSuccessMsg('');
    setSubmitted(false);

    const targetVillageId = villageId;
    if (!targetVillageId) {
      setErrors({ global: ['කරුණාකර ප්‍රථමයෙන් නිවාස ඇතුලත් කිරීමට අදාළ ගම්මානය තෝරන්න. (Please select a target village first.)'] });
      setSubmitting(false);
      setTimeout(() => {
        bannerRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
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
      else if (formData.ownership === 'REPAIR') occupancyStatus = 'ABANDONED';
      else if (formData.ownership === 'RELOCATION') occupancyStatus = 'SOLD';

      // Combine notes
      let finalNotes = '';
      if (formData.permanent_address) finalNotes += `ස්ථිර ලිපිනය: ${formData.permanent_address}`;
      if (formData.estimated_value) finalNotes += `\nඇස්තමේන්තුගත වටිනාකම: රු. ${formData.estimated_value}`;
      if (formData.current_status) {
        const statusTextMap = {
          'IN_PROGRESS': 'ඉදිකිරීම් වර්තමානයේ ක්‍රියාත්මක වේ',
          'STOPPED': 'ඉදිකිරීම් නවතා ඇත',
          'FINISHED': 'ඉදිකර අවසන්'
        };
        finalNotes += `\nවත්මන් තත්ත්වය: ${statusTextMap[formData.current_status] || formData.current_status}`;
      }
      if (formData.notes) finalNotes += `\nවෙනත් සටහන්: ${formData.notes}`;

      const payload = {
        house_number: formData.house_number,
        beneficiary_number: formData.beneficiary_number,
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
        notes: finalNotes,
        // Loan & Grant dynamic fields
        loan_amount: formData.loan_amount !== '' ? parseFloat(formData.loan_amount) : null,
        total_paid_so_far: formData.total_paid_so_far !== '' ? parseFloat(formData.total_paid_so_far) : 0,
        repayment_status: formData.repayment_status || 'NOT_PAID',
        loan_notes: formData.loan_notes || null,
        grant_amount: formData.grant_amount !== '' ? parseFloat(formData.grant_amount) : null,
        grant_notes: formData.grant_notes || null
      };

      await api.post(`/villages/${targetVillageId}/houses`, payload);
      setSubmitted(true);
      setSuccessMsg('නිවාස තොරතුරු සාර්ථකව සුරකින ලදී! (House record saved successfully!)');

      // Reset form input values for continuous house entry
      setFormData({
        owner_name: '',
        beneficiary_number: '',
        owner_nic: '',
        owner_contact: '',
        permanent_address: '',
        house_number: '',
        land_area_perches: '',
        ownership: '',
        infrastructure_issues: [],
        construction_stage: '',
        current_status: '',
        estimated_value: '',
        notes: '',
        loan_amount: '',
        total_paid_so_far: '',
        repayment_status: 'NOT_PAID',
        loan_notes: '',
        grant_amount: '',
        grant_notes: ''
      });

      setTimeout(() => {
        bannerRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err) {
      if (err.response?.status === 400 && err.response?.data?.details) {
        setErrors(err.response.data.details);
      } else {
        console.error('Failed to save house record:', err);
        setErrors({ global: [err.response?.data?.error || 'ලියාපදිංචි කිරීම අසාර්ථක විය. (Registration failed.)'] });
      }

      setTimeout(() => {
        bannerRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">

      {/* Tab Switcher Selector */}
      {showTabSwitcher && (
        <div className="flex bg-slate-100 p-1.5 rounded-xl border border-slate-200/50 max-w-md mx-auto mb-6">
          <button
            type="button"
            onClick={() => setActiveTab('single')}
            className={`flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-200 ${activeTab === 'single'
              ? 'bg-white text-indigo-600 shadow-sm'
              : 'text-slate-500 hover:text-slate-800'
              }`}
          >
            තනි නිවාස ලියාපදිංචිය
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('bulk')}
            className={`flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-200 ${activeTab === 'bulk'
              ? 'bg-white text-indigo-600 shadow-sm'
              : 'text-slate-500 hover:text-slate-800'
              }`}
          >
            Excel තොග වශයෙන්
          </button>
        </div>
      )}

      {activeTab === 'bulk' ? (
        <BulkHouseUpload villageId={villageId} onSuccess={onSuccess} />
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Beneficiary Info */}
          <FormSection title="Beneficiary Details">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <FieldLabel required>ප්‍රතිලාභී අංකය / Beneficiary Number</FieldLabel>
                <input
                  type="text"
                  name="beneficiary_number"
                  value={formData.beneficiary_number}
                  onChange={handleChange}
                  placeholder="උදා: NH/HA/MV/SD/0001"
                  className={getInputCls('beneficiary_number')}
                  required
                />
                {errors.beneficiary_number && <p className="text-xs text-rose-500 font-medium mt-1.5">{errors.beneficiary_number[0]}</p>}
              </div>
              <div className="md:col-span-2">
                <FieldLabel required>ප්‍රතිලාභකරුගේ සම්පූර්ණ නම/Beneficiary Full Name </FieldLabel>
                <input
                  type="text"
                  name="owner_name"
                  value={formData.owner_name}
                  onChange={handleChange}
                  placeholder="සම්පූර්ණ නම ඇතුළත් කරන්න"
                  className={getInputCls('owner_name')}
                  required
                />
                {errors.owner_name && <p className="text-xs text-rose-500 font-medium mt-1.5">{errors.owner_name[0]}</p>}
              </div>
              <div>
                <FieldLabel>ජාතික හැඳුනුම්පත් අංකය /NIC Number</FieldLabel>
                <input
                  type="text"
                  name="owner_nic"
                  value={formData.owner_nic}
                  onChange={handleChange}
                  placeholder="XXXXXXXXXV / XXXXXXXXXXX"
                  className={getInputCls('owner_nic')}
                />
                {errors.owner_nic && <p className="text-xs text-rose-500 font-medium mt-1.5">{errors.owner_nic[0]}</p>}
              </div>
              <div>
                <FieldLabel>ජංගම දුරකථන අංකය / Phone Number</FieldLabel>
                <input
                  type="tel"
                  name="owner_contact"
                  value={formData.owner_contact}
                  onChange={handleChange}
                  placeholder="07XXXXXXXX"
                  className={getInputCls('owner_contact')}
                />
                {errors.owner_contact && <p className="text-xs text-rose-500 font-medium mt-1.5">{errors.owner_contact[0]}</p>}
              </div>
              <div className="md:col-span-3">
                <FieldLabel>ස්ථිර නිවාස ලිපිනය / Permanent Address</FieldLabel>
                <textarea
                  rows="2"
                  name="permanent_address"
                  value={formData.permanent_address}
                  onChange={handleChange}
                  placeholder="ලිපිනය ඇතුළත් කරන්න"
                  className={getInputCls('permanent_address')}
                />
                {errors.permanent_address && <p className="text-xs text-rose-500 font-medium mt-1.5">{errors.permanent_address[0]}</p>}
              </div>
            </div>
          </FormSection>

          {/* Section 2: House / Plot Details */}
          <FormSection title="House / Land Details">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <FieldLabel>මූලික පිඹුරේ හෝ කට්ටි සැලැස්මේ අංකය / House Plan Number</FieldLabel>
                <input
                  type="text"
                  name="house_number"
                  value={formData.house_number}
                  onChange={handleChange}
                  placeholder="HOU-XXXX"
                  className={getInputCls('house_number')}
                />
                {errors.house_number && <p className="text-xs text-rose-500 font-medium mt-1.5">{errors.house_number[0]}</p>}
              </div>
              <div>
                <FieldLabel>ඉඩමේ ප්‍රමාණය / Land Size (perches)</FieldLabel>
                <input
                  type="number"
                  name="land_area_perches"
                  value={formData.land_area_perches}
                  onChange={handleChange}
                  placeholder="20"
                  className={getInputCls('land_area_perches')}
                />
                {errors.land_area_perches && <p className="text-xs text-rose-500 font-medium mt-1.5">{errors.land_area_perches[0]}</p>}
              </div>
              <div>
                <FieldLabel>අයිතිය / Ownership</FieldLabel>
                <select
                  name="ownership"
                  value={formData.ownership}
                  onChange={handleChange}
                  className={getSelectCls('ownership')}
                >
                  <option value="">-- අයිතිය තෝරන්න --</option>
                  <option value="NEW">අයිතිය ප්‍රතිලාභියා සතුයි / Beneficier has the ownership</option>
                  <option value="REPAIR">නිවස කුලියට දී ඇත / House is rented</option>
                  <option value="RELOCATION">ඉඩම/ නිවස විකුණා ඇත / Land/House has been sold</option>
                </select>
                {errors.ownership && <p className="text-xs text-rose-500 font-medium mt-1.5">{errors.ownership[0]}</p>}
              </div>

              <div className="md:col-span-3">
                <label className="block text-sm font-bold uppercase tracking-wider text-slate-500 mb-3">
                  යටිතල පහසුකම් / Infrastructure
                </label>
                <div className="flex flex-wrap gap-6 bg-white p-4 rounded-xl border border-slate-200">
                  {[
                    { value: 'WATER', label: 'ජලය (Water)' },
                    { value: 'ELECTRICITY', label: 'විදුලිය (Electricity)' },
                    { value: 'ACCESS_ROADS', label: 'ප්‍රවේශ මාර්ග (Access Roads)' }
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
          <FormSection title="Construction Progress">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <FieldLabel>ඉදිකිරීම් තත්ත්වය / Construction Progress</FieldLabel>
                <select
                  name="construction_stage"
                  value={formData.construction_stage}
                  onChange={handleChange}
                  className={getSelectCls('construction_stage')}
                >
                  <option value="">-- තත්ත්වය තෝරන්න --</option>
                  <option value="NOT_STARTED">ආරම්භ කර නොමැත / Not Started</option>
                  <option value="FOUNDATION">අත්තිවාරම දමා ඇත / Foundation Complete</option>
                  <option value="WALL">ජනෙල් මට්ටමට නිමකර ඇත / Window Level Complete</option>
                  <option value="ROOF">ලින්ටල් මට්ටමට නිමකර ඇත / Lintel Level Complete</option>
                  <option value="FINISHING">වහල මට්ටමට නිමකර ඇත / Roof Level Complete</option>
                  <option value="FINISHING2">වහලය නිමකර ඇත / Roof Completed</option>
                  <option value="FINISHING3">කපරාරු නිමකර ඇත / Plastering Completed</option>
                  <option value="COMPLETED">නිවස සම්පූර්ණයෙන් ඉදිකර ඇත / Fully complete</option>
                </select>
                {errors.construction_stage_id && <p className="text-xs text-rose-500 font-medium mt-1.5">{errors.construction_stage_id[0]}</p>}
              </div>

              <div>
                <FieldLabel>වත්මන් තත්ත්වය / Current Stage</FieldLabel>
                <select
                  name="current_status"
                  value={formData.current_status}
                  onChange={handleChange}
                  className={getSelectCls('current_status')}
                >
                  <option value="">-- තත්ත්වය තෝරන්න --</option>
                  <option value="IN_PROGRESS">ඉදිකිරීම් වර්තමානයේ ක්‍රියාත්මක වේ / Active Construction</option>
                  <option value="STOPPED">ඉදිකිරීම් නවතා ඇත / Construction Paused</option>
                  <option value="FINISHED">ඉදිකර අවසන් / Finish</option>
                </select>
                {errors.current_status && <p className="text-xs text-rose-500 font-medium mt-1.5">{errors.current_status[0]}</p>}
              </div>

              <div>
                <FieldLabel>ඉදිකර ඇති කොටසේ දළ වටිනාකම / Estimated Construction Value</FieldLabel>
                <input
                  type="number"
                  name="estimated_value"
                  value={formData.estimated_value}
                  onChange={handleChange}
                  placeholder="රු. 0.00"
                  className={getInputCls('estimated_value')}
                />
                {errors.estimated_value && <p className="text-xs text-rose-500 font-medium mt-1.5">{errors.estimated_value[0]}</p>}
              </div>

              <div className="md:col-span-3">
                <FieldLabel>වෙනත් සටහන් / Other Details</FieldLabel>
                <textarea
                  rows="3"
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  placeholder="ඉහත සදහන් නොවන වෙනත් තොරතුරු ඇත්නම් ඇතුළත් කරන්න"
                  className={getInputCls('notes')}
                />
                {errors.notes && <p className="text-xs text-rose-500 font-medium mt-1.5">{errors.notes[0]}</p>}
              </div>
            </div>
          </FormSection>

          {/* Section 4: Dynamic Loan / Grant Details */}
          {(villageCategory === 'LOAN' || isLoanVillage) && (
            <FormSection title="Loan Details / ණය පිළිබඳ විස්තර">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <FieldLabel>මුළු ණය මුදල (රු.) / Total Loan (LKR)</FieldLabel>
                  <input
                    type="number"
                    name="loan_amount"
                    step="0.01"
                    value={formData.loan_amount}
                    onChange={handleChange}
                    placeholder="රු. 0.00"
                    className={getInputCls('loan_amount')}
                  />
                  {errors.loan_amount && <p className="text-xs text-rose-500 font-medium mt-1.5">{errors.loan_amount[0]}</p>}
                </div>

                <div>
                  <FieldLabel>මේ දක්වා ගෙවා ඇති මුදල (රු.) / Total Paid So Far</FieldLabel>
                  <input
                    type="number"
                    name="total_paid_so_far"
                    step="0.01"
                    value={formData.total_paid_so_far}
                    onChange={handleChange}
                    placeholder="රු. 0.00"
                    className={getInputCls('total_paid_so_far')}
                  />
                  {errors.total_paid_so_far && <p className="text-xs text-rose-500 font-medium mt-1.5">{errors.total_paid_so_far[0]}</p>}
                </div>

                <div>
                  <FieldLabel>ණය ආපසු ගෙවීමේ තත්ත්වය / Repayment Status</FieldLabel>
                  <select
                    name="repayment_status"
                    value={formData.repayment_status}
                    onChange={handleChange}
                    className={getSelectCls('repayment_status')}
                  >
                    <option value="NOT_PAID">තවම ගෙවා නැත / Not Paid</option>
                    <option value="PAYING">ගෙවමින් පවතී / Paying</option>
                    <option value="PARTIALLY_PAID">කොටසක් ගෙවා ඇත / Partially Paid</option>
                    <option value="FULLY_PAID">සම්පූර්ණයෙන්ම ගෙවා අවසන් / Fully Paid</option>
                    <option value="DEFAULTED">පැහැර හැර ඇත / Defaulted</option>
                  </select>
                  {errors.repayment_status && <p className="text-xs text-rose-500 font-medium mt-1.5">{errors.repayment_status[0]}</p>}
                </div>

                <div className="md:col-span-3">
                  <FieldLabel>ණය පිළිබඳ වෙනත් සටහන් / Loan Notes</FieldLabel>
                  <textarea
                    rows="2"
                    name="loan_notes"
                    value={formData.loan_notes}
                    onChange={handleChange}
                    placeholder="ණය සම්බන්ධ වෙනත් සටහන් ඇතුළත් කරන්න..."
                    className={getInputCls('loan_notes')}
                  />
                  {errors.loan_notes && <p className="text-xs text-rose-500 font-medium mt-1.5">{errors.loan_notes[0]}</p>}
                </div>
              </div>
            </FormSection>
          )}

          {(villageCategory && (villageCategory.startsWith('GRANT') || villageCategory.includes('GRANT'))) && (
            <FormSection title="Grant Details / දීමනා පිළිබඳ විස්තර">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <FieldLabel>මුළු දීමනා මුදල (රු.) / Total Grant (LKR)</FieldLabel>
                  <input
                    type="number"
                    name="grant_amount"
                    step="0.01"
                    value={formData.grant_amount}
                    onChange={handleChange}
                    placeholder="රු. 0.00"
                    className={getInputCls('grant_amount')}
                  />
                  {errors.grant_amount && <p className="text-xs text-rose-500 font-medium mt-1.5">{errors.grant_amount[0]}</p>}
                </div>

                <div className="md:col-span-2">
                  <FieldLabel>දීමනා පිළිබඳ වෙනත් සටහන් / Grant Notes</FieldLabel>
                  <textarea
                    rows="2"
                    name="grant_notes"
                    value={formData.grant_notes}
                    onChange={handleChange}
                    placeholder="දීමනාව සම්බන්ධ වෙනත් සටහන් ඇතුළත් කරන්න..."
                    className={getInputCls('grant_notes')}
                  />
                  {errors.grant_notes && <p className="text-xs text-rose-500 font-medium mt-1.5">{errors.grant_notes[0]}</p>}
                </div>
              </div>
            </FormSection>
          )}

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

          {/* Status & Error Banners (Bottom) */}
          <div ref={bannerRef} className="space-y-4 pt-2">
            {successMsg && (
              <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-6 flex items-start justify-between gap-4 shadow-md">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 flex-shrink-0">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-base">සාර්ථකයි! (Success)</h3>
                    <p className="text-sm text-emerald-800 mt-1 font-medium">{successMsg}</p>
                  </div>
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
                    <p className="text-sm text-rose-700 mt-1 font-medium">{Array.isArray(errors.global) ? errors.global[0] : errors.global}</p>
                  ) : (
                    <div className="mt-2 text-xs text-rose-750 space-y-1">
                      <p className="font-semibold">ඉහත දක්වා ඇති දත්ත නිවැරදි කර නැවත උත්සාහ කරන්න (Please correct the highlighted errors above and try again)</p>
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
        </form>
      )}
    </div>
  );
}
