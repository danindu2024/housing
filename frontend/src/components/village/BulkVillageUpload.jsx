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
  const [uploadProgress, setUploadProgress] = useState({ currentChunk: 0, totalChunks: 0, processedRows: 0, totalRows: 0 });
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [validationErrors, setValidationErrors] = useState(null);



  // 1. Dual-Header Specifications
  const headers1 = [
    'පිහිටීම / Location *', '', '', '', '', '', // Col A to F (merged)
    'මුදල් සම්ප්‍රාදන ක්‍රමය/ Funding Method *', '', '', // Col G to I (merged)
    'ඉඩමේ හිමිකාරීත්වය/ Land Ownership', '', '', '', '', '', '', // Col J to P (merged)
    'ගමේ පිහිටීමේ සීමාව/ Village Boundary', '', '', '', // Col Q to T (merged)
    'මහජනතාවට විවෘතද?/ Is Open to Public?', // Col U (single column - dropdown)
    'යටිතල පහසුකම්/ Infrastructure', '', '', '', '', // Col V to Z (merged)
    'සංරක්ෂිත භූමි තුල පිහිටීම/ Conservation Area', '', '', '', '', '', '', // Col AA to AG (merged)
    'වෙනත් තොරතුරු/ Other Information', '', '' // Col AH to AJ (merged)
  ];

  const headers2 = [
    'ගම්මානයේ නම/ Village Name *', 'පළාත/ Province *', 'දිස්ත්‍රික්කය/ District *', 'ප්‍රාදේශීය ලේකම් කොට්ඨාශය/ DS Division *', 'ග්‍රාමනිළධාරී කොට්ඨාශය/ GN Division',
    'Google Map Link',
    'ණය ගම්මාන (Loan)', 'ඉන්දියන් ආධාර (Indian Grant)', 'නිවාස අධිකාරියේ ආධාර (Housing Auth Grant)',
    'ප්‍රාදේශීය ලේකම් කොට්ඨාශය (Divisional Secretariat)', 'මහවැලි අධිකාරිය (Mahaweli Authority)', 'ඉඩම් ප්‍රතිසංස්කරණ කොමිෂන් සභාව (Land Reform Commission)', 'ජාතික නිවාස සංවර්ධන අධිකාරිය (Housing Development Authority)', 'වනජීවී සංරක්ෂණ දෙපාර්තමේන්තුව (Department of Wildlife)',
    'පෞද්ගලික (Private)', 'පෞද්ගලික + රාජ්‍ය (Private + State)',
    'මහනගර සභාව (Municipal Council)', 'නගරසභාව (Urban Council)', 'ප්‍රාදේශීය සභාව (Pradeshiya Sabha / DS)', 'දුෂ්කර ගම්මාන (Remote Village)',

    'YES / NO',
    'ජලය (Water Supply)', 'විදුලිය (Electricity)', 'ගමට ප්‍රවේශ මාර්ග (Access Roads)', 'අභ්‍යන්තර මාර්ග (Internal Roads)', 'වෙනත් පොදු පහසුකම් (Other Public Amenities)',

    'සංරක්ෂිත භූමියක පිහිටා නැත (Not in Conservation Area)', 'වන ජීවී (Wildlife Land)', 'වන සංරක්ෂණ (Forest Land)', 'වෙරල (Coastal Land)', 'පුරාවිද්‍යා (Archaeological Land)', 'පූජා (Sacred Land)', 'වෙනත් (Other Conservation)',

    'ඉදිකිරීමට සැළසුම්කල නිවාස සංඛ්‍යාව/ Planned Houses *', 'මුල්ගල් තැබු දිනය/ Foundation Date', 'වෙනත් සටහන්/ Other Notes'

  ];


  const sampleRow = [
    'සම්පත්ගම', // නම (Name) - index 0 *
    'Central', // පළාත (Province) - index 1 *
    'Kandy', // දිස්ත්‍රික්කය (District) - index 2 *
    'Kundasale', // ප්‍රාදේශීය ලේකම් කොට්ඨාශය (DS Division) - index 3 *
    'Gonawala', // ග්‍රාමනිළධාරී කොට්ඨාශය (GN Division) - index 4
    'https://maps.google.com/?q=7.2906,80.6337', // Google Map Link - index 5
    'YES', // ණය ගම්මාන - index 6 *
    '',    // ඉන්දියන් ආධාර - index 7
    '',    // නිවාස අධිකාරියේ ආධාර - index 8
    'YES', // ප්‍රාදේශීය ලේකම් කොට්ඨාශය (ownership) - index 9
    '',    // මහවැලි අධිකාරිය - index 10
    '',    // ඉඩම් ප්‍රතිසංස්කරණ කොමිෂන් සභාව - index 11
    '',    // ජාතික නිවාස සංවර්ධන අධිකාරිය - index 12
    '',    // වනජීවී සංරක්ෂණ දෙපාර්තමේන්තුව - index 13
    '',    // පෞද්ගලික - index 14
    '',    // පෞද්ගලික + රාජ්‍ය - index 15
    '',    // මහනගර සභාව - index 16
    '',    // නගරසභාව - index 17
    'YES', // ප්‍රාදේශීය සභාව - index 18
    '',    // දුෂ්කර ගම්මාන - index 19
    'YES', // ප්‍රවේශය (Status dropdown: YES or NO) - index 20
    'YES', // ජලය - index 21
    'YES', // විදුලිය - index 22
    '',    // ගමට ප්‍රවේශ මාර්ග - index 23
    '',    // අභ්‍යන්තර මාර්ග - index 24
    '',    // වෙනත් පොදු පහසුකම් - index 25
    'YES', // සංරක්ෂිත භූමියක පිහිටා නැත - index 26
    '',    // වන ජීවී (Wildlife Land) - index 27
    '',    // වන සංරක්ෂණ (Forest Land) - index 28
    '',    // වෙරල (Coastal Land) - index 29
    '',    // පුරාවිද්‍යා (Archaeological Land) - index 30
    '',    // පූජා (Sacred Land) - index 31
    '',    // වෙනත් (Other Conservation) - index 32
    '50',  // ඉදිකිරීමට සැළසුම්කල නිවාස සංඛ්‍යාව - index 33 *
    '2026-05-25', // මුල්ගල් තැබු දිනය - index 34
    'නොමැත' // වෙනත් සටහන් - index 35
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
      { s: { r: 0, c: 0 }, e: { r: 0, c: 5 } },   // පිහිටීම (A1:F1)
      { s: { r: 0, c: 6 }, e: { r: 0, c: 8 } },   // මුදල් සම්ප්‍රාදන ක්‍රමය (G1:I1)
      { s: { r: 0, c: 9 }, e: { r: 0, c: 15 } },  // ඉඩමේ හිමිකාරීත්වය (J1:P1)
      { s: { r: 0, c: 16 }, e: { r: 0, c: 19 } }, // ගමේ පිහිටීමේ සීමාව (Q1:T1)
      // Col 20 (U) - single column, no merge
      { s: { r: 0, c: 21 }, e: { r: 0, c: 25 } }, // යටිතල පහසුකම් (V1:Z1)
      { s: { r: 0, c: 26 }, e: { r: 0, c: 32 } }, // සංරක්ෂිත භූමි (AA1:AG1)
      { s: { r: 0, c: 33 }, e: { r: 0, c: 35 } }  // වෙනත් තොරතුරු (AH1:AJ1)
    ];

    ws['!rows'] = [
      { hpt: 35 }, // Merged Row 1 (Group Header)
      { hpt: 55 }  // Subtitles Row 2 (High enough for 3-4 lines of wrapped bilingual text)
    ];


    // Style Groups with color-coded palettes
    const sections = [
      { start: 0, end: 5, color: '4F46E5', subColor: 'EEF2F6', textDark: '1E293B', textLight: 'FFFFFF' }, // Indigo - Location
      { start: 6, end: 8, color: 'D97706', subColor: 'FEF3C7', textDark: '78350F', textLight: 'FFFFFF' }, // Amber - Funding
      { start: 9, end: 15, color: '059669', subColor: 'D1FAE5', textDark: '064E3B', textLight: 'FFFFFF' }, // Emerald - Ownership
      { start: 16, end: 19, color: '0891B2', subColor: 'CFFAFE', textDark: '164E63', textLight: 'FFFFFF' }, // Cyan - Boundary
      { start: 20, end: 20, color: 'E11D48', subColor: 'FFE4E6', textDark: '881337', textLight: 'FFFFFF' }, // Rose - Status (single col)
      { start: 21, end: 25, color: '7C3AED', subColor: 'EDE9FE', textDark: '4C1D95', textLight: 'FFFFFF' }, // Violet - Infrastructure
      { start: 26, end: 32, color: '059669', subColor: 'D1FAE5', textDark: '064E3B', textLight: 'FFFFFF' }, // Emerald - Conservation
      { start: 33, end: 35, color: '475569', subColor: 'F1F5F9', textDark: '0F172A', textLight: 'FFFFFF' }  // Slate - Others
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

    // Auto-adjust column sizes dynamically (Option columns compact at 16 with text wrapping)
    const colWidths = headers2.map((h2, i) => {
      if (i === 0) return { wch: 24 }; // Village Name
      if (i === 1) return { wch: 16 }; // Province
      if (i === 2) return { wch: 16 }; // District
      if (i === 3) return { wch: 20 }; // DS Division
      if (i === 4) return { wch: 22 }; // GN Division
      if (i === 5) return { wch: 32 }; // Google Map Link
      
      if (i === 33) return { wch: 20 }; // Planned Houses
      if (i === 34) return { wch: 18 }; // Foundation Date
      if (i === 35) return { wch: 32 }; // Notes

      // Option sub-columns (YES / blank)
      return { wch: 16 };
    });
    ws['!cols'] = colWidths;

    // Dropdown data validation for Status column U (index 20)
    ws['!dataValidations'] = [
      {
        sqref: 'U3:U502',
        type: 'list',
        formula1: '"YES,NO"',
        showDropDown: false,
        showErrorMessage: true,
        errorStyle: 'stop',
        errorTitle: 'Invalid Value',
        error: 'Please select YES or NO from the dropdown.',
        showInputMessage: true,
        promptTitle: 'ප්‍රවේශය',
        prompt: 'Select YES for public access or NO for restricted access.'
      }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Village Template');
    XLSX.writeFile(wb, 'Village_Bulk_Registration_Template.xlsx');
  };

  // 3. Process the file data from Row 3 onwards (Browser Side)
  const processFile = (file) => {
    // Guard: reject files larger than 2 MB — a 100-row styled Excel is < 300 KB
    const MAX_FILE_SIZE_MB = 2;
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setErrorMsg(`ගොනුවේ ප්‍රමාණය ඉතා විශාලයි. උපරිම ගොනු ප්‍රමාණය ${MAX_FILE_SIZE_MB} MB කි. (File too large. Maximum allowed size is ${MAX_FILE_SIZE_MB} MB.)`);
      return;
    }

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
        
        if (parsedAoa.length <= 2) {
          setErrorMsg('තෝරාගත් Excel ගොනුවේ දත්ත ඇතුලත් කර නොමැත. කරුණාකර Row 3 සිට දත්ත ඇතුලත් කරන්න.');
          setIsParsing(false);
          return;
        }

        setRawAoa(parsedAoa);

        const dataRows = parsedAoa.slice(2);

        const mappedRows = dataRows.map((row, idx) => {
          if (!row || row.length === 0 || (row[0] === '' && row[1] === '')) return null;

          let categoryCode = '';
          if (isTrueVal(row[6])) categoryCode = 'LOAN';
          else if (isTrueVal(row[7])) categoryCode = 'GRANT_INDIAN';
          else if (isTrueVal(row[8])) categoryCode = 'GRANT_HOUSING';

          let ownershipBodyCode = '';
          if (isTrueVal(row[9])) ownershipBodyCode = 'DS_DIVISION';
          else if (isTrueVal(row[10])) ownershipBodyCode = 'MAHAWELI';
          else if (isTrueVal(row[11])) ownershipBodyCode = 'LRC';
          else if (isTrueVal(row[12])) ownershipBodyCode = 'HOUSING_AUTH';
          else if (isTrueVal(row[13])) ownershipBodyCode = 'WILDLIFE';
          else if (isTrueVal(row[14])) ownershipBodyCode = 'PRIVATE';
          else if (isTrueVal(row[15])) ownershipBodyCode = 'PRIVATE_STATE';

          let boundaryType = '';
          if (isTrueVal(row[16])) boundaryType = 'MUNICIPAL';
          else if (isTrueVal(row[17])) boundaryType = 'URBAN';
          else if (isTrueVal(row[18])) boundaryType = 'DS';
          else if (isTrueVal(row[19])) boundaryType = 'VILLAGE';

          const rawStatus = row[20] ? String(row[20]).trim().toUpperCase() : '';
          const status = (rawStatus === 'YES' || rawStatus === 'OPEN') ? 'OPEN' : ((rawStatus === 'NO' || rawStatus === 'CLOSED') ? 'CLOSED' : '');

          const infrastructureIssues = [];
          if (isTrueVal(row[21])) infrastructureIssues.push('WATER');
          if (isTrueVal(row[22])) infrastructureIssues.push('ELECTRICITY');
          if (isTrueVal(row[23])) infrastructureIssues.push('ACCESS_ROADS');
          if (isTrueVal(row[24])) infrastructureIssues.push('INTERNAL_ROADS');
          if (isTrueVal(row[25])) infrastructureIssues.push('OTHER');

          let isConservationArea = 'NONE';
          if (isTrueVal(row[26])) isConservationArea = 'NONE';
          else if (isTrueVal(row[27])) isConservationArea = 'WILDLIFE';
          else if (isTrueVal(row[28])) isConservationArea = 'FOREST';
          else if (isTrueVal(row[29])) isConservationArea = 'COASTAL';
          else if (isTrueVal(row[30])) isConservationArea = 'ARCHAEOLOGICAL';
          else if (isTrueVal(row[31])) isConservationArea = 'SACRED';
          else if (isTrueVal(row[32])) isConservationArea = 'OTHER';

          let programStartDate = row[34] ? String(row[34]).trim() : '';
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
            google_map_link: row[5] ? String(row[5]).trim() : '',
            category_code: categoryCode,
            ownership_body_code: ownershipBodyCode,
            boundary_type: boundaryType,
            status: status,
            is_conservation_area: isConservationArea,
            infrastructure_issues: infrastructureIssues,
            total_planned_houses: row[33] !== '' && !isNaN(Number(row[33])) ? Number(row[33]) : null,
            program_start_date: programStartDate,
            notes: row[35] ? String(row[35]).trim() : ''
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

  // 4. Generate Styled Error Excel sheet containing failed rows
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
    
    // Add Row 1 and Row 2 headers with the Error Column appended at index 36 (Column AK)
    const newHeaders1 = [...headers1, 'දෝෂ විස්තරය'];
    const newHeaders2 = [...headers2, 'දෝෂ විස්තරය (Error Message)'];
    
    errorRows.push(newHeaders1);
    errorRows.push(newHeaders2);

    // Loop through raw data rows (indexes 2+)
    rawAoa.forEach((row, idx) => {
      if (idx < 2) return;
      
      const displayRowIndex = idx + 1;
      if (excelRowDetails[displayRowIndex]) {
        const rowErrors = excelRowDetails[displayRowIndex];
        const errorMessages = Object.keys(rowErrors)
          .map(field => `${field.replace('_', ' ').toUpperCase()}: ${rowErrors[field].join('; ')}`)
          .join(' | ');
          
        const errorRow = [...row];
        while (errorRow.length < 36) {
          errorRow.push('');
        }
        errorRow[36] = errorMessages;
        errorRows.push(errorRow);
      }
    });

    const ws = XLSX.utils.aoa_to_sheet(errorRows);

    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 5 } },   // පිහිටීම
      { s: { r: 0, c: 6 }, e: { r: 0, c: 8 } },   // මුදල් සම්ප්‍රාදන ක්‍රමය
      { s: { r: 0, c: 9 }, e: { r: 0, c: 15 } },  // ඉඩමේ හිමිකාරීත්වය
      { s: { r: 0, c: 16 }, e: { r: 0, c: 19 } }, // ගමේ පිහිටීමේ සීමාව
      // Col 20 single (Status)
      { s: { r: 0, c: 21 }, e: { r: 0, c: 25 } }, // යටිතල පහසුකම්
      { s: { r: 0, c: 26 }, e: { r: 0, c: 32 } }, // සංරක්ෂිත භූමි
      { s: { r: 0, c: 33 }, e: { r: 0, c: 35 } }  // වෙනත් තොරතුරු
    ];

    ws['!rows'] = [
      { hpt: 35 },
      { hpt: 55 }
    ];


    const sections = [
      { start: 0, end: 5, color: '4F46E5', subColor: 'EEF2F6', textDark: '1E293B', textLight: 'FFFFFF' },
      { start: 6, end: 8, color: 'D97706', subColor: 'FEF3C7', textDark: '78350F', textLight: 'FFFFFF' },
      { start: 9, end: 15, color: '059669', subColor: 'D1FAE5', textDark: '064E3B', textLight: 'FFFFFF' },
      { start: 16, end: 19, color: '0891B2', subColor: 'CFFAFE', textDark: '164E63', textLight: 'FFFFFF' },
      { start: 20, end: 20, color: 'E11D48', subColor: 'FFE4E6', textDark: '881337', textLight: 'FFFFFF' },
      { start: 21, end: 25, color: '7C3AED', subColor: 'EDE9FE', textDark: '4C1D95', textLight: 'FFFFFF' },
      { start: 26, end: 32, color: '059669', subColor: 'D1FAE5', textDark: '064E3B', textLight: 'FFFFFF' },
      { start: 33, end: 35, color: '475569', subColor: 'F1F5F9', textDark: '0F172A', textLight: 'FFFFFF' },
      { start: 36, end: 36, color: 'DC2626', subColor: 'FEE2E2', textDark: '991B1B', textLight: 'FFFFFF' } // Error column AK
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
      const cellRef = `${getColLetter(36)}${r + 1}`; // AK is index 36
      if (ws[cellRef]) {
        ws[cellRef].s = {
          font: { name: 'Calibri', sz: 9.5, color: { rgb: 'DC2626' }, bold: true },
          alignment: { vertical: 'center', horizontal: 'left', wrapText: true }
        };
      }
    }

    const colWidths = newHeaders2.map((h2, i) => {
      if (i === 0) return { wch: 24 }; // Village Name
      if (i === 1) return { wch: 16 }; // Province
      if (i === 2) return { wch: 16 }; // District
      if (i === 3) return { wch: 20 }; // DS Division
      if (i === 4) return { wch: 22 }; // GN Division
      if (i === 5) return { wch: 32 }; // Google Map Link
      
      if (i === 33) return { wch: 20 }; // Planned Houses
      if (i === 34) return { wch: 18 }; // Foundation Date
      if (i === 35) return { wch: 32 }; // Notes
      if (i === 36) return { wch: 65 }; // Error Message Column

      // Option sub-columns (YES / blank)
      return { wch: 16 };
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

  // 5. Submit Parsed Array to Transactional API in 50-row Chunks
  const handleSubmit = async () => {
    if (parsedRows.length === 0) return;

    const CHUNK_SIZE = 50;
    const totalRows = parsedRows.length;
    const totalChunks = Math.ceil(totalRows / CHUNK_SIZE);

    setSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');
    setValidationErrors(null);
    setUploadProgress({
      currentChunk: 0,
      totalChunks,
      processedRows: 0,
      totalRows,
    });

    let successCount = 0;
    let accumulatedErrors = {};
    let hasCriticalError = false;

    for (let c = 0; c < totalChunks; c++) {
      const startIndex = c * CHUNK_SIZE;
      const endIndex = Math.min(startIndex + CHUNK_SIZE, totalRows);
      const chunkRows = parsedRows.slice(startIndex, endIndex);

      setUploadProgress({
        currentChunk: c + 1,
        totalChunks,
        processedRows: endIndex,
        totalRows,
      });

      try {
        const payload = chunkRows.map(({ originalRowIndex, ...rest }) => rest);
        const res = await api.post('/villages/bulk', payload);
        const inserted = res.data?.inserted_count !== undefined ? res.data.inserted_count : chunkRows.length;
        successCount += inserted;

        if (res.data?.details) {
          const details = res.data.details;
          Object.keys(details).forEach((chunkKey) => {
            const chunkIdx = parseInt(chunkKey, 10) - 1;
            const overallIdx = startIndex + chunkIdx;
            const payloadKey = String(overallIdx + 1);
            accumulatedErrors[payloadKey] = details[chunkKey];
          });
        }
      } catch (err) {
        if (err.response?.data?.details) {
          const inserted = err.response.data.inserted_count || 0;
          successCount += inserted;

          const details = err.response.data.details;
          Object.keys(details).forEach((chunkKey) => {
            const chunkIdx = parseInt(chunkKey, 10) - 1;
            const overallIdx = startIndex + chunkIdx;
            const payloadKey = String(overallIdx + 1);
            accumulatedErrors[payloadKey] = details[chunkKey];
          });
        } else {
          console.error(`Bulk submission chunk ${c + 1} critical failure:`, err);
          setErrorMsg(err.response?.data?.error || `තොග වශයෙන් ඇතුලත් කිරීමේදී කොටසක් (${c + 1}/${totalChunks}) අසාර්ථක විය.`);
          hasCriticalError = true;
          break;
        }
      }
    }

    setSubmitting(false);

    const failedCount = Object.keys(accumulatedErrors).length;
    if (failedCount > 0) {
      setValidationErrors(accumulatedErrors);
      if (successCount > 0) {
        setErrorMsg(`ගම්මාන ${successCount} ක් සාර්ථකව පද්ධතියට ඇතුලත් කරන ලදී. දෝෂ සහිත ගම්මාන ${failedCount} ක් හමුවිය. පහත "Download Error Sheet" බොත්තමෙන් දෝෂ සහිත ගම්මාන පමණක් අඩංගු Excel ගොනුව බාගත කර නිවැරදි කර නැවත ඇතුලත් කරන්න. ගම්මානයෙහි දෝෂය excel ගොනුවෙහි Error Message තීරුවේ දක්වා ඇත.\nSuccessfully uploaded ${successCount} villages. ${failedCount} villages had errors. Click 'Download Error Sheet' to get an Excel file with only the failed villages. Error is shown in the Error Message column in the Excel file.`);
      } else {
        setErrorMsg('ඇතුලත් කිරීමට උත්සාහ කළ සියළු දත්තවල දෝෂ පවතී. කරුණාකර දෝෂ Excel ගොනුව බාගත කර නිවැරදි කර නැවත උත්සාහ කරන්න. \nAll the villages you tried to upload have errors. Please download the error Excel file and correct it and try again.');
      }
    } else if (!hasCriticalError) {
      setSuccessMsg(`සියලුම ගම්මාන ${successCount} සාර්ථකව ඇතුලත් කරන ලදී! (${successCount} Villages imported successfully!)`);
      setTimeout(() => {
        setParsedRows([]);
        setRawAoa([]);
        setFileName('');
        navigate('/villages');
      }, 2000);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* 1. Full-Width Guidelines Card at Top */}
      <div className="bg-slate-900 rounded-2xl p-6 text-slate-100 shadow-md border border-slate-800">
        <div className="space-y-4">
          <h3 className="text-sm font-bold tracking-widest text-indigo-400 uppercase">Mandatory Fields & Validation Rules / අනිවාර්ය තොරතුරු සහ රීති</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            {/* Rule 1: Mandatory Fields */}
            <div className="space-y-2 bg-slate-850 p-4 rounded-xl border border-slate-800/80">
              <span className="font-semibold text-amber-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> Mandatory Fields (*)
              </span>
              <p className="text-white leading-relaxed font-sinhala">
                ගම්මානයේ නම, පළාත, දිස්ත්‍රික්කය, ප්‍රා.ලේ. කොට්ඨාශය, මුදල් සම්පාදන ක්‍රමය, සහ ඉදිකිරීමට සැළසුම්කල නිවාස සංඛ්‍යාව අනිවාර්ය වේ. <br />
                <span className="text-slate-300">Village Name, Province, District, DS Division, Funding Method, and Planned Houses are strictly required (*).</span>
              </p>
            </div>

            {/* Rule 2: Multiple Choice Inputs */}
            <div className="space-y-2 bg-slate-850 p-4 rounded-xl border border-slate-800/80">
              <span className="font-semibold text-indigo-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" /> Multiple Choice Option Inputs
              </span>
              <p className="text-white leading-relaxed font-sinhala">
                බහුතේරීම් තීරූ සඳහා අදාළ තීරු වලට පමණක් "YES" ලෙස ඇතුළත් කර අදාළ නොවන තීරූ හිස්ව තබන්න. 
                (උදා: මුදල් සම්ප්‍රාදන ක්‍රමයේ ණය ගම්මානයක් නම් "ණය ගම්මාන (Loan)" තීරුවේ YES ලෙසද, අනික් තීරූ හිස්වද තබන්න). <br />
                <span className="text-slate-300">For multiple choice columns, enter YES in relevant column and leave others blank. (Ex - If a village is a loan village, enter YES in the "Loan Village" column and leave the other columns blank.)</span>
              </p>
            </div>

            {/* Rule 3: Sample Row Reference */}
            <div className="space-y-2 bg-slate-850 p-4 rounded-xl border border-slate-800/80">
              <span className="font-semibold text-emerald-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Example Row
              </span>
              <p className="text-white leading-relaxed font-sinhala">
                Excel ගොනුවේ 3 වන පේළියෙහි උදාහණයක් අඩංගු වේ. එය ආදර්ශයට ගෙන ඔබේ දත්ත ඇතුළත් කිරීමෙන් පසු එම 3 වන පේළිය ඉවත් කරන්න. <br />
                <span className="text-slate-300">Row 3 contains an example. Use it as a guide and delete Row 3 before saving and uploading your file.</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Step 1: Download Excel Template Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-1">
          <h3 className="text-lg font-bold text-slate-800">1. Download Excel Template</h3>  
          <p className="text-sm text-slate-600 leading-relaxed">
            බාගත කරගත් Excel ගොනුවේ Row 3 සිට අලුත් ගම්මාන දත්ත ඇතුලත් කරන්න. (Enter new village details starting from Row 3 in Excel sheet).
          </p>
        </div>
        <button
          onClick={handleDownloadTemplate}
          className="w-full md:w-auto px-6 py-3.5 rounded-xl border border-indigo-200 text-indigo-600 bg-indigo-50/40 hover:bg-indigo-50 font-bold text-sm transition-all flex items-center justify-center gap-2.5 flex-shrink-0 shadow-sm"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Download Excel Template
        </button>
      </div>

      {/* 3. Step 2: Upload Drag & Drop Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-xl font-bold text-slate-800">2. Upload Excel File</h2>
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
              accept=".xlsx,.xls"
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
                <p className="text-xs text-slate-400 mt-1">Or click to browse from files (.xlsx, .xls)</p>
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

          {/* File-level error (e.g. file too large) — shown before fileName is set */}
          {errorMsg && !fileName && (
            <div className="mt-6 rounded-2xl bg-rose-50 border border-rose-100 p-4 flex items-center gap-3 shadow-sm">
              <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 flex-shrink-0">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-sm text-rose-700 font-medium">{errorMsg}</p>
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
                      <p className="text-sm text-rose-700 mt-1 font-medium leading-relaxed whitespace-pre-line">{errorMsg}</p>
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
                <div className="rounded-2xl bg-indigo-50 border border-indigo-100 p-6 space-y-4 shadow-sm">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 flex-shrink-0 mt-0.5">
                      <div className="w-5 h-5 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-indigo-900">
                        Submitting Villages (ගම්මාන ඇතුලත් කරමින්...) - Chunk {uploadProgress.currentChunk} of {uploadProgress.totalChunks}
                      </h3>
                      <p className="text-sm text-indigo-700 mt-1 font-medium">
                        Progress: {uploadProgress.processedRows} / {uploadProgress.totalRows} rows processed ({Math.round((uploadProgress.processedRows / (uploadProgress.totalRows || 1)) * 100)}%)
                      </p>
                    </div>
                  </div>
                  {/* Progress Bar */}
                  <div className="w-full bg-indigo-200/60 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300 ease-out"
                      style={{ width: `${Math.round((uploadProgress.processedRows / (uploadProgress.totalRows || 1)) * 100)}%` }}
                    />
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
