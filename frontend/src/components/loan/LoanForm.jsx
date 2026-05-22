import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const SECTION_ICON = ({ children }) => (
  <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 flex-shrink-0">
    {children}
  </div>
);

const FormSection = ({ title, icon, children, accent = 'emerald' }) => {
  const colors = {
    emerald: 'text-emerald-600',
    indigo: 'text-indigo-600',
    amber: 'text-amber-600',
  };
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-8 py-5 border-b border-slate-100 flex items-center gap-3 bg-slate-50/60">
        <SECTION_ICON>{icon}</SECTION_ICON>
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
const selectCls = `${inputCls} cursor-pointer`;

export default function LoanForm() {
  const navigate = useNavigate();
  const [submitted, setSubmitted] = useState(false);
  const [loanType, setLoanType] = useState('');

  // 1. Added formData state
  const [formData, setFormData] = useState({
    is_conservation_area: false,
  });

  // 2. Added handler for the checkbox (and any future inputs you bind to formData)
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
    // You could also log formData here to see your checkbox value: console.log(formData);
    setTimeout(() => setSubmitted(false), 3000);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-emerald-600 transition-colors uppercase tracking-wider mb-3"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
            ආපසු
          </button>
          <h1 className="text-2xl font-black text-slate-800">ණය / ආධාර ලේඛනය</h1>
          <p className="text-sm text-slate-400 font-medium mt-1">ප්‍රතිලාභකරුගේ ණය හෝ ආධාර ගෙවීම් තොරතුරු ඇතුළත් කරන්න</p>
        </div>
        {submitted && (
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 font-semibold text-sm px-4 py-2.5 rounded-xl">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            ලේඛනය සුරකින ලදී
          </div>
        )}
      </div>

      {/* Loan Type Banner */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl p-6 text-white shadow-lg shadow-emerald-600/20">
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

      <form onSubmit={handleSubmit} className="space-y-6">

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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <FieldLabel required>ප්‍රතිලාභකරුගේ ජා.හැ. අංකය (NIC)</FieldLabel>
              <input type="text" placeholder="XXXXXXXXXV" className={inputCls} />
            </div>
            <div>
              <FieldLabel>මූලික පිඹුරේ හෝ කට්ටි සැලැස්මේ අංකය</FieldLabel>
              <input type="text" placeholder="HOU-XXXX" className={inputCls} />
            </div>
          </div>
        </FormSection>

        {/* Section 2: Loan / Grant Details */}
        <FormSection
          title={loanType === 'GRANT' ? 'ආධාර විස්තර' : 'ණය විස්තර'}
          accent="emerald"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        >
          <div className="md:col-span-3 flex flex-col sm:flex-row gap-8 bg-slate-50 p-6 rounded-2xl border border-slate-100 mb-6">
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                name="is_conservation_area"
                checked={formData.is_conservation_area}
                onChange={handleInputChange}
                className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <div>
                <span className="text-base font-semibold text-slate-800">ණය/ආධාර ලබාගෙන ඇත්තේ නිවාස කමිටු අනුමැතිව සහිතවයි
</span>
              </div>
            </label>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            <div>
              <FieldLabel required>මුළු {loanType === 'GRANT' ? 'ආධාර' : 'ණය'} මුදල (රු.)</FieldLabel>
              <input type="number" placeholder="රු. 0.00" className={inputCls} />
            </div>
            
            
            
            
      
          </div>
        </FormSection>

        

        

        {/* Section 5: Status & Notes */}
        <FormSection
          title="ණය ගෙවීම"
          accent="emerald"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <FieldLabel required>වර්තමාන තත්ත්වය</FieldLabel>
              <select className={selectCls}>
                <option value="">-- තත්ත්වය තෝරන්න --</option>
                <option value="PENDING">ණය සම්පූර්ණයෙන් ගෙවා අවසන්</option>
                <option value="APPROVED">ණය ගෙවමින් පවතී</option>
                <option value="DISBURSING">ණය ගෙවීම සිදුනොවේ</option>
              </select>
            </div>
            <div>
              <FieldLabel>ණය ගෙවා ඇති ප්‍රමාණය</FieldLabel>
              <input type="number" placeholder="රු. 0.00" className={inputCls} />
            </div>
            <div>
              <FieldLabel>ඉතිරි ප්‍රමාණය</FieldLabel>
              <input type="number" placeholder="රු. 0.00" className={inputCls} />
            </div>
            
            
          </div>
        </FormSection>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-4 py-2">
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
    </div>
  );
}