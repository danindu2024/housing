import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import XLSX from 'xlsx-js-style';
import api from '../../api/axios';

const BulkVillageUpload = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  // States
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState('');
  const [parsedRows, setParsedRows] = useState([]);
  const [rawAoa, setRawAoa] = useState([]); // Stores raw parsed cells for error sheet reconstruction
  const [isParsing, setIsParsing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [validationErrors, setValidationErrors] = useState(null);

  // 1. Dual-Header Specifications
  const headers1 = [
    'පිහිටීම', '', '', '', '', // Col A to E (merged)
    'මුදල් සම්ප්‍රාදන ක්‍රමය', '', '', // Col F to H (merged - now 3 columns)
    'ඉඩමේ හිමිකාරීත්වය', '', '', '', '', // Col I to M (merged)
    'ගමේ පිහිටීමේ සීමාව', '', '', // Col N to P (merged)
    'ග්‍රාම සංවර්ධන මට්ටම', '', // Col Q to R (merged)
    'යටිතල පහසුකම්', '', '', '', '', // Col S to W (merged)
    'වෙනත් තොරතුරු', '', '', '' // Col X to AA (merged)
  ];

  const headers2 = [
    'නම', 'පළාත', 'දිස්ත්‍රික්කය', 'ප්‍රාදේශීය ලේකම් කොට්ඨාශය', 'ග්‍රාමනිළධාරී කොට්ඨාශය',
    'ණය ගම්මාන', 'ඉන්දියන් ආධාර', 'නිවාස අධිකාරියේ ආධාර',
    'ප්‍රාදේශීය ලේකම් කොට්ඨාශය', 'මහවැලි අධිකාරිය', 'ඉඩම් ප්‍රතිසංස්කරණ කොමිෂන් සභාව', 'ජාතික නිවාස සංවර්ධන අධිකාරිය', 'වනජීවී සංරක්ෂණ දෙපාර්තමේන්තුව',
    'මහනගර සභාව', 'ප්‍රාදේශීය සභාව', 'දුෂ්කර ගම්මාන',
    'මහජනතාව සඳහා විවෘතයි', 'විවෘත කර නැත',
    'ජලය', 'විදුලිය', 'ගමට ප්‍රවේශ මාර්ග', 'අභ්‍යන්තර මාර්ග', 'වෙනත් පොදු පහසුකම්',
    'ඉදිකිරීමට සැළසුම්කල නිවාස සංඛ්‍යාව', 'මුල්ගල් තැබු දිනය', 'ගම වනජීවී/සංරක්ෂණ බලසීමා තුල පිහිටයි(YES/NO)', 'වෙනත් සටහන්'
  ];

  const sampleRow = [
    'සම්පත්ගම', // නම (Name) - index 0
    'Central', // පළාත (Province) - index 1
    'Kandy', // දිස්ත්‍රික්කය (District) - index 2
    'Kundasale', // ප්‍රාදේශීය ලේකම් කොට්ඨාශය (DS Division) - index 3
    '702 - Gonawala', // ග්‍රාමනිළධාරී කොට්ඨාශය (GN Division) - index 4
    'YES', // ණය ගම්මාන - index 5
    'NO', // ඉන්දියන් ආධාර - index 6
    'NO', // නිවාස අධිකාරියේ ආධාර - index 7
    'YES', // ප්‍රාදේශීය ලේකම් කොට්ඨාශය (ownership) - index 8
    'NO', // මහවැලි අධිකාරිය - index 9
    'NO', // ඉඩම් ප්‍රතිසංස්කරණ කොමිෂන් සභාව - index 10
    'NO', // ජාතික නිවාස සංවර්ධන අධිකාරිය - index 11
    'NO', // වනජීවී සංරක්ෂණ දෙපාර්තමේන්තුව - index 12
    'NO', // මහනගර සභාව - index 13
    'YES', // ප්‍රාදේශීය සභාව - index 14
    'NO', // දුෂ්කර ගම්මාන - index 15
    'YES', // මහජනතාව සඳහා විවෘතයි - index 16
    'NO', // විවෘත කර නැත - index 17
    'YES', // ජලය - index 18
    'YES', // විදුලිය - index 19
    'NO', // ගමට ප්‍රවේශ මාර්ග - index 20
    'NO', // අභ්‍යන්තර මාර්ග - index 21
    'NO', // වෙනත් පොදු පහසුකම් - index 22
    '50', // ඉදිකිරීමට සැළසුම්කල නිවාස සංඛ්‍යාව - index 23
    '2026-05-25', // මුල්ගල් තැබු දිනය - index 24
    'NO', // ගම වනජීවී/සංරක්ෂණ බලසීමා තුල පිහිටයි(YES/NO) - index 25
    'නව නිවාස සංවර්ධන කටයුතු ප්‍රගතියේ පවතී.' // වෙනත් සටහන් - index 26
  ];

  // Helper: check if cell value counts as checked
  const isTrueVal = (val) => {
    if (val === undefined || val === null || val === '') return false;
    const s = String(val).toLowerCase().trim();
    return s === 'true' || s === 'yes' || s === 'ඔව්' || s === '1' || s === 'ණය' || s === 'ණය ගම්මාන' || s === 'ආධාර' || s === 'සත්‍ය' || s === 'විවෘතයි';
  };

  // Helper: Map index to A-Z letter (handles multi-letter like AB, AC)
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
      { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } },   // පිහිටීම (A1:E1)
      { s: { r: 0, c: 5 }, e: { r: 0, c: 7 } },   // මුදල් සම්ප්‍රාදන ක්‍රමය (F1:H1)
      { s: { r: 0, c: 8 }, e: { r: 0, c: 12 } },  // ඉඩමේ හිමිකාරීත්වය (I1:M1)
      { s: { r: 0, c: 13 }, e: { r: 0, c: 15 } }, // ගමේ පිහිටීමේ සීමාව (N1:P1)
      { s: { r: 0, c: 16 }, e: { r: 0, c: 17 } }, // ග්‍රාම සංවර්ධන මට්ටම (Q1:R1)
      { s: { r: 0, c: 18 }, e: { r: 0, c: 22 } }, // යටිතල පහසුකම් (S1:W1)
      { s: { r: 0, c: 23 }, e: { r: 0, c: 26 } }  // වෙනත් තොරතුරු (X1:AA1)
    ];

    ws['!rows'] = [
      { hpt: 30 }, // Merged Row 1
      { hpt: 26 }  // Subtitles Row 2
    ];

    // Style Groups with color-coded palettes
    const sections = [
      { start: 0, end: 4, color: '4F46E5', subColor: 'EEF2F6', textDark: '1E293B', textLight: 'FFFFFF' }, // Indigo
      { start: 5, end: 7, color: 'D97706', subColor: 'FEF3C7', textDark: '78350F', textLight: 'FFFFFF' }, // Amber
      { start: 8, end: 12, color: '059669', subColor: 'D1FAE5', textDark: '064E3B', textLight: 'FFFFFF' }, // Emerald
      { start: 13, end: 15, color: '0891B2', subColor: 'CFFAFE', textDark: '164E63', textLight: 'FFFFFF' }, // Cyan
      { start: 16, end: 17, color: 'E11D48', subColor: 'FFE4E6', textDark: '881337', textLight: 'FFFFFF' }, // Rose
      { start: 18, end: 22, color: '7C3AED', subColor: 'EDE9FE', textDark: '4C1D95', textLight: 'FFFFFF' }, // Violet
      { start: 23, end: 26, color: '475569', subColor: 'F1F5F9', textDark: '0F172A', textLight: 'FFFFFF' }  // Slate
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
      
      const len1 = h1.length;
      const len2 = h2.length;
      const len3 = sampleVal.length;
      
      const maxLen = Math.max(len1, len2, len3);
      
      return { wch: Math.min(Math.max(maxLen + 4, 15), 45) };
    });
    ws['!cols'] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Village Template');
    XLSX.writeFile(wb, 'Village_Bulk_Registration_Template.xlsx');
  };

  // 3. Process the file data from Row 3 onwards (Browser Side)
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
        
        // Convert to array-of-arrays to safely index fields
        const parsedAoa = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
        
        // Row 1: Merged Headers (index 0)
        // Row 2: Subtitles (index 1)
        // Row 3 onwards: Actual Data rows (index 2+)
        if (parsedAoa.length <= 2) {
          setErrorMsg('තෝරාගත් Excel ගොනුවේ දත්ත ඇතුලත් කර නොමැත. කරුණාකර Row 3 සිට දත්ත ඇතුලත් කරන්න.');
          setIsParsing(false);
          return;
        }

        setRawAoa(parsedAoa); // Save full raw sheet arrays for potential error compilation

        const dataRows = parsedAoa.slice(2); // Extract data starting from Row 3

        const mappedRows = dataRows.map((row, idx) => {
          // Skip entirely blank rows
          if (!row || row.length === 0 || (row[0] === '' && row[1] === '')) return null;

          // Index-based columns resolution (maps exactly to index 0 to 26):
          // 3.1 Category Code
          let categoryCode = '';
          if (isTrueVal(row[5])) categoryCode = 'LOAN';
          else if (isTrueVal(row[6])) categoryCode = 'GRANT_INDIAN';
          else if (isTrueVal(row[7])) categoryCode = 'GRANT_HOUSING';

          // 3.2 Ownership Body Code
          let ownershipBodyCode = '';
          if (isTrueVal(row[8])) ownershipBodyCode = 'DS_DIVISION';
          else if (isTrueVal(row[9])) ownershipBodyCode = 'MAHAWELI';
          else if (isTrueVal(row[10])) ownershipBodyCode = 'LRC';
          else if (isTrueVal(row[11])) ownershipBodyCode = 'HOUSING_AUTH';
          else if (isTrueVal(row[12])) ownershipBodyCode = 'WILDLIFE';

          // 3.3 Boundary Type
          let boundaryType = '';
          if (isTrueVal(row[13])) boundaryType = 'URBAN';
          else if (isTrueVal(row[14])) boundaryType = 'DS';
          else if (isTrueVal(row[15])) boundaryType = 'VILLAGE';

          // 3.4 Status
          let status = 'CLOSED';
          if (isTrueVal(row[16])) status = 'OPEN';
          else if (isTrueVal(row[17])) status = 'CLOSED';

          // 3.5 Conservation
          const isConservationArea = isTrueVal(row[25]) ? 1 : 0;

          // 3.6 Infrastructure Issues Array
          const infrastructureIssues = [];
          if (isTrueVal(row[18])) infrastructureIssues.push('WATER');
          if (isTrueVal(row[19])) infrastructureIssues.push('ELECTRICITY');
          if (isTrueVal(row[20])) infrastructureIssues.push('ACCESS_ROADS');
          if (isTrueVal(row[21])) infrastructureIssues.push('INTERNAL_ROADS');
          if (isTrueVal(row[22])) infrastructureIssues.push('OTHER');

          // 3.7 Program Start Date
          let programStartDate = row[24] ? String(row[24]).trim() : '';
          if (programStartDate && !isNaN(Number(programStartDate)) && Number(programStartDate) > 30000) {
            const dateObj = XLSX.SSF.parse_date_code(Number(programStartDate));
            if (dateObj) {
              const mm = String(dateObj.m).padStart(2, '0');
              const dd = String(dateObj.d).padStart(2, '0');
              programStartDate = `${dateObj.y}-${mm}-${dd}`;
            }
          }

          return {
            originalRowIndex: idx + 3,
            name: row[0] ? String(row[0]).trim() : '',
            province: row[1] ? String(row[1]).trim() : '',
            district_name: row[2] ? String(row[2]).trim() : '',
            division_name: row[3] ? String(row[3]).trim() : '',
            grama_niladhari_division: row[4] ? String(row[4]).trim() : '',
            category_code: categoryCode,
            ownership_body_code: ownershipBodyCode,
            boundary_type: boundaryType,
            status: status,
            is_conservation_area: isConservationArea,
            infrastructure_issues: infrastructureIssues,
            total_planned_houses: row[23] !== '' && !isNaN(Number(row[23])) ? Number(row[23]) : null,
            program_start_date: programStartDate,
            notes: row[26] ? String(row[26]).trim() : ''
          };
        }).filter(r => r !== null && r.name !== '');

        if (mappedRows.length === 0) {
          setErrorMsg('Excel ගොනුවේ වලංගු ගම්මාන දත්ත කිසිවක් හඳුනාගත නොහැකි විය.');
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

    // Map payload-based details (1, 2, ...) to original physical Excel row numbers (3, 5, ...)
    const excelRowDetails = {};
    parsedRows.forEach((row, pIdx) => {
      const payloadKey = String(pIdx + 1);
      if (details[payloadKey]) {
        excelRowDetails[row.originalRowIndex || (pIdx + 3)] = details[payloadKey];
      }
    });

    const errorRows = [];
    
    // Add Row 1 and Row 2 headers with the Error Column appended at index 27 (Column AB)
    const newHeaders1 = [...headers1, 'දෝෂ විස්තරය'];
    const newHeaders2 = [...headers2, 'දෝෂ විස්තරය (Error Message)'];
    
    errorRows.push(newHeaders1);
    errorRows.push(newHeaders2);

    // Loop through raw data rows (indexes 2+)
    rawAoa.forEach((row, idx) => {
      if (idx < 2) return; // Skip headers
      
      const displayRowIndex = idx + 1; // 1-indexed Excel row
      if (excelRowDetails[displayRowIndex]) {
        const rowErrors = excelRowDetails[displayRowIndex];
        const errorMessages = Object.keys(rowErrors)
          .map(field => `${field.replace('_', ' ').toUpperCase()}: ${rowErrors[field].join('; ')}`)
          .join(' | ');
          
        const errorRow = [...row];
        // Pad out array to ensure error message sits exactly at index 27 (Column AB)
        while (errorRow.length < 27) {
          errorRow.push('');
        }
        errorRow[27] = errorMessages;
        errorRows.push(errorRow);
      }
    });

    // Generate sheet via xlsx-js-style
    const ws = XLSX.utils.aoa_to_sheet(errorRows);

    // Set merges (merging sections A-AA in Row 1. Col AB remains standalone for Error)
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } },   // පිහිටීම
      { s: { r: 0, c: 5 }, e: { r: 0, c: 7 } },   // මුදල් සම්ප්‍රාදන ක්‍රමය
      { s: { r: 0, c: 8 }, e: { r: 0, c: 12 } },  // ඉඩමේ හිමිකාරීත්වය
      { s: { r: 0, c: 13 }, e: { r: 0, c: 15 } }, // ගමේ පිහිටීමේ සීමාව
      { s: { r: 0, c: 16 }, e: { r: 0, c: 17 } }, // ග්‍රාම සංවර්ධන මට්ටම
      { s: { r: 0, c: 18 }, e: { r: 0, c: 22 } }, // යටිතල පහසුකම්
      { s: { r: 0, c: 23 }, e: { r: 0, c: 26 } }  // වෙනත් තොරතුරු
    ];

    ws['!rows'] = [
      { hpt: 30 },
      { hpt: 26 }
    ];

    // Style sections
    const sections = [
      { start: 0, end: 4, color: '4F46E5', subColor: 'EEF2F6', textDark: '1E293B', textLight: 'FFFFFF' },
      { start: 5, end: 7, color: 'D97706', subColor: 'FEF3C7', textDark: '78350F', textLight: 'FFFFFF' },
      { start: 8, end: 12, color: '059669', subColor: 'D1FAE5', textDark: '064E3B', textLight: 'FFFFFF' },
      { start: 13, end: 15, color: '0891B2', subColor: 'CFFAFE', textDark: '164E63', textLight: 'FFFFFF' },
      { start: 16, end: 17, color: 'E11D48', subColor: 'FFE4E6', textDark: '881337', textLight: 'FFFFFF' },
      { start: 18, end: 22, color: '7C3AED', subColor: 'EDE9FE', textDark: '4C1D95', textLight: 'FFFFFF' },
      { start: 23, end: 26, color: '475569', subColor: 'F1F5F9', textDark: '0F172A', textLight: 'FFFFFF' },
      // Standalone Error column (AB / index 27) themed in warning Red
      { start: 27, end: 27, color: 'DC2626', subColor: 'FEE2E2', textDark: '991B1B', textLight: 'FFFFFF' }
    ];

    sections.forEach((sec) => {
      // Merged top header styling
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

      // Subtitles styling
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

    // Style the actual written error cells in red
    for (let r = 2; r < errorRows.length; r++) {
      const cellRef = `${getColLetter(27)}${r + 1}`; // AB is index 27
      if (ws[cellRef]) {
        ws[cellRef].s = {
          font: { name: 'Calibri', sz: 9.5, color: { rgb: 'DC2626' }, bold: true },
          alignment: { vertical: 'center', horizontal: 'left', wrapText: true }
        };
      }
    }

    // Dynamic column widths
    const colWidths = newHeaders2.map((h2, i) => {
      const h1 = newHeaders1[i] || '';
      const maxLen = Math.max(h1.length, h2.length, 12);
      if (i === 27) return { wch: 65 }; // Very wide error column
      return { wch: Math.min(Math.max(maxLen + 4, 15), 45) };
    });
    ws['!cols'] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Validation Errors');
    XLSX.writeFile(wb, 'Village_Registration_Errors.xlsx');
  };

  // Drag & Drop Handlers
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

  // 5. Submit Parsed Array to Transactional API
  const handleSubmit = async () => {
    if (parsedRows.length === 0) return;

    setSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');
    setValidationErrors(null);

    try {
      const payload = parsedRows.map(({ originalRowIndex, ...rest }) => rest);
      const response = await api.post('/villages/bulk', payload);
      setSuccessMsg(response.data.message || `${parsedRows.length} Villages imported successfully!`);
      
      // Redirect to directory
      setTimeout(() => {
        setParsedRows([]);
        setRawAoa([]);
        setFileName('');
        navigate('/villages');
      }, 2000);

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
    <div className="max-w-6xl mx-auto space-y-8">
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
            <p className="text-sm text-slate-500 leading-relaxed">
              තොග වශයෙන් ඇතුලත් කිරීමට පෙර අපගේ අලංකාරව සැකසූ ද්විත්ව පේළි Excel ආකෘතිය (Template) බාගත කරගන්න.
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="space-y-2 bg-slate-850 p-4 rounded-xl border border-slate-800/80">
                <span className="font-semibold text-amber-400 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> Location Headers (English Only)
                </span>
                <p className="text-slate-400 leading-relaxed font-sinhala">
                  පළාත (Province), දිස්ත්‍රික්කය (District), සහ ප්‍රාදේශීය ලේකම් (DS Division) අනිවාර්යයෙන් ඉංග්‍රීසි භාෂාවෙන් ඇතුලත් කරන්න. දිස්ත්‍රික්කය සහ DS කොට්ඨාශය අදාළ පළාතට අයත් විය යුතුය.
                </p>
              </div>
              <div className="space-y-2 bg-slate-850 p-4 rounded-xl border border-slate-800/80">
                <span className="font-semibold text-indigo-400 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" /> Dropdowns & Booleans (YES)
                </span>
                <p className="text-slate-400 leading-relaxed font-sinhala">
                  ණය, ආධාර, ඉඩම් හිමිකාරීත්ව, යටිතල පහසුකම් වැනි Dropdowns වලදී අදාළ තීරුවලට <code className="bg-slate-800 px-1 py-0.5 rounded text-indigo-300 font-bold">YES</code> හෝ <code className="bg-slate-800 px-1 py-0.5 rounded text-indigo-300 font-bold">ඔව්</code> ඇතුලත් කරන්න.
                </p>
              </div>
            </div>
          </div>
          <div className="text-[10px] text-slate-500 font-semibold mt-4">
            * Note: ග්‍රාම සංවර්ධන ව්‍යාපෘතියේ නම (Development Project) තොග වශයෙන් ඇතුලත් කිරීමේදී අවශ්‍ය නොවේ.
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
                <p className="text-xs text-slate-400 mt-1">Or click to browse from files (.xlsx, .xls, .csv)</p>
              </div>
            </div>
          </div>

          {/* Active Uploading/Parsing Indication */}
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
                    <p className="text-xs text-slate-400 mt-2 font-medium">Redirecting you to ledger...</p>
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
                      <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                        Uploaded File: <span className="font-semibold text-slate-700">{fileName}</span>
                      </p>
                      {validationErrors && (
                        <p className="text-xs text-rose-600 font-semibold mt-2">
                          ඇතුලත් කිරීමට උත්සාහ කළ ගොනුවේ දෝෂ පවතී. දෝෂ පිළිබඳ විස්තර බැලීමට කරුණාකර පහත බොත්තමෙන් නිවැරදි කිරීම් සහිත Excel ගොනුව බාගත කරගන්න. (Validation errors were found. Please download the annotated Excel sheet to inspect and correct the errors.)
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions inside error banner */}
                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    {validationErrors && (
                      <button
                        onClick={() => downloadErrorExcel(validationErrors)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-sm transition-colors uppercase tracking-wider"
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
                      className="px-5 py-2.5 border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 font-bold text-xs rounded-xl transition-colors uppercase tracking-wider"
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
                    <h3 className="font-bold text-indigo-800">Submitting Villages (ගම්මාන ඇතුලත් කරමින්...)</h3>
                    <p className="text-sm text-indigo-600 mt-1 font-medium">Please do not close or refresh this page. Sending data to secure server...</p>
                  </div>
                </div>
              )}

              {/* READY STATE */}
              {!successMsg && !errorMsg && !submitting && (
                <div className="rounded-2xl bg-slate-50 border border-slate-200 p-6 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 flex-shrink-0">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800">Excel file selected successfully</h4>
                      <p className="text-xs text-slate-450 mt-0.5 font-medium leading-relaxed">
                        File Name: <span className="text-slate-650 font-bold">{fileName}</span>
                      </p>
                    </div>
                  </div>
                  
                  {/* Action buttons inside the banner */}
                  <div className="flex items-center gap-3 w-full md:w-auto flex-shrink-0">
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

export default BulkVillageUpload;
