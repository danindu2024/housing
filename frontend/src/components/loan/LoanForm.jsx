import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import BulkFinancialUpload from './BulkFinancialUpload';
import BulkOfficerUpload from './BulkOfficerUpload';
import api from '../../api/axios';

const SECTION_ICON = ({ children }) => (
  <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 flex-shrink-0">
    {children}
  </div>
);

const SECTION_ICON_INDIGO = ({ children }) => (
  <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 flex-shrink-0">
    {children}
  </div>
);

const FormSection = ({ title, icon, children, accent = 'emerald' }) => {
  const colors = {
    emerald: 'text-emerald-600',
    indigo: 'text-indigo-600',
    amber: 'text-amber-600',
  };
  const iconDiv = accent === 'indigo' ? <SECTION_ICON_INDIGO>{icon}</SECTION_ICON_INDIGO> : <SECTION_ICON>{icon}</SECTION_ICON>;
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden font-sans">
      <div className="px-8 py-5 border-b border-slate-100 flex items-center gap-3 bg-slate-50/60">
        {iconDiv}
        <h3 className={`text-sm font-black uppercase tracking-widest ${colors[accent]}`}>{title}</h3>
      </div>
      <div className="p-8">{children}</div>
    </div>
  );
};

const FieldLabel = ({ children, required }) => (
  <label className="block text-sm font-bold uppercase tracking-wider text-slate-500 mb-2">
    {children} {required && <span className="text-rose-400 normal-case tracking-normal font-semibold">*</span>}
  </label>
);

const inputCls = "w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-base focus:bg-white focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 transition-all outline-none";
const inputClsIndigo = "w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-base focus:bg-white focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition-all outline-none";
const selectCls = `${inputCls} cursor-pointer`;

export default function LoanForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const isOfficerRoute = location.pathname.startsWith('/officers');
  const formCategory = isOfficerRoute ? 'officers' : 'financials';

  const [activeFormTab, setActiveFormTab] = useState('single'); // 'single' or 'bulk'
  const [submitted, setSubmitted] = useState(false);
  const [loanType, setLoanType] = useState('LOAN');

  // formData state reflecting repayment details
  const [formData, setFormData] = useState({
    owner_nic: '',
    house_number: '',
    loan_amount: '',
    monthly_installment: '',
    repayment_months: '',
    total_paid_so_far: '0',
    repayment_status: 'PAYING',
    notes: '',
  });

  // Officer form state
  const [officerFormData, setOfficerFormData] = useState({
    name: '',
    contact_number: '',
    type: 'GOVERNMENT', // 'GOVERNMENT' or 'EXTERNAL'
    position: '',
    payment: '',
    notes: '',
  });

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleOfficerInputChange = (e) => {
    const { name, value } = e.target;
    setOfficerFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitted(false);

    try {
      const payload = {
        owner_nic: formData.owner_nic,
        house_number: formData.house_number,
        loan_amount: formData.loan_amount,
        grant_amount: formData.loan_amount, // Symmetrical mapping for grants
        monthly_installment: formData.monthly_installment,
        repayment_months: formData.repayment_months,
        total_paid_so_far: formData.total_paid_so_far,
        repayment_status: formData.repayment_status,
        notes: formData.notes,
      };

      const endpoint = loanType === 'LOAN' ? '/loans/bulk' : '/grants/bulk';
      await api.post(endpoint, [payload]);

      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        navigate('/villages');
      }, 2000);
    } catch (err) {
      console.error('Failed to submit single record:', err);
      alert(err.response?.data?.error || 'ප්‍රතිලාභියා සෙවීමට හෝ දත්ත ඇතුළත් කිරීමට නොහැක.');
    }
  };

  const handleOfficerSubmit = async (e) => {
    e.preventDefault();
    setSubmitted(false);

    try {
      const payload = {
        name: officerFormData.name,
        contact_number: officerFormData.contact_number,
        type: officerFormData.type,
        position: officerFormData.type === 'GOVERNMENT' ? officerFormData.position : null,
        payment: officerFormData.type === 'EXTERNAL' ? officerFormData.payment : null,
        notes: officerFormData.notes,
      };

      await api.post('/officers', payload);

      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        navigate('/villages');
      }, 2000);
    } catch (err) {
      console.error('Failed to submit officer record:', err);
      alert(err.response?.data?.error || 'නිලධාරී තොරතුරු ඇතුලත් කිරීමට නොහැක.');
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex items-start justify-between font-sans">
        <div>
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-indigo-600 transition-colors uppercase tracking-wider mb-3"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
            ආපසු
          </button>
          <h1 className="text-2xl font-black text-slate-800">
            {formCategory === 'officers' ? 'නිලධාරී ලේඛනය (Officers Registry)' : 'ණය / ආධාර ලේඛනය (Loan & Grant Collection)'}
          </h1>
          <p className="text-sm text-slate-400 font-medium mt-1">
            {formCategory === 'officers' 
              ? 'රජයේ හෝ බාහිර නිලධාරීන්ගේ තොරතුරු ලියාපදිංචි කරන්න' 
              : 'ප්‍රතිලාභකරුගේ ණය හෝ ආධාර ගෙවීම් තොරතුරු ඇතුළත් කරන්න'}
          </p>
        </div>
        {submitted && (
          <div className={`flex items-center gap-2 border font-semibold text-sm px-4 py-2.5 rounded-xl animate-bounce ${
            formCategory === 'officers'
              ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
              : 'bg-emerald-50 border-emerald-200 text-emerald-700'
          }`}>
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            ලේඛනය සුරකින ලදී
          </div>
        )}
      </div>



      {/* Form Mode Selector Switch */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-px font-sans">
        <button
          onClick={() => setActiveFormTab('single')}
          className={`py-3 px-6 text-sm font-bold border-b-2 transition-all ${
            activeFormTab === 'single'
              ? (formCategory === 'financials' ? 'border-emerald-500 text-emerald-600 font-black' : 'border-indigo-500 text-indigo-600 font-black')
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          තනි ඇතුළත් කිරීම් (Single Entry)
        </button>
        <button
          onClick={() => setActiveFormTab('bulk')}
          className={`py-3 px-6 text-sm font-bold border-b-2 transition-all ${
            activeFormTab === 'bulk'
              ? (formCategory === 'financials' ? 'border-emerald-500 text-emerald-600 font-black' : 'border-indigo-500 text-indigo-600 font-black')
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          Excel තොග වශයෙන් (Bulk Excel Upload)
        </button>
      </div>

      {formCategory === 'financials' ? (
        activeFormTab === 'bulk' ? (
          <BulkFinancialUpload onSuccess={() => navigate('/villages')} />
        ) : (
          <>
            {/* Loan Type Banner */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl p-6 text-white shadow-lg shadow-emerald-600/20 font-sans animate-fade-in">
              <p className="text-xs font-bold uppercase tracking-widest text-emerald-100 mb-3">ණය / ආධාර ප්‍රවර්ගය තෝරන්න</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { val: 'LOAN', label: 'ණය (Loan)', icon: '🏦', desc: 'ආපසු ගෙවිය යුතු ණය' },
                  { val: 'GRANT', label: 'ආධාර (Grant)', icon: '🎁', desc: 'ආපසු ගෙවීමට අවශ්‍ය නොවේ' },
                ].map(({ val, label, icon, desc }) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setLoanType(val)}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${loanType === val
                        ? 'border-white bg-white/20 shadow-lg'
                        : 'border-white/30 hover:border-white/60 hover:bg-white/10'
                      }`}
                  >
                    <div className="text-2xl mb-1">{icon}</div>
                    <div className="font-bold text-sm">{label}</div>
                    <div className="text-xs text-emerald-100 mt-0.5">{desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 font-sans">
              {/* Section 1: Beneficiary Reference */}
              <FormSection
                title="ප්‍රතිලාභකරු විස්තර"
                accent="emerald"
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                }
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <FieldLabel required>ප්‍රතිලාභකරුගේ ජා.හැ. අංකය (NIC)</FieldLabel>
                    <input
                      type="text"
                      name="owner_nic"
                      value={formData.owner_nic}
                      onChange={handleInputChange}
                      placeholder="XXXXXXXXXV"
                      className={inputCls}
                      required
                    />
                  </div>
                  <div>
                    <FieldLabel>මූලික පිඹුරේ හෝ කට්ටි සැලැස්මේ අංකය (House Number)</FieldLabel>
                    <input
                      type="text"
                      name="house_number"
                      value={formData.house_number}
                      onChange={handleInputChange}
                      placeholder="HOU-XXXX"
                      className={inputCls}
                    />
                  </div>
                </div>
              </FormSection>

              {/* Section 2: Details */}
              <FormSection
                title={loanType === 'GRANT' ? 'ආධාර විස්තර' : 'ණය විස්තර'}
                accent="emerald"
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <FieldLabel required>මුළු {loanType === 'GRANT' ? 'ආධාර' : 'ණය'} මුදල (රු.)</FieldLabel>
                    <input
                      type="number"
                      name="loan_amount"
                      value={formData.loan_amount}
                      onChange={handleInputChange}
                      placeholder="රු. 0.00"
                      className={inputCls}
                      required
                    />
                  </div>
                  {loanType === 'LOAN' && (
                    <>
                      <div>
                        <FieldLabel required>මාසික වාරිකය (Monthly Installment)</FieldLabel>
                        <input
                          type="number"
                          name="monthly_installment"
                          value={formData.monthly_installment}
                          onChange={handleInputChange}
                          placeholder="රු. 0.00"
                          className={inputCls}
                          required
                        />
                      </div>
                      <div>
                        <FieldLabel required>වාරික ගණන (Repayment Months)</FieldLabel>
                        <input
                          type="number"
                          name="repayment_months"
                          value={formData.repayment_months}
                          onChange={handleInputChange}
                          placeholder="48"
                          className={inputCls}
                          required
                        />
                      </div>
                    </>
                  )}
                </div>
              </FormSection>

              {/* Section 3: Repayments (Repayment Tracking) */}
              {loanType === 'LOAN' && (
                <FormSection
                  title="ණය ගෙවීම (Loan Repayment)"
                  accent="emerald"
                  icon={
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  }
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <FieldLabel required>මේ දක්වා ගෙවා ඇති මුලු ණය මුදල (Total Paid So Far)</FieldLabel>
                      <input
                        type="number"
                        name="total_paid_so_far"
                        value={formData.total_paid_so_far}
                        onChange={handleInputChange}
                        placeholder="රු. 0.00"
                        className={inputCls}
                        required
                      />
                    </div>
                    <div>
                      <FieldLabel required>ණය ගෙවීම් තත්වය (Repayment Status)</FieldLabel>
                      <select
                        name="repayment_status"
                        value={formData.repayment_status}
                        onChange={handleInputChange}
                        className={selectCls}
                        required
                      >
                        <option value="PAYING">ණය ගෙවමින් පවති</option>
                        <option value="FULLY_PAID">ණය ගෙවා අවසන්</option>
                        <option value="DEFAULTED">ණය ගෙවීම පැහැරහැර ඇත</option>
                      </select>
                    </div>
                  </div>
                </FormSection>
              )}

              {/* Section 4: Notes */}
              <FormSection
                title="අමතර විස්තර සහ සටහන්"
                accent="emerald"
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 00-2 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                }
              >
                <div>
                  <FieldLabel>සටහන් (Notes)</FieldLabel>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    rows="4"
                    placeholder="අමතර තොරතුරු මෙහි ඇතුලත් කරන්න..."
                    className={inputCls}
                  ></textarea>
                </div>
              </FormSection>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-4 py-2 font-sans">
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="px-6 py-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-100 transition-all"
                >
                  අවලංගු කරන්න
                </button>
                <button
                  type="submit"
                  className="px-8 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold shadow-lg shadow-emerald-600/20 hover:shadow-emerald-500/30 transition-all flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  ලේඛනය සුරකින්න
                </button>
              </div>
            </form>
          </>
        )
      ) : (
        activeFormTab === 'bulk' ? (
          <BulkOfficerUpload onSuccess={() => navigate('/villages')} />
        ) : (
          <>
            {/* Officer Type Banner */}
            <div className="bg-gradient-to-r from-indigo-600 to-violet-650 rounded-2xl p-6 text-white shadow-lg shadow-indigo-600/20 font-sans animate-fade-in">
              <p className="text-xs font-bold uppercase tracking-widest text-indigo-100 mb-3">නිලධාරී වර්ගය තෝරන්න</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { val: 'GOVERNMENT', label: 'රජයේ නිලධාරීන් (TO)', icon: '🏛️', desc: 'තනතුර (Position) ඇතුළත් කිරීම අනිවාර්ය වේ' },
                  { val: 'EXTERNAL', label: 'බාහිර පුද්ගලයින් (External)', icon: '💼', desc: 'ගෙවීම් (Payment) ඇතුළත් කිරීම අනිවාර්ය වේ' },
                ].map(({ val, label, icon, desc }) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setOfficerFormData(prev => ({ ...prev, type: val }))}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${officerFormData.type === val
                        ? 'border-white bg-white/20 shadow-lg'
                        : 'border-white/30 hover:border-white/60 hover:bg-white/10'
                      }`}
                  >
                    <div className="text-2xl mb-1">{icon}</div>
                    <div className="font-bold text-sm">{label}</div>
                    <div className="text-xs text-indigo-100 mt-0.5">{desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleOfficerSubmit} className="space-y-6 font-sans">
              {/* Section 1: Officer Personal Info */}
              <FormSection
                title="නිලධාරී තොරතුරු"
                accent="indigo"
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                }
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <FieldLabel required>නම (Full Name)</FieldLabel>
                    <input
                      type="text"
                      name="name"
                      value={officerFormData.name}
                      onChange={handleOfficerInputChange}
                      placeholder="කමල් ගුණරත්න"
                      className={inputClsIndigo}
                      required
                    />
                  </div>
                  <div>
                    <FieldLabel>දුරකථන අංකය (Contact Number)</FieldLabel>
                    <input
                      type="text"
                      name="contact_number"
                      value={officerFormData.contact_number}
                      onChange={handleOfficerInputChange}
                      placeholder="0777123456"
                      className={inputClsIndigo}
                    />
                  </div>
                </div>
              </FormSection>

              {/* Section 2: Specific fields per officer type */}
              <FormSection
                title={officerFormData.type === 'GOVERNMENT' ? 'රජයේ නිලධාරී අමතර විස්තර' : 'බාහිර පුද්ගල ගෙවීම් විස්තර'}
                accent="indigo"
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                }
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {officerFormData.type === 'GOVERNMENT' ? (
                    <div>
                      <FieldLabel required>තනතුර (Position)</FieldLabel>
                      <input
                        type="text"
                        name="position"
                        value={officerFormData.position}
                        onChange={handleOfficerInputChange}
                        placeholder="Technical Officer (TO)"
                        className={inputClsIndigo}
                        required
                      />
                    </div>
                  ) : (
                    <div>
                      <FieldLabel required>ගෙවීම් මුදල (Payment - රු.)</FieldLabel>
                      <input
                        type="number"
                        name="payment"
                        value={officerFormData.payment}
                        onChange={handleOfficerInputChange}
                        placeholder="රු. 0.00"
                        className={inputClsIndigo}
                        required
                      />
                    </div>
                  )}
                </div>
              </FormSection>

              {/* Section 3: Notes */}
              <FormSection
                title="සටහන්"
                accent="indigo"
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 00-2 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                }
              >
                <div>
                  <FieldLabel>සටහන් (Notes)</FieldLabel>
                  <textarea
                    name="notes"
                    value={officerFormData.notes}
                    onChange={handleOfficerInputChange}
                    rows="4"
                    placeholder="අමතර තොරතුරු මෙහි ඇතුලත් කරන්න..."
                    className={inputClsIndigo}
                  ></textarea>
                </div>
              </FormSection>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-4 py-2 font-sans">
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="px-6 py-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-100 transition-all"
                >
                  අවලංගු කරන්න
                </button>
                <button
                  type="submit"
                  className="px-8 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold shadow-lg shadow-indigo-600/20 hover:shadow-indigo-500/30 transition-all flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  ලේඛනය සුරකින්න
                </button>
              </div>
            </form>
          </>
        )
      )}
    </div>
  );
}