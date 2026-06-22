import React, { useState, useRef } from 'react';
import XLSX from 'xlsx-js-style';
import api from '../../api/axios';

const FieldLabel = ({ children, required }) => (
  <label className="block text-sm font-bold uppercase tracking-wider text-slate-500 mb-2">
    {children} {required && <span className="text-rose-400 normal-case tracking-normal font-semibold">*</span>}
  </label>
);

const BulkOfficerUpload = ({ onSuccess }) => {
  const fileInputRef = useRef(null);

  // States
  const [activeTab, setActiveTab] = useState('GOVERNMENT'); // 'GOVERNMENT' or 'EXTERNAL'
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState('');
  const [parsedRows, setParsedRows] = useState([]);
  const [rawAoa, setRawAoa] = useState([]); // Stores raw parsed cells for error sheet reconstruction
  const [isParsing, setIsParsing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [validationErrors, setValidationErrors] = useState(null);

  const getHeadersAndSample = () => {
    if (activeTab === 'GOVERNMENT') {
      const headers1 = [
        'නිලධාරී තොරතුරු', '', '', // A-C (merged 3 columns)
        'අමතර විස්තර' // D
      ];
      const headers2 = [
        'නම (Full Name)', 'දුරකථන අංකය (Contact Number)', 'තනතුර (Position)',
        'සටහන් (Notes)'
      ];
      const sampleRow = [
        'කමල් ගුණරත්න', '0777123456', 'Technical Officer (TO)',
        'ගම්මාන සංවර්ධන ව්‍යාපෘතිය භාරව ක්‍රියා කරයි.'
      ];
      const merges = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 2 } },
        { s: { r: 0, c: 3 }, e: { r: 0, c: 3 } }
      ];
      const sections = [
        { start: 0, end: 2, color: '4F46E5', subColor: 'EEF2F6', textDark: '1E293B', textLight: 'FFFFFF' }, // Indigo
        { start: 3, end: 3, color: '475569', subColor: 'F1F5F9', textDark: '0F172A', textLight: 'FFFFFF' }  // Slate
      ];
      return { headers1, headers2, sampleRow, merges, sections };
    } else {
      const headers1 = [
        'බාහිර පුද්ගල තොරතුරු', '', '', // A-C (merged 3 columns)
        'අමතර විස්තර' // D
      ];
      const headers2 = [
        'නම (Full Name)', 'දුරකථන අංකය (Contact Number)', 'ගෙවීම් මුදල (Payment)',
        'සටහන් (Notes)'
      ];
      const sampleRow = [
        'සුනිල් පෙරේරා', '0712345678', '75000',
        'බාහිර උපදේශන කටයුතු වෙනුවෙන් ගෙවීම්.'
      ];
      const merges = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 2 } },
        { s: { r: 0, c: 3 }, e: { r: 0, c: 3 } }
      ];
      const sections = [
        { start: 0, end: 2, color: '059669', subColor: 'D1FAE5', textDark: '064E3B', textLight: 'FFFFFF' }, // Emerald
        { start: 3, end: 3, color: '475569', subColor: 'F1F5F9', textDark: '0F172A', textLight: 'FFFFFF' }  // Slate
      ];
      return { headers1, headers2, sampleRow, merges, sections };
    }
  };

  const getColLetter = (colIdx) => {
    let temp = colIdx;
    let letter = '';
    while (temp >= 0) {
      letter = String.fromCharCode((temp % 26) + 65) + letter;
      temp = Math.floor(temp / 26) - 1;
    }
    return letter;
  };

  const handleDownloadTemplate = () => {
    const { headers1, headers2, sampleRow, merges, sections } = getHeadersAndSample();
    const data = [headers1, headers2, sampleRow];
    const ws = XLSX.utils.aoa_to_sheet(data);

    ws['!merges'] = merges;
    ws['!rows'] = [{ hpt: 30 }, { hpt: 26 }];

    sections.forEach((sec) => {
      for (let c = sec.start; c <= sec.end; c++) {
        const cellRef = `${getColLetter(c)}1`;
        if (ws[cellRef]) {
          ws[cellRef].s = {
            fill: { patternType: 'solid', fgColor: { rgb: sec.color } },
            font: { name: 'Calibri', sz: 11, bold: true, color: { rgb: sec.textLight } },
            alignment: { vertical: 'center', horizontal: 'center', wrapText: true },
            border: {
              top: { style: 'thin', color: { rgb: 'E2E8F0' } },
              bottom: { style: 'thin', color: { rgb: 'E2E8F0' } },
              left: { style: 'thin', color: { rgb: 'E2E8F0' } },
              right: { style: 'thin', color: { rgb: 'E2E8F0' } }
            }
          };
        }
      }

      for (let c = sec.start; c <= sec.end; c++) {
        const cellRef = `${getColLetter(c)}2`;
        if (ws[cellRef]) {
          ws[cellRef].s = {
            fill: { patternType: 'solid', fgColor: { rgb: sec.subColor } },
            font: { name: 'Calibri', sz: 9.5, bold: true, color: { rgb: sec.textDark } },
            alignment: { vertical: 'center', horizontal: 'center', wrapText: true },
            border: {
              top: { style: 'thin', color: { rgb: 'E2E8F0' } },
              bottom: { style: 'medium', color: { rgb: '475569' } },
              left: { style: 'thin', color: { rgb: 'E2E8F0' } },
              right: { style: 'thin', color: { rgb: 'E2E8F0' } }
            }
          };
        }
      }
    });

    const colWidths = headers2.map((h2, i) => {
      const h1 = headers1[i] || '';
      const sampleVal = String(sampleRow[i] || '');
      const maxLen = Math.max(h1.length, h2.length, sampleVal.length);
      return { wch: Math.min(Math.max(maxLen + 4, 15), 45) };
    });
    ws['!cols'] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, activeTab === 'GOVERNMENT' ? 'Gov Officers' : 'External People');
    XLSX.writeFile(wb, `${activeTab.toLowerCase()}_bulk_template.xlsx`);
  };

  const processFile = (file) => {
    setErrorMsg('');
    setSuccessMsg('');
    setValidationErrors(null);
    setFileName(file.name);
    setIsParsing(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const parsedAoa = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

        if (parsedAoa.length <= 2) {
          setErrorMsg('තෝරාගත් Excel ගොනුවේ දත්ත ඇතුලත් කර නොමැත. කරුණාකර Row 3 සිට දත්ත ඇතුලත් කරන්න.');
          setIsParsing(false);
          return;
        }

        setRawAoa(parsedAoa);
        const dataRows = parsedAoa.slice(2);

        const mapped = dataRows.map((row, idx) => {
          if (!row || row.length === 0 || row[0] === '') return null;

          if (activeTab === 'GOVERNMENT') {
            return {
              originalRowIndex: idx + 3,
              type: 'GOVERNMENT',
              name: row[0] ? String(row[0]).trim() : '',
              contact_number: row[1] ? String(row[1]).trim() : '',
              position: row[2] ? String(row[2]).trim() : '',
              notes: row[3] ? String(row[3]).trim() : ''
            };
          } else {
            return {
              originalRowIndex: idx + 3,
              type: 'EXTERNAL',
              name: row[0] ? String(row[0]).trim() : '',
              contact_number: row[1] ? String(row[1]).trim() : '',
              payment: row[2] !== '' && !isNaN(Number(row[2])) ? Number(row[2]) : null,
              notes: row[3] ? String(row[3]).trim() : ''
            };
          }
        }).filter(r => r !== null && r.name !== '');

        if (mapped.length === 0) {
          setErrorMsg('Excel ගොනුවේ වලංගු දත්ත කිසිවක් හඳුනාගත නොහැකි විය.');
          setIsParsing(false);
          return;
        }

        setParsedRows(mapped);
      } catch (err) {
        console.error('File parsing failed:', err);
        setErrorMsg('ගොනුව කියවීමට නොහැක. කරුණාකර වලංගු Excel (.xlsx) ගොනුවක් ඇතුලත් කරන්න.');
      } finally {
        setIsParsing(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const downloadErrorExcel = (details) => {
    if (!rawAoa || rawAoa.length === 0) return;
    const { headers1, headers2, merges, sections } = getHeadersAndSample();

    const excelRowDetails = {};
    parsedRows.forEach((row, pIdx) => {
      const payloadKey = String(pIdx + 1);
      if (details[payloadKey]) {
        excelRowDetails[row.originalRowIndex || (pIdx + 3)] = details[payloadKey];
      }
    });

    const errorRows = [];
    const newHeaders1 = [...headers1, 'දෝෂ විස්තරය'];
    const newHeaders2 = [...headers2, 'දෝෂ විස්තරය (Error Message)'];
    errorRows.push(newHeaders1);
    errorRows.push(newHeaders2);

    const dataWidth = headers2.length;

    rawAoa.forEach((row, idx) => {
      if (idx < 2) return;
      const displayRowIndex = idx + 1;
      if (excelRowDetails[displayRowIndex]) {
        const rowErrors = excelRowDetails[displayRowIndex];
        const errorMessages = Object.keys(rowErrors)
          .map(field => `${field.replace('_', ' ').toUpperCase()}: ${rowErrors[field].join('; ')}`)
          .join(' | ');

        const errorRow = [...row];
        while (errorRow.length < dataWidth) {
          errorRow.push('');
        }
        errorRow[dataWidth] = errorMessages;
        errorRows.push(errorRow);
      }
    });

    const ws = XLSX.utils.aoa_to_sheet(errorRows);
    ws['!merges'] = merges;
    ws['!rows'] = [{ hpt: 30 }, { hpt: 26 }];

    const updatedSections = [
      ...sections,
      { start: dataWidth, end: dataWidth, color: 'DC2626', subColor: 'FEE2E2', textDark: '991B1B', textLight: 'FFFFFF' }
    ];

    updatedSections.forEach((sec) => {
      for (let c = sec.start; c <= sec.end; c++) {
        const cellRef = `${getColLetter(c)}1`;
        if (ws[cellRef]) {
          ws[cellRef].s = {
            fill: { patternType: 'solid', fgColor: { rgb: sec.color } },
            font: { name: 'Calibri', sz: 11, bold: true, color: { rgb: sec.textLight } },
            alignment: { vertical: 'center', horizontal: 'center', wrapText: true },
            border: {
              top: { style: 'thin', color: { rgb: 'E2E8F0' } },
              bottom: { style: 'thin', color: { rgb: 'E2E8F0' } },
              left: { style: 'thin', color: { rgb: 'E2E8F0' } },
              right: { style: 'thin', color: { rgb: 'E2E8F0' } }
            }
          };
        }
      }

      for (let c = sec.start; c <= sec.end; c++) {
        const cellRef = `${getColLetter(c)}2`;
        if (ws[cellRef]) {
          ws[cellRef].s = {
            fill: { patternType: 'solid', fgColor: { rgb: sec.subColor } },
            font: { name: 'Calibri', sz: 9.5, bold: true, color: { rgb: sec.textDark } },
            alignment: { vertical: 'center', horizontal: 'center', wrapText: true },
            border: {
              top: { style: 'thin', color: { rgb: 'E2E8F0' } },
              bottom: { style: 'medium', color: { rgb: 'DC2626' } },
              left: { style: 'thin', color: { rgb: 'E2E8F0' } },
              right: { style: 'thin', color: { rgb: 'E2E8F0' } }
            }
          };
        }
      }
    });

    for (let r = 2; r < errorRows.length; r++) {
      const cellRef = `${getColLetter(dataWidth)}${r + 1}`;
      if (ws[cellRef]) {
        ws[cellRef].s = {
          font: { name: 'Calibri', sz: 9.5, color: { rgb: 'DC2626' }, bold: true },
          alignment: { vertical: 'center', horizontal: 'left', wrapText: true }
        };
      }
    }

    const colWidths = newHeaders2.map((h2, i) => {
      const h1 = newHeaders1[i] || '';
      const maxLen = Math.max(h1.length, h2.length, 12);
      if (i === dataWidth) return { wch: 65 };
      return { wch: Math.min(Math.max(maxLen + 4, 15), 45) };
    });
    ws['!cols'] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Validation Errors');
    XLSX.writeFile(wb, 'officer_upload_errors.xlsx');
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = () => {
    setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      processFile(file);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      processFile(file);
    }
  };

  const handleSubmit = async () => {
    if (parsedRows.length === 0) return;
    setSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');
    setValidationErrors(null);

    try {
      const payload = parsedRows.map(({ originalRowIndex, ...rest }) => rest);
      const response = await api.post('/officers/bulk', payload);
      setSuccessMsg(response.data.message || 'නිලධාරී තොරතුරු සාර්ථකව පද්ධතියට එක් කරන ලදී!');
      setTimeout(() => {
        setParsedRows([]);
        setRawAoa([]);
        setFileName('');
        if (onSuccess) onSuccess();
      }, 2000);
    } catch (err) {
      if (err.response?.status === 400 && err.response?.data?.details) {
        setValidationErrors(err.response.data.details);
        setErrorMsg('ඇතුලත් කිරීමට උත්සාහ කළ දත්තවල දෝෂ පවතී. කරුණාකර දෝෂ නිවැරදි කර නැවත උත්සාහ කරන්න.');
      } else {
        console.error('Officer bulk upload error:', err);
        setErrorMsg(err.response?.data?.error || 'තොග වශයෙන් ඇතුලත් කිරීම අසාර්ථක විය. පද්ධති දෝෂයකි.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Category Toggle Tabs */}
      <div className="flex items-center gap-3 bg-slate-100 p-1.5 rounded-xl max-w-sm font-sans">
        <button
          type="button"
          onClick={() => {
            setActiveTab('GOVERNMENT');
            setParsedRows([]);
            setFileName('');
            setErrorMsg('');
            setSuccessMsg('');
            setValidationErrors(null);
          }}
          className={`flex-1 py-2.5 px-4 text-xs font-bold rounded-lg transition-all ${
            activeTab === 'GOVERNMENT' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          රජයේ නිලධාරීන් (Gov TOs)
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab('EXTERNAL');
            setParsedRows([]);
            setFileName('');
            setErrorMsg('');
            setSuccessMsg('');
            setValidationErrors(null);
          }}
          className={`flex-1 py-2.5 px-4 text-xs font-bold rounded-lg transition-all ${
            activeTab === 'EXTERNAL' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          බාහිර පුද්ගලයින් (External)
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans">
        
        {/* Step 1 Card: Template Download */}
        <div className="lg:col-span-1 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-slate-800">1. Template එක බාගත කරන්න</h3>
            <p className="text-sm text-slate-500 leading-relaxed font-sinhala">
              තොග වශයෙන් {activeTab === 'GOVERNMENT' ? 'රජයේ නිලධාරීන්' : 'බාහිර පුද්ගලයින්'} ලියාපදිංචි කිරීමට අදාළ Excel ගොනු ආකෘතිය (Template) බාගත කරගන්න.
            </p>
          </div>
          <button
            onClick={handleDownloadTemplate}
            className="w-full mt-6 py-3 px-4 rounded-xl border border-indigo-200 text-indigo-600 bg-indigo-50/30 hover:bg-indigo-50 font-semibold text-sm transition-all flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Download {activeTab === 'GOVERNMENT' ? 'Gov Officers' : 'External'} Template
          </button>
        </div>

        {/* Step 2 Guidelines */}
        <div className="lg:col-span-2 bg-slate-900 rounded-2xl p-6 text-slate-100 flex flex-col justify-between shadow-md border border-slate-800">
          <div className="space-y-4">
            <h3 className="text-sm font-bold tracking-widest text-indigo-400 uppercase">Guidelines & Restrictions</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans">
              <div className="space-y-2 bg-slate-850 p-4 rounded-xl border border-slate-800/80">
                <span className="font-semibold text-indigo-400 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" /> Government Officers
                </span>
                <p className="text-slate-400 leading-relaxed font-sinhala">
                  රජයේ නිලධාරීන් (TOs) සඳහා <code className="bg-slate-800 px-1 py-0.5 rounded text-indigo-300 font-bold">නම</code>, <code className="bg-slate-800 px-1 py-0.5 rounded text-indigo-300 font-bold">දුරකථන අංකය</code> සහ <code className="bg-slate-800 px-1 py-0.5 rounded text-indigo-300 font-bold">තනතුර (Position)</code> ඇතුළත් කිරීම අනිවාර්ය වේ.
                </p>
              </div>
              <div className="space-y-2 bg-slate-850 p-4 rounded-xl border border-slate-800/80 font-sans">
                <span className="font-semibold text-emerald-400 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> External Consultants
                </span>
                <p className="text-slate-400 leading-relaxed font-sinhala">
                  බාහිර උපදේශකයින් / පුද්ගලයින් සඳහා <code className="bg-slate-800 px-1 py-0.5 rounded text-emerald-300 font-bold">නම</code>, <code className="bg-slate-800 px-1 py-0.5 rounded text-emerald-300 font-bold">දුරකථන අංකය</code> සහ <code className="bg-slate-800 px-1 py-0.5 rounded text-emerald-300 font-bold">ගෙවීම් මුදල (Payment)</code> ඇතුළත් කිරීම අනිවාර්ය වේ.
                </p>
              </div>
            </div>
          </div>
          <div className="text-[10px] text-slate-500 font-semibold mt-4">
            * Note: Officer records are kept standalone and simplified to allow easy tracking.
          </div>
        </div>
      </div>

      {/* Upload Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden font-sans">
        <div className="p-8 border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-xl font-bold text-slate-800">Excel ගොනුව ඇතුලත් කරන්න</h2>
        </div>

        <div className="p-8">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current.click()}
            className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all ${
              dragActive
                ? 'border-indigo-500 bg-indigo-50/40 shadow-inner'
                : 'border-slate-300 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-400'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".xlsx,.xls,.csv"
              className="hidden"
            />
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-sm">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <div>
                <p className="font-bold text-slate-700">Drag & Drop excel file here</p>
                <p className="text-xs text-slate-400 mt-1">Or click to browse from files (.xlsx, .xls, .csv)</p>
              </div>
            </div>
          </div>

          {isParsing && (
            <div className="mt-6 flex items-center gap-3 p-4 bg-indigo-50/30 rounded-xl border border-indigo-100/50 text-indigo-600 font-semibold text-sm">
              <div className="w-5 h-5 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
              <span>ගොනුවේ අඩංගු දත්ත කියවමින් පවතී...</span>
            </div>
          )}

          {fileName && !isParsing && (
            <div className="mt-6">
              {/* SUCCESS STATE */}
              {successMsg && (
                <div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-6 flex items-start gap-4 shadow-sm">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 flex-shrink-0">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-bold text-emerald-800">Import Successful (සාර්ථකයි!)</h3>
                    <p className="text-sm text-emerald-600 mt-1">{successMsg}</p>
                    <p className="text-xs text-slate-400 mt-2 font-medium">Updating officers ledger...</p>
                  </div>
                </div>
              )}

              {/* ERROR STATE */}
              {errorMsg && (
                <div className="rounded-2xl bg-rose-50 border border-rose-100 p-6 shadow-sm space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 flex-shrink-0">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-rose-800">Registration Denied (ඇතුලත් කිරීම ප්‍රතික්ෂේප විය)</h3>
                      <p className="text-sm text-rose-700 mt-1 font-medium leading-relaxed">{errorMsg}</p>
                      <p className="text-xs text-slate-500 mt-1.5 leading-relaxed font-sans">
                        Uploaded File: <span className="font-semibold text-slate-700">{fileName}</span>
                      </p>
                      {validationErrors && (
                        <p className="text-xs text-rose-600 font-semibold mt-2 font-sinhala">
                          ඇතුලත් කිරීමට උත්සාහ කළ ගොනුවේ දෝෂ පවතී. දෝෂ පිළිබඳ විස්තර බැලීමට කරුණාකර පහත බොත්තමෙන් නිවැරදි කිරීම් සහිත Excel ගොනුව බාගත කරගන්න.
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    {validationErrors && (
                      <button
                        onClick={() => downloadErrorExcel(validationErrors)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-sm transition-colors uppercase tracking-wider font-sans"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Download Error Sheet
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setParsedRows([]);
                        setRawAoa([]);
                        setFileName('');
                        setErrorMsg('');
                        setSuccessMsg('');
                        setValidationErrors(null);
                      }}
                      className="px-5 py-2.5 border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 font-bold text-xs rounded-xl transition-colors uppercase tracking-wider font-sans"
                    >
                      Clear File / Try Again
                    </button>
                  </div>
                </div>
              )}

              {submitting && (
                <div className="rounded-2xl bg-indigo-50 border border-indigo-100 p-6 flex items-start gap-4 shadow-sm animate-pulse">
                  <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 flex-shrink-0">
                    <div className="w-5 h-5 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
                  </div>
                  <div>
                    <h3 className="font-bold text-indigo-800">Submitting Records (දත්ත ඇතුලත් කරමින්...)</h3>
                    <p className="text-sm text-indigo-600 mt-1 font-medium font-sinhala">කරුණාකර මෙම පිටුව වසා දැමීමෙන් හෝ refresh කිරීමෙන් වලකින්න.</p>
                  </div>
                </div>
              )}

              {!successMsg && !errorMsg && !submitting && (
                <div className="rounded-2xl bg-slate-50 border border-slate-200 p-6 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm font-sans">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 flex-shrink-0">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800">Excel file selected successfully</h4>
                      <p className="text-xs text-slate-400 mt-0.5 font-medium leading-relaxed font-sans">
                        File Name: <span className="text-slate-650 font-bold">{fileName}</span>
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 w-full md:w-auto flex-shrink-0 font-sans">
                    <button
                      type="button"
                      onClick={() => {
                        setParsedRows([]);
                        setRawAoa([]);
                        setFileName('');
                        setErrorMsg('');
                        setSuccessMsg('');
                        setValidationErrors(null);
                      }}
                      className="flex-1 md:flex-initial px-5 py-3 rounded-xl border border-slate-250 text-xs font-bold text-slate-600 bg-white hover:bg-slate-50 transition-colors uppercase tracking-wider"
                    >
                      Clear File
                    </button>
                    <button
                      onClick={handleSubmit}
                      className="flex-1 md:flex-initial px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white shadow-md shadow-indigo-500/10 transition-all flex items-center justify-center gap-2 uppercase tracking-wider"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      Submit
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

    </div>
  );
};

export default BulkOfficerUpload;
