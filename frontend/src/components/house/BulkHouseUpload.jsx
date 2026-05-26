import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import XLSX from 'xlsx-js-style';
import api from '../../api/axios';

const FieldLabel = ({ children, required }) => (
  <label className="block text-sm font-bold uppercase tracking-wider text-slate-500 mb-2">
    {children} {required && <span className="text-rose-400 normal-case tracking-normal font-semibold">*</span>}
  </label>
);

const BulkHouseUpload = ({ villageId, onSuccess }) => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  // States
  const [currentVillage, setCurrentVillage] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState('');
  const [parsedRows, setParsedRows] = useState([]);
  const [rawAoa, setRawAoa] = useState([]); // Stores raw parsed cells for error sheet reconstruction
  const [isParsing, setIsParsing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [validationErrors, setValidationErrors] = useState(null);

  // Fetch specific village details if villageId is provided to auto-populate location columns
  useEffect(() => {
    if (villageId) {
      const fetchCurrentVillage = async () => {
        try {
          const res = await api.get(`/villages/${villageId}`);
          setCurrentVillage(res.data || null);
        } catch (err) {
          console.error('Failed to load current village details:', err);
        }
      };
      fetchCurrentVillage();
    }
  }, [villageId]);

  // 1. Dual-Header Specifications (25 Columns)
  const headers1 = [
    'මූලික තොරතුරු', '', '', '', '', '', '', '', '', '', // Col A to J (merged - 10 columns)
    'ඉදිකිරීම් ප්‍රගතිය', '', '', '', '', '', '', '', // Col K to R (merged - 8 stages)
    'හිමිකම් සහ පදිංචිය', '', '', // Col S to U (merged - 3 fields)
    'යටිතල පහසුකම්', '', '', // Col V to X (merged - 3 fields)
    'අමතර විස්තර' // Col Y (1 field)
  ];

  const headers2 = [
    'පළාත (Province)',
    'දිස්ත්‍රික්කය (District)',
    'ප්‍රාදේශීය ලේකම් කොට්ඨාශය (DS Division)',
    'ගම්මානයේ නම (Village Name)',
    'මූලික පිඹුරේ හෝ කට්ටි සැලැස්මේ අංකය',
    'හිමිකරුගේ නම',
    'ජාතික හැඳුනුම්පත් අංකය',
    'දුරකථන අංකය',
    'ස්ථිර නිවාස ලිපිනය',
    'ඉඩම් ප්‍රමාණය (පර්චස්)',
    'ආරම්භ කර නොමැත',
    'අඩිතාලම දමා ඇත',
    'ජනෙල් මට්ටමට නිමකර ඇත',
    'ලින්ටල් මට්ටමට නිමකර ඇත',
    'වහල මට්ටමට නිමකර ඇත',
    'වහලය නිමකර ඇත',
    'කපරාරු නිමකර ඇත',
    'නිවස සම්පූර්ණයෙන් ඉදිකර ඇත',
    'ඉඩම විකුණා ඇත (YES/NO)',
    'නිවස විකුණා ඇත (YES/NO)',
    'පදිංචි ස්වභාවය',
    'ජලය (YES/NO)',
    'විදුලිය (YES/NO)',
    'ප්‍රවේශ මාර්ග (YES/NO)',
    'සටහන්'
  ];

  const sampleRow = [
    currentVillage?.province || 'Central',
    currentVillage?.district_name || 'Kandy',
    currentVillage?.division_name || 'Kundasale',
    currentVillage?.name || 'Sampathgama',
    'HOU-001', 'දිලාන් පෙරේරා', '199012345678', '0771234567', 'නො. 45, ගාලු පාර, කොළඹ 03', '15',
    'NO', 'NO', 'NO', 'NO', 'NO', 'NO', 'NO', 'YES',
    'NO', 'NO', 'Borrower Living',
    'YES', 'YES', 'NO',
    'නව නිවාස ඉදිකිරීම් කටයුතු සතුටුදායක මට්ටමක පවතී.'
  ];

  // Helper: check if cell value counts as checked
  const isTrueVal = (val) => {
    if (val === undefined || val === null || val === '') return false;
    const s = String(val).toLowerCase().trim();
    return s === 'true' || s === 'yes' || s === 'ඔව්' || s === '1' || s === 'ආධාර' || s === 'සත්‍ය' || s === 'විවෘතයි';
  };

  // Helper: Map index to A-Z letter
  const getColLetter = (colIdx) => {
    let temp = colIdx;
    let letter = '';
    while (temp >= 0) {
      letter = String.fromCharCode((temp % 26) + 65) + letter;
      temp = Math.floor(temp / 26) - 1;
    }
    return letter;
  };

  // 2. Generate and download template .xlsx file with cell styling
  const handleDownloadTemplate = () => {
    const data = [headers1, headers2, sampleRow];
    const ws = XLSX.utils.aoa_to_sheet(data);

    // Set Merges
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 9 } },   // මූලික තොරතුරු (A1:J1)
      { s: { r: 0, c: 10 }, e: { r: 0, c: 17 } },  // ඉදිකිරීම් ප්‍රගතිය (K1:R1)
      { s: { r: 0, c: 18 }, e: { r: 0, c: 20 } }, // හිමිකම් සහ පදිංචිය (S1:U1)
      { s: { r: 0, c: 21 }, e: { r: 0, c: 23 } }, // යටිතල පහසුකම් (V1:X1)
      { s: { r: 0, c: 24 }, e: { r: 0, c: 24 } }  // අමතර විස්තර (Y1:Y1)
    ];

    ws['!rows'] = [
      { hpt: 30 }, // Merged Row 1
      { hpt: 26 }  // Subtitles Row 2
    ];

    // Style Groups with color-coded palettes
    const sections = [
      { start: 0, end: 9, color: '4F46E5', subColor: 'EEF2F6', textDark: '1E293B', textLight: 'FFFFFF' }, // Indigo
      { start: 10, end: 17, color: 'D97706', subColor: 'FEF3C7', textDark: '78350F', textLight: 'FFFFFF' }, // Amber
      { start: 18, end: 20, color: '059669', subColor: 'D1FAE5', textDark: '064E3B', textLight: 'FFFFFF' }, // Emerald
      { start: 21, end: 23, color: '7C3AED', subColor: 'EDE9FE', textDark: '4C1D95', textLight: 'FFFFFF' }, // Violet
      { start: 24, end: 24, color: '475569', subColor: 'F1F5F9', textDark: '0F172A', textLight: 'FFFFFF' }  // Slate
    ];

    sections.forEach((sec) => {
      // Style merged top row headers
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

      // Style subtitles on Row 2
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

    // Auto-adjust column sizes dynamically
    const colWidths = headers2.map((h2, i) => {
      const h1 = headers1[i] || '';
      const sampleVal = String(sampleRow[i] || '');
      
      const maxLen = Math.max(h1.length, h2.length, sampleVal.length);
      return { wch: Math.min(Math.max(maxLen + 4, 15), 45) };
    });
    ws['!cols'] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'House Template');
    XLSX.writeFile(wb, 'House_Bulk_Registration_Template.xlsx');
  };

  // 3. Process the file data from Row 3 onwards
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
        
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        const parsedAoa = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
        
        if (parsedAoa.length <= 2) {
          setErrorMsg('තෝරාගත් Excel ගොනුවේ දත්ත ඇතුලත් කර නොමැත. කරුණාකර Row 3 සිට දත්ත ඇතුලත් කරන්න.');
          setIsParsing(false);
          return;
        }

        setRawAoa(parsedAoa);

        const dataRows = parsedAoa.slice(2);

        const mappedRows = dataRows.map((row, idx) => {
          if (!row || row.length === 0 || (row[4] === '' && row[5] === '')) return null;

          // 3.1 Construction Stage Map
          let constructionStage = 'No Foundation';
          if (isTrueVal(row[10])) constructionStage = 'No Foundation';
          else if (isTrueVal(row[11])) constructionStage = 'Foundation Done';
          else if (isTrueVal(row[12])) constructionStage = 'Windows Done';
          else if (isTrueVal(row[13])) constructionStage = 'Lintel Done';
          else if (isTrueVal(row[14])) constructionStage = 'Reached Roof Level';
          else if (isTrueVal(row[15])) constructionStage = 'Roof Done';
          else if (isTrueVal(row[16])) constructionStage = 'Plastering Done';
          else if (isTrueVal(row[17])) constructionStage = 'House Fully Developed';

          // 3.2 Occupancy Status resolution
          let occupancyStatus = 'NOT_APPLICABLE';
          const occText = row[20] ? String(row[20]).toLowerCase().trim() : '';
          if (occText.includes('living') || occText.includes('borrower') || occText.includes('පදිංචි')) {
            occupancyStatus = 'BORROWER_LIVING';
          } else if (occText.includes('sold') || occText.includes('විකුණා')) {
            occupancyStatus = 'SOLD';
          } else if (occText.includes('abandon') || occText.includes('අත්හැර')) {
            occupancyStatus = 'ABANDONED';
          }

          // 3.3 Infrastructure Issues Boolean
          const hasInfra = (isTrueVal(row[21]) || isTrueVal(row[22]) || isTrueVal(row[23])) ? 1 : 0;

          // Notes with Address combined
          const address = row[8] ? String(row[8]).trim() : '';
          const extraNotes = row[24] ? String(row[24]).trim() : '';
          let finalNotes = '';
          if (address) finalNotes += `ස්ථිර ලිපිනය: ${address}`;
          if (extraNotes) finalNotes += `\nසටහන්: ${extraNotes}`;

          return {
            originalRowIndex: idx + 3,
            province: row[0] ? String(row[0]).trim() : '',
            district: row[1] ? String(row[1]).trim() : '',
            division: row[2] ? String(row[2]).trim() : '',
            village_name: row[3] ? String(row[3]).trim() : '',
            house_number: row[4] ? String(row[4]).trim() : '',
            owner_name: row[5] ? String(row[5]).trim() : '',
            owner_nic: row[6] ? String(row[6]).trim() : '',
            owner_contact: row[7] ? String(row[7]).trim() : '',
            household_members: 1, // Default to 1 member
            land_area_perches: row[9] !== '' && !isNaN(Number(row[9])) ? Number(row[9]) : null,
            construction_stage: constructionStage,
            is_land_sold: isTrueVal(row[18]) ? 1 : 0,
            is_house_sold: isTrueVal(row[19]) ? 1 : 0,
            occupancy_status: occupancyStatus,
            has_infrastructure_issues: hasInfra,
            notes: finalNotes
          };
        }).filter(r => r !== null && r.house_number !== '');

        if (mappedRows.length === 0) {
          setErrorMsg('Excel ගොනුවේ වලංගු නිවාස දත්ත කිසිවක් හඳුනාගත නොහැකි විය.');
          setIsParsing(false);
          return;
        }

        setParsedRows(mappedRows);
      } catch (err) {
        console.error('Spreadsheet parsing failed:', err);
        setErrorMsg('ගොනුව කියවීමට නොහැක. කරුණාකර වලංගු Excel (.xlsx) ගොනුවක් ඇතුලත් කරන්න.');
      } finally {
        setIsParsing(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // 4. Generate Styled Error Excel sheet containing only failed rows
  const downloadErrorExcel = (details) => {
    if (!rawAoa || rawAoa.length === 0) return;

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

    rawAoa.forEach((row, idx) => {
      if (idx < 2) return;
      
      const displayRowIndex = idx + 1;
      if (excelRowDetails[displayRowIndex]) {
        const rowErrors = excelRowDetails[displayRowIndex];
        const errorMessages = Object.keys(rowErrors)
          .map(field => `${field.replace('_', ' ').toUpperCase()}: ${rowErrors[field].join('; ')}`)
          .join(' | ');
          
        const errorRow = [...row];
        while (errorRow.length < 25) {
          errorRow.push('');
        }
        errorRow[25] = errorMessages;
        errorRows.push(errorRow);
      }
    });

    const ws = XLSX.utils.aoa_to_sheet(errorRows);

    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 9 } },
      { s: { r: 0, c: 10 }, e: { r: 0, c: 17 } },
      { s: { r: 0, c: 18 }, e: { r: 0, c: 20 } },
      { s: { r: 0, c: 21 }, e: { r: 0, c: 23 } },
      { s: { r: 0, c: 24 }, e: { r: 0, c: 24 } }
    ];

    ws['!rows'] = [
      { hpt: 30 },
      { hpt: 26 }
    ];

    const sections = [
      { start: 0, end: 9, color: '4F46E5', subColor: 'EEF2F6', textDark: '1E293B', textLight: 'FFFFFF' },
      { start: 10, end: 17, color: 'D97706', subColor: 'FEF3C7', textDark: '78350F', textLight: 'FFFFFF' },
      { start: 18, end: 20, color: '059669', subColor: 'D1FAE5', textDark: '064E3B', textLight: 'FFFFFF' },
      { start: 21, end: 23, color: '7C3AED', subColor: 'EDE9FE', textDark: '4C1D95', textLight: 'FFFFFF' },
      { start: 24, end: 24, color: '475569', subColor: 'F1F5F9', textDark: '0F172A', textLight: 'FFFFFF' },
      { start: 25, end: 25, color: 'DC2626', subColor: 'FEE2E2', textDark: '991B1B', textLight: 'FFFFFF' }
    ];

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
              bottom: { style: 'medium', color: { rgb: 'DC2626' } },
              left: { style: 'thin', color: { rgb: 'E2E8F0' } },
              right: { style: 'thin', color: { rgb: 'E2E8F0' } }
            }
          };
        }
      }
    });

    for (let r = 2; r < errorRows.length; r++) {
      const cellRef = `${getColLetter(25)}${r + 1}`;
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
      if (i === 25) return { wch: 65 };
      return { wch: Math.min(Math.max(maxLen + 4, 15), 45) };
    });
    ws['!cols'] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Validation Errors');
    XLSX.writeFile(wb, 'House_Registration_Errors.xlsx');
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

  // Submit Parsed Array to Transactional API
  const handleSubmit = async () => {
    if (parsedRows.length === 0) return;

    setSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');
    setValidationErrors(null);

    try {
      const payload = parsedRows.map(({ originalRowIndex, ...rest }) => rest);
      const response = await api.post('/houses/bulk', payload);
      setSuccessMsg(response.data.message || `${parsedRows.length} Houses imported successfully!`);
      
      if (onSuccess) {
        setTimeout(() => {
          onSuccess();
        }, 2000);
      } else {
        setTimeout(() => {
          setParsedRows([]);
          setRawAoa([]);
          setFileName('');
          if (villageId) {
            navigate(`/villages/${villageId}`);
          } else {
            navigate('/villages');
          }
        }, 2000);
      }

    } catch (err) {
      if (err.response?.status === 400 && err.response?.data?.details) {
        console.log('Bulk submission input validation failed on server. Displaying error banner.');
        const details = err.response.data.details;
        setValidationErrors(details);
        setErrorMsg('ඇතුලත් කිරීමට උත්සාහ කළ දත්තවල දෝෂ පවතී. කරුණාකර දෝෂ නිවැරදි කර නැවත උත්සාහ කරන්න.');
      } else {
        console.error('Bulk submission critical failure:', err);
        setErrorMsg(err.response?.data?.error || 'තොග වශයෙන් ඇතුලත් කිරීම අසාර්ථක විය. පද්ධති දෝෂයකි.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 font-sans">
      
      {/* Grid: Instructions & Template Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Step 1 Card: Template Download */}
        <div className="lg:col-span-1 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-slate-800">1. Excel Template එක බාගත කරන්න</h3>
            <p className="text-sm text-slate-500 leading-relaxed font-sinhala">
              තොග වශයෙන් නිවාස ලියාපදිංචි කිරීමට පෙර පහත ඇති ද්විත්ව පේළි Excel ආකෘතිය (Template) බාගත කරගන්න.
            </p>
          </div>
          <button
            onClick={handleDownloadTemplate}
            className="w-full mt-6 py-3 px-4 rounded-xl border border-indigo-200 text-indigo-600 bg-indigo-50/30 hover:bg-indigo-50 font-semibold text-sm transition-all flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Download Styled Template
          </button>
        </div>

        {/* Guidelines Card */}
        <div className="lg:col-span-2 bg-slate-900 rounded-2xl p-6 text-slate-100 flex flex-col justify-between shadow-md border border-slate-800">
          <div className="space-y-4">
            <h3 className="text-sm font-bold tracking-widest text-indigo-400 uppercase">Guidelines & Restrictions</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans">
              <div className="space-y-2 bg-slate-850 p-4 rounded-xl border border-slate-800/80">
                <span className="font-semibold text-amber-400 flex items-center gap-1.5 font-sans">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> Progress Selection (ඉදිකිරීම් ප්‍රගතිය)
                </span>
                <p className="text-slate-400 leading-relaxed font-sinhala">
                  ඉදිකිරීම් ප්‍රගති තීරුවලින් (Columns K to R) අදාළ වත්මන් තත්ත්වයට පමණක් <code className="bg-slate-800 px-1 py-0.5 rounded text-indigo-300 font-bold">YES</code> හෝ <code className="bg-slate-800 px-1 py-0.5 rounded text-indigo-300 font-bold">ඔව්</code> ඇතුලත් කරන්න.
                </p>
              </div>
              <div className="space-y-2 bg-slate-850 p-4 rounded-xl border border-slate-800/80 font-sans">
                <span className="font-semibold text-indigo-400 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" /> Infrastructure Details
                </span>
                <p className="text-slate-400 leading-relaxed font-sinhala">
                  ජලය, විදුලිය හෝ ප්‍රවේශ මාර්ග යන යටිතල පහසුකම් පවතීනම් <code className="bg-slate-800 px-1 py-0.5 rounded text-indigo-300 font-bold">YES</code> හෝ <code className="bg-slate-800 px-1 py-0.5 rounded text-indigo-300 font-bold">ඔව්</code> ඇතුලත් කරන්න.
                </p>
              </div>
            </div>
          </div>
          <div className="text-[10px] text-slate-500 font-semibold mt-4">
            * Note: NIC validation checks are strictly executed on both backend and frontend.
          </div>
        </div>
      </div>

      {/* Upload Drag & Drop Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-xl font-bold text-slate-800">2. Excel ගොනුව ඇතුලත් කරන්න</h2>
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
                <p className="text-xs text-slate-440 mt-1">Or click to browse from files (.xlsx, .xls, .csv)</p>
              </div>
            </div>
          </div>

          {/* Active Uploading/Parsing Indication */}
          {isParsing && (
            <div className="mt-6 flex items-center gap-3 p-4 bg-indigo-50/30 rounded-xl border border-indigo-100/50 text-indigo-600 font-semibold text-sm">
              <div className="w-5 h-5 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
              <span>ගොනුවේ අඩංගু දත්ත කියවමින් පවතී...</span>
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
                    <p className="text-xs text-slate-400 mt-2 font-medium">Updating houses directory...</p>
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

                  {/* Actions inside error banner */}
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

              {/* SUBMITTING STATE */}
              {submitting && (
                <div className="rounded-2xl bg-indigo-50 border border-indigo-100 p-6 flex items-start gap-4 shadow-sm animate-pulse">
                  <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 flex-shrink-0">
                    <div className="w-5 h-5 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
                  </div>
                  <div>
                    <h3 className="font-bold text-indigo-800">Submitting Houses (නිවාස ඇතුලත් කරමින්...)</h3>
                    <p className="text-sm text-indigo-600 mt-1 font-medium font-sinhala">කරුණාකර මෙම පිටුව වසා දැමීමෙන් හෝ refresh කිරීමෙන් වලකින්න.</p>
                  </div>
                </div>
              )}

              {/* READY STATE */}
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
                        File Name: <span className="text-slate-600 font-bold">{fileName}</span>
                      </p>
                    </div>
                  </div>
                  
                  {/* Action buttons inside the banner */}
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
                      className="flex-1 md:flex-initial px-5 py-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 bg-white hover:bg-slate-50 transition-colors uppercase tracking-wider"
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

export default BulkHouseUpload;
