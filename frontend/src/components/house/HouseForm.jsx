import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

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

export default function HouseForm() {
  const navigate = useNavigate();
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState({
    infrastructure_issues: [],
  });

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

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3000);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex items-start justify-between">
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
          <h1 className="text-2xl font-black text-slate-800">නිවාස ලේඛනය</h1>
          <p className="text-sm text-slate-400 font-medium mt-1">ප්‍රතිලාභකරුගේ නිවාස තොරතුරු ඇතුළත් කරන්න</p>
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

      <form onSubmit={handleSubmit} className="space-y-6">

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
            <div className="md:col-span-2">
              <FieldLabel required>ප්‍රතිලාභකරුගේ සම්පූර්ණ නම</FieldLabel>
              <input type="text" placeholder="සම්පූර්ණ නම ඇතුළත් කරන්න" className={inputCls} />
            </div>
            <div>
              <FieldLabel required>ජාතික හැඳුනුම්පත් අංකය (NIC)</FieldLabel>
              <input type="text" placeholder="XXXXXXXXXV / XXXXXXXXXXXX" className={inputCls} />
            </div>
            <div>
              <FieldLabel>ජංගම දුරකථන අංකය</FieldLabel>
              <input type="tel" placeholder="07XXXXXXXX" className={inputCls} />
            </div>
            <div className="md:col-span-3">
              <FieldLabel>ස්ථිර නිවාස ලිපිනය</FieldLabel>
              <textarea rows="2" placeholder="ලිපිනය ඇතුළත් කරන්න..." className={inputCls} />
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
              <input type="text" placeholder="HOU-XXXX" className={inputCls} />
            </div>
            <div>
              <FieldLabel>ඉඩමේ ප්‍රමාණය (පර්ච)</FieldLabel>
              <input type="number" placeholder="උදා: 20" className={inputCls} />
            </div>
            <div>
              <FieldLabel required>අයිතිය</FieldLabel>
              <select className={selectCls}>
                <option value="">-- අයිතිය තෝරන්න --</option>
                <option value="NEW">අයිතිය ප්‍රතිලාභියා සතුයි</option>
                <option value="REPAIR">නිවස කුලියට දී ඇත</option>
                <option value="RELOCATION">ඉඩම/ නිවස විකුණා ඇත</option>
              </select>
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
                {errors.infrastructure_issues && <p className="text-xs text-rose-500 font-medium mt-2">{errors.infrastructure_issues[0]}</p>}
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
              <select className={selectCls}>
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
            </div>
            <div>
              <FieldLabel required>වත්මන් තත්ත්වය</FieldLabel>
              <select className={selectCls}>
                <option value="">-- තත්ත්වය තෝරන්න --</option>
                <option value="NOT_STARTED">ඉදිකිරීම් වර්තමානයේ ක්‍රියාත්මක වේ</option>
                <option value="FOUNDATION">ඉදිකිරීම් නවතා ඇත</option>
              </select>
            </div>
            <div>
              <FieldLabel>ඉදිකර ඇති කොටසේ දළ වටිනාකම</FieldLabel>
              <input type="number" placeholder="රු. 0.00" className={inputCls} />
            </div>
            
            <div className="md:col-span-3">
              <FieldLabel>වෙනත් සටහන්</FieldLabel>
              <textarea rows="3" placeholder="ඉදිකිරීම් ප්‍රගතිය, ප්‍රශ්න, ආදිය ඇතුළත් කරන්න..." className={inputCls} />
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
            className="px-8 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold shadow-lg shadow-indigo-600/20 hover:shadow-indigo-500/30 transition-all flex items-center gap-2"
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
