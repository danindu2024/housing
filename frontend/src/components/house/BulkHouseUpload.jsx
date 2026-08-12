import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import XLSX from 'xlsx-js-style';
import { unzipSync, zipSync, strFromU8, strToU8 } from 'fflate';
import api from '../../api/axios';

const saveWorkbookWithFreeze = (wb, fileName, sheetName, ySplitRows = 2) => {
  const wbOut = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });

  try {
    const unzipped = unzipSync(new Uint8Array(wbOut));
    const sheetPath = 'xl/worksheets/sheet1.xml';

    if (unzipped[sheetPath]) {
      let sheetXml = strFromU8(unzipped[sheetPath]);
      const paneXml = `<pane ySplit="${ySplitRows}" topLeftCell="A${ySplitRows + 1}" activePane="bottomLeft" state="frozen"/>`;

      if (sheetXml.includes('<sheetViews>')) {
        if (sheetXml.includes('<sheetView')) {
          sheetXml = sheetXml.replace(/<sheetView([^>]*)\/>/g, `<sheetView$1>${paneXml}</sheetView>`);
          sheetXml = sheetXml.replace(/(<sheetView[^>]*>)(?![\s\S]*?<pane)/g, `$1${paneXml}`);
        }
      } else {
        const sheetViewsTag = `<sheetViews><sheetView workbookViewId="0">${paneXml}</sheetView></sheetViews>`;
        sheetXml = sheetXml.replace(/(<worksheet[^>]*>)/, `$1${sheetViewsTag}`);
      }

      unzipped[sheetPath] = strToU8(sheetXml);
    }

    const modifiedZip = zipSync(unzipped);
    const blob = new Blob([modifiedZip], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (e) {
    console.error('Freeze pane patch fallback:', e);
    XLSX.writeFile(wb, fileName);
  }
};

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
  const [uploadProgress, setUploadProgress] = useState({ currentChunk: 0, totalChunks: 0, processedRows: 0, totalRows: 0 });
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

  // 1. Dual-Header Specifications
  const getHeaders = () => {
    const catCode = currentVillage?.category_code || '';
    const isLoanOnly = catCode === 'LOAN' || (currentVillage?.is_loan && !catCode.includes('GRANT'));
    const isGrantOnly = catCode.includes('GRANT') && !isLoanOnly;

    if (villageId) {
      const financialHeader1 = isLoanOnly
        ? ['ණය විස්තර / Loan Details', '', '', '']
        : isGrantOnly
        ? ['දීමනා විස්තර / Grant Details', '']
        : ['ණය / දීමනා විස්තර / Loan / Grant Details', '', '', '', '', ''];

      const financialHeader2 = isLoanOnly
        ? [
            'මුළු ණය මුදල - රු. (Total Loan)',
            'මේ දක්වා ගෙවා ඇති මුදල - රු. (Paid So Far)',
            'ණය ආපසු ගෙවීමේ තත්ත්වය (PAYING/FULLY_PAID/DEFAULTED)',
            'ණය පිළිබඳ වෙනත් සටහන් (Other Loan Notes)'
          ]
        : isGrantOnly
        ? [
            'මුළු දීමනා මුදල - රු. (Total Grant)',
            'දීමනා පිළිබඳ වෙනත් සටහන් (Other Grant Notes)'
          ]
        : [
            'මුළු ණය මුදල - රු. (Total Loan)',
            'මේ දක්වා ගෙවා ඇති මුදල - රු. (Paid So Far)',
            'ණය ආපසු ගෙවීමේ තත්ත්වය / Repayment Status (PAYING/FULLY_PAID/DEFAULTED)',
            'ණය පිළිබඳ වෙනත් සටහන් (Other Loan Notes)',
            'මුළු දීමනා මුදල - රු. (Total Grant)',
            'දීමනා පිළිබඳ වෙනත් සටහන් (Other Grant Notes)'
          ];

      const financialSample = isLoanOnly
        ? ['100000', '20000', 'PAYING', 'මාසිකව ගෙවනු ලැබේ']
        : isGrantOnly
        ? ['100000', 'පළමු වාරිකය ලබා දී ඇත']
        : ['100000', '20000', 'PAYING', 'මාසිකව ගෙවනු ලැබේ', '', ''];

      const finCount = financialHeader2.length;
      const finEndCol = 25 + finCount;

      return {
        headers1: [
          'ප්‍රතිලාභකරුගේ තොරතුරු / Beneficiary Details', '', '', '', '', // Col A to E (5 cols)
          'නිවාස සහ ඉඩමේ තොරතුරු / Housing and Land Details', '', // Col F to G (2 cols)
          'අයිතිය / Ownership', '', '', // Col H to J (3 cols) -> SEPARATE HEADER
          'යටිතල පහසුකම් / Infrastructure', '', '', // Col K to M (3 cols) -> SEPARATE HEADER
          'ඉදිකිරීම් ප්‍රගතිය / Construction Progress', '', '', '', '', '', '', '', // Col N to U (8 cols)
          'වත්මන් ක්‍රියාකාරී තත්ත්වය / Current Active Status', '', '', // Col V to X (3 cols)
          'ඇස්තමේන්තු සහ සටහන් / Estimated Costs and Notes', '', // Col Y to Z (2 cols)
          ...financialHeader1
        ],
        headers2: [
          'ප්‍රතිලාභී අංකය (Beneficiary Number) *',
          'ප්‍රතිලාභකරුගේ සම්පූර්ණ නම (Beneficiary Name) *',
          'ජාතික හැඳුනුම්පත් අංකය (NIC Number)',
          'දුරකථන අංකය (Phone Number)',
          'ස්ථිර නිවාස ලිපිනය (Permanent Address)',
          'මූලික පිඹුරේ හෝ කට්ටි සැලැස්මේ අංකය (House Plan Number)',
          'ඉඩමේ ප්‍රමාණය - පර්චස් (Land Extent - Perches)',
          'අයිතිය ප්‍රතිලාභියා සතුයි (Beneficier Has Ownership)',
          'නිවස කුලියට දී ඇත (House is Rented)',
          'ඉඩම/නිවස විකුණා ඇත (Land/House is Sold)',
          'ජලය (Water)',
          'විදුලිය (Electricity)',
          'ප්‍රවේශ මාර්ග (Access Roads)',
          'ආරම්භ කර නොමැත (Not Started)',
          'අත්තිවාරම දමා ඇත (Foundation Complete)',
          'ජනෙල් මට්ටමට නිමකර ඇත (Window Level Completed)',
          'ලින්ටල් මට්ටමට නිමකර ඇත (Lintel Level Completed)',
          'වහල මට්ටමට නිමකර ඇත (Roof Level Completed)',
          'වහලය නිමකර ඇත (Roof Completed)',
          'කපරාරු නිමකර ඇත (Plastering Complete)',
          'නිවස සම්පූර්ණයෙන් ඉදිකර ඇත (Fully Completed)',
          'ඉදිකිරීම් වර්තමානයේ ක්‍රියාත්මක වේ (Active Construction)',
          'ඉදිකිරීම් නවතා ඇත (Construction Stopped)',
          'ඉදිකර අවසන් (Construction Completed)',
          'ඉදිකර ඇති කොටසේ දළ වටිනාකම - රු. (Estimated Construction Value)',
          'වෙනත් සටහන් (Other Notes)',
          ...financialHeader2
        ],
        sampleRow: [
          'NH/HA/MV/SD/0001', 'දිලාන් පෙරේරා', '199012345678', '0771234567', 'නො. 45, ගාලු පාර, කොළඹ 03',
          'HOU-001', '15',
          'YES', '', '',
          'YES', 'YES', '',
          '', '', '', '', '', '', '', 'YES',
          'YES', '', '',
          '500000', 'නොමැත',
          ...financialSample
        ],
        merges: [
          { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } },   // ප්‍රතිලාභකරුගේ තොරතුරු
          { s: { r: 0, c: 5 }, e: { r: 0, c: 6 } },   // නිවාස සහ ඉඩමේ තොරතුරු
          { s: { r: 0, c: 7 }, e: { r: 0, c: 9 } },   // අයිතිය
          { s: { r: 0, c: 10 }, e: { r: 0, c: 12 } }, // යටිතල පහසුකම්
          { s: { r: 0, c: 13 }, e: { r: 0, c: 20 } }, // ඉදිකිරීම් ප්‍රගතිය
          { s: { r: 0, c: 21 }, e: { r: 0, c: 23 } }, // වත්මන් ක්‍රියාකාරී තත්ත්වය
          { s: { r: 0, c: 24 }, e: { r: 0, c: 25 } }, // ඇස්තමේන්තු සහ සටහන්
          { s: { r: 0, c: 26 }, e: { r: 0, c: finEndCol } }  // Dynamic Loan/Grant
        ],
        sections: [
          { start: 0, end: 4, color: '4F46E5', subColor: 'EEF2F6', textDark: '1E293B', textLight: 'FFFFFF' },
          { start: 5, end: 6, color: '0284C7', subColor: 'E0F2FE', textDark: '0369A1', textLight: 'FFFFFF' },
          { start: 7, end: 9, color: '0D9488', subColor: 'CCFBF1', textDark: '115E59', textLight: 'FFFFFF' },
          { start: 10, end: 12, color: '7C3AED', subColor: 'EDE9FE', textDark: '4C1D95', textLight: 'FFFFFF' },
          { start: 13, end: 20, color: 'D97706', subColor: 'FEF3C7', textDark: '78350F', textLight: 'FFFFFF' },
          { start: 21, end: 23, color: '059669', subColor: 'D1FAE5', textDark: '064E3B', textLight: 'FFFFFF' },
          { start: 24, end: 25, color: '475569', subColor: 'F1F5F9', textDark: '0F172A', textLight: 'FFFFFF' },
          { start: 26, end: finEndCol, color: 'C026D3', subColor: 'F5D0FE', textDark: '701A75', textLight: 'FFFFFF' }
        ]
      };
    } else {
      return {
        headers1: [
          'ස්ථානීය තොරතුරු / Location Details', '', '', '',
          'ප්‍රතිලාභකරුගේ තොරතුරු / Beneficiary Details', '', '', '', '',
          'නිවාස සහ ඉඩමේ තොරතුරු / Housing and Land Details', '',
          'අයිතිය / Ownership', '', '',
          'යටිතල පහසුකම් / Infrastructure', '', '',
          'ඉදිකිරීම් ප්‍රගතිය / Construction Progress', '', '', '', '', '', '', '',
          'වත්මන් ක්‍රියාකාරී තත්ත්වය / Current Active Status', '', '',
          'ඇස්තමේන්තු සහ සටහන් / Estimated Costs and Notes', '',
          'ණය / දීමනා විස්තර / Loan / Grant Details', '', '', '', '', ''
        ],
        headers2: [
          'පළාත (Province) *',
          'දිස්ත්‍රික්කය (District) *',
          'ප්‍රාදේශීය ලේකම් කොට්ඨාශය (DS Division) *',
          'ගම්මානයේ නම (Village Name) *',
          'ප්‍රතිලාභී අංකය (Beneficiary Number) *',
          'ප්‍රතිලාභකරුගේ සම්පූර්ණ නම (Beneficiary Name) *',
          'ජාතික හැඳුනුම්පත් අංකය (NIC Number)',
          'දුරකථන අංකය (Phone Number)',
          'ස්ථිර නිවාස ලිපිනය (Permanent Address)',
          'මූලික පිඹුරේ හෝ කට්ටි සැලැස්මේ අංකය (House Plan Number)',
          'ඉඩමේ ප්‍රමාණය - පර්චස් (Land Extent - Perches)',
          'අයිතිය ප්‍රතිලාභියා සතුයි (Beneficier Has Ownership)',
          'නිවස කුලියට දී ඇත (House is Rented)',
          'ඉඩම/නිවස විකුණා ඇත (Land/House is Sold)',
          'ජලය (Water)',
          'විදුලිය (Electricity)',
          'ප්‍රවේශ මාර්ග (Access Roads)',
          'ආරම්භ කර නොමැත (Not Started)',
          'අත්තිවාරම දමා ඇත (Foundation Complete)',
          'ජනෙල් මට්ටමට නිමකර ඇත (Window Level Completed)',
          'ලින්ටල් මට්ටමට නිමකර ඇත (Lintel Level Completed)',
          'වහල මට්ටමට නිමකර ඇත (Roof Level Completed)',
          'වහලය නිමකර ඇත (Roof Completed)',
          'කපරාරු නිමකර ඇත (Plastering Complete)',
          'නිවස සම්පූර්ණයෙන් ඉදිකර ඇත (Fully Completed)',
          'ඉදිකිරීම් වර්තමානයේ ක්‍රියාත්මක වේ (Active Construction)',
          'ඉදිකිරීම් නවතා ඇත (Construction Stopped)',
          'ඉදිකර අවසන් (Construction Completed)',
          'ඉදිකර ඇති කොටසේ දළ වටිනාකම - රු. (Estimated Construction Value)',
          'වෙනත් සටහන් (Other Notes)',
          'මුළු ණය මුදල - රු. (Total Loan)',
          'මේ දක්වා ගෙවා ඇති මුදල - රු. (Paid So Far)',
          'ණය ආපසු ගෙවීමේ තත්ත්වය (PAYING/FULLY_PAID/DEFAULTED)',
          'ණය පිළිබඳ වෙනත් සටහන් (Other Loan Notes)',
          'මුළු දීමනා මුදල - රු. (Total Grant)',
          'දීමනා පිළිබඳ වෙනත් සටහන් (Other Grant Notes)'
        ],
        sampleRow: [
          currentVillage?.province || 'Central',
          currentVillage?.district_name || 'Kandy',
          currentVillage?.division_name || 'Kundasale',
          currentVillage?.name || 'Sampathgama',
          'NH/HA/MV/SD/0001', 'දිලාන් පෙරේරා', '199012345678', '0771234567', 'නො. 45, ගාලු පාර, කොළඹ 03',
          'HOU-001', '15',
          'YES', 'NO', 'NO',
          'YES', 'YES', 'NO',
          'NO', 'NO', 'NO', 'NO', 'NO', 'NO', 'NO', 'YES',
          'YES', 'NO', 'NO',
          '500000', 'සතුටුදායක තත්ත්වයක පවතී',
          '100000', '20000', 'PAYING', 'මාසිකව ගෙවනු ලැබේ', '', ''
        ],
        merges: [
          { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } },   // ස්ථානීය තොරතුරු
          { s: { r: 0, c: 4 }, e: { r: 0, c: 8 } },   // ප්‍රතිලාභකරුගේ තොරතුරු
          { s: { r: 0, c: 9 }, e: { r: 0, c: 10 } },  // නිවාස සහ ඉඩමේ තොරතුරු
          { s: { r: 0, c: 11 }, e: { r: 0, c: 13 } }, // අයිතිය
          { s: { r: 0, c: 14 }, e: { r: 0, c: 16 } }, // යටිතල පහසුකම්
          { s: { r: 0, c: 17 }, e: { r: 0, c: 24 } }, // ඉදිකිරීම් ප්‍රගතිය
          { s: { r: 0, c: 25 }, e: { r: 0, c: 27 } }, // වත්මන් ක්‍රියාකාරී තත්ත්වය
          { s: { r: 0, c: 28 }, e: { r: 0, c: 29 } }, // ඇස්තමේන්තු සහ සටහන්
          { s: { r: 0, c: 30 }, e: { r: 0, c: 35 } }  // ණය / දීමනා විස්තර
        ],
        sections: [
          { start: 0, end: 3, color: '312E81', subColor: 'E0E7FF', textDark: '1E1B4B', textLight: 'FFFFFF' },
          { start: 4, end: 8, color: '4F46E5', subColor: 'EEF2F6', textDark: '1E293B', textLight: 'FFFFFF' },
          { start: 9, end: 10, color: '0284C7', subColor: 'E0F2FE', textDark: '0369A1', textLight: 'FFFFFF' },
          { start: 11, end: 13, color: '0D9488', subColor: 'CCFBF1', textDark: '115E59', textLight: 'FFFFFF' },
          { start: 14, end: 16, color: '7C3AED', subColor: 'EDE9FE', textDark: '4C1D95', textLight: 'FFFFFF' },
          { start: 17, end: 24, color: 'D97706', subColor: 'FEF3C7', textDark: '78350F', textLight: 'FFFFFF' },
          { start: 25, end: 27, color: '059669', subColor: 'D1FAE5', textDark: '064E3B', textLight: 'FFFFFF' },
          { start: 28, end: 29, color: '475569', subColor: 'F1F5F9', textDark: '0F172A', textLight: 'FFFFFF' },
          { start: 30, end: 35, color: 'C026D3', subColor: 'F5D0FE', textDark: '701A75', textLight: 'FFFFFF' }
        ]
      };
    }
  };

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
    const config = getHeaders();
    const data = [config.headers1, config.headers2, config.sampleRow];
    const ws = XLSX.utils.aoa_to_sheet(data);

    ws['!merges'] = config.merges;
    ws['!rows'] = [
      { hpt: 35 }, // Group Header Row 1
      { hpt: 55 }  // Subheader Row 2 (wraps bilingual text comfortably)
    ];

    // Freeze top 2 header rows so headers remain visible when scrolling
    ws['!freeze'] = { xSplit: 0, ySplit: 2, topLeftCell: 'A3', activePane: 'bottomLeft', state: 'frozen' };
    ws['!views'] = [{ state: 'frozen', xSplit: 0, ySplit: 2, topLeftCell: 'A3', activePane: 'bottomLeft' }];

    config.sections.forEach((sec) => {
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

    // Fixed compact column widths based on content type to eliminate excessive scrolling
    const colWidths = config.headers2.map((h2, i) => {
      if (villageId) {
        if (i === 0) return { wch: 22 }; // Beneficiary Number
        if (i === 1) return { wch: 24 }; // Beneficiary Name
        if (i === 2) return { wch: 18 }; // NIC
        if (i === 3) return { wch: 16 }; // Phone
        if (i === 4) return { wch: 28 }; // Address
        if (i === 5) return { wch: 18 }; // House Plan No
        if (i === 6) return { wch: 15 }; // Land Size
        if (i >= 7 && i <= 23) return { wch: 15 }; // Option sub-columns
        if (i === 24) return { wch: 20 }; // Estimated Value
        if (i === 25) return { wch: 25 }; // Notes
        return { wch: 20 }; // Financial Columns
      } else {
        if (i >= 0 && i <= 3) return { wch: 18 }; // Location Details
        if (i === 4) return { wch: 22 }; // Beneficiary Number
        if (i === 5) return { wch: 24 }; // Beneficiary Name
        if (i === 6) return { wch: 18 }; // NIC
        if (i === 7) return { wch: 16 }; // Phone
        if (i === 8) return { wch: 28 }; // Address
        if (i === 9) return { wch: 18 }; // House Plan No
        if (i === 10) return { wch: 15 }; // Land Size
        if (i >= 11 && i <= 27) return { wch: 15 }; // Option sub-columns
        if (i === 28) return { wch: 20 }; // Estimated Value
        if (i === 29) return { wch: 25 }; // Notes
        return { wch: 20 }; // Financial Columns
      }
    });
    ws['!cols'] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'House Template');
    saveWorkbookWithFreeze(wb, 'House_Bulk_Import_Template.xlsx', 'House Template', 2);
  };

  // 3. Process Uploaded File with 2MB Guard and Positional AOA Parsing
  const processFile = (file) => {
    setErrorMsg('');
    setSuccessMsg('');
    setValidationErrors(null);
    setFileName('');
    setParsedRows([]);
    setRawAoa([]);

    const MAX_SIZE = 2 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setErrorMsg(`ගොනු ප්‍රමාණය 2MB සීමාව ඉක්මවා ඇත. (Uploaded file size ${(file.size / (1024 * 1024)).toFixed(2)}MB exceeds the 2MB limit).`);
      return;
    }

    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      setErrorMsg('කරුණාකර වලංගු Excel ගොනුවක් තෝරන්න (.xlsx හෝ .xls).');
      return;
    }

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
        const offset = villageId ? 0 : 4;

        const catCode = currentVillage?.category_code || '';
        const isLoanOnly = villageId && (catCode === 'LOAN' || (currentVillage?.is_loan && !catCode.includes('GRANT')));
        const isGrantOnly = villageId && catCode.includes('GRANT') && !isLoanOnly;

        const seenInBatch = {};

        const mappedRows = dataRows.map((row, idx) => {
          if (!row || row.length === 0) return null;

          const beneficiaryNumber = row[offset + 0] ? String(row[offset + 0]).trim() : '';
          const ownerName = row[offset + 1] ? String(row[offset + 1]).trim() : '';

          if (!beneficiaryNumber && !ownerName) return null;

          const rowErrors = {};

          if (beneficiaryNumber) {
            const benKey = beneficiaryNumber.toLowerCase();
            if (seenInBatch[benKey]) {
              rowErrors['beneficiary_number'] = [`ප්‍රතිලාභී අංකය '${beneficiaryNumber}' මෙම Excel ගොනුවේ Row ${seenInBatch[benKey]} හි දැනටමත් යොදා ඇත. (Duplicate beneficiary number '${beneficiaryNumber}' found in Excel sheet at row ${seenInBatch[benKey]}.)`];
            } else {
              seenInBatch[benKey] = idx + 3;
            }
          } else {
            rowErrors['beneficiary_number'] = ['ප්‍රතිලාභී අංකය අනිවාර්ය වේ. (Beneficiary number is required.)'];
          }

          if (!ownerName) {
            rowErrors['owner_name'] = ['ප්‍රතිලාභකරුගේ නම අනිවාර්ය වේ. (Beneficiary full name is required.)'];
          }

          const ownerNic = row[offset + 2] ? String(row[offset + 2]).trim() : '';
          const ownerContact = row[offset + 3] ? String(row[offset + 3]).trim() : '';
          const permanentAddress = row[offset + 4] ? String(row[offset + 4]).trim() : '';

          const houseNumber = row[offset + 5] ? String(row[offset + 5]).trim() : '';
          const landAreaPerches = row[offset + 6] !== '' && !isNaN(Number(row[offset + 6])) ? Number(row[offset + 6]) : null;

          // Single-Select Validation 1: Ownership
          const ownershipYesCount = [row[offset + 7], row[offset + 8], row[offset + 9]].filter(isTrueVal).length;
          if (ownershipYesCount > 1) {
            rowErrors['ownership'] = ['අයිතිය සදහා එක් විකල්පයකට පමණක් YES ඇතුළත් කරන්න. (Please select YES for only ONE ownership option.)'];
          }

          let ownership = '';
          if (isTrueVal(row[offset + 7])) ownership = 'NEW';
          else if (isTrueVal(row[offset + 8])) ownership = 'REPAIR';
          else if (isTrueVal(row[offset + 9])) ownership = 'RELOCATION';

          // Infrastructure: Col offset + 10 (Water), 11 (Electricity), 12 (Access Roads)
          const infrastructureIssues = [];
          if (isTrueVal(row[offset + 10])) infrastructureIssues.push('WATER');
          if (isTrueVal(row[offset + 11])) infrastructureIssues.push('ELECTRICITY');
          if (isTrueVal(row[offset + 12])) infrastructureIssues.push('ACCESS_ROADS');

          // Single-Select Validation 2: Construction Stage
          const stageYesCount = [
            row[offset + 13], row[offset + 14], row[offset + 15], row[offset + 16],
            row[offset + 17], row[offset + 18], row[offset + 19], row[offset + 20]
          ].filter(isTrueVal).length;
          if (stageYesCount > 1) {
            rowErrors['construction_stage'] = ['ඉදිකිරීම් ප්‍රගතිය සදහා එක් තත්ත්වයකට පමණක් YES ඇතුළත් කරන්න. (Please select YES for only ONE construction stage option.)'];
          }

          let constructionStage = 'NOT_STARTED';
          if (isTrueVal(row[offset + 13])) constructionStage = 'NOT_STARTED';
          else if (isTrueVal(row[offset + 14])) constructionStage = 'FOUNDATION';
          else if (isTrueVal(row[offset + 15])) constructionStage = 'WALL';
          else if (isTrueVal(row[offset + 16])) constructionStage = 'ROOF';
          else if (isTrueVal(row[offset + 17])) constructionStage = 'FINISHING';
          else if (isTrueVal(row[offset + 18])) constructionStage = 'FINISHING2';
          else if (isTrueVal(row[offset + 19])) constructionStage = 'FINISHING3';
          else if (isTrueVal(row[offset + 20])) constructionStage = 'COMPLETED';

          // Single-Select Validation 3: Current Active Status
          const statusYesCount = [row[offset + 21], row[offset + 22], row[offset + 23]].filter(isTrueVal).length;
          if (statusYesCount > 1) {
            rowErrors['current_status'] = ['වත්මන් ක්‍රියාකාරී තත්ත්වය සදහා එක් විකල්පයකට පමණක් YES ඇතුළත් කරන්න. (Please select YES for only ONE current status option.)'];
          }

          let currentStatus = '';
          if (isTrueVal(row[offset + 21])) currentStatus = 'IN_PROGRESS';
          else if (isTrueVal(row[offset + 22])) currentStatus = 'STOPPED';
          else if (isTrueVal(row[offset + 23])) currentStatus = 'FINISHED';

          const estimatedValue = row[offset + 24] !== '' && !isNaN(Number(row[offset + 24])) ? Number(row[offset + 24]) : null;
          const notes = row[offset + 25] ? String(row[offset + 25]).trim() : '';

          // Dynamic Financial Fields
          let loanAmount = null;
          let totalPaidSoFar = null;
          let repaymentStatus = '';
          let loanNotes = '';
          let grantAmount = null;
          let grantNotes = '';

          if (isLoanOnly) {
            loanAmount = row[offset + 26] !== '' && !isNaN(Number(row[offset + 26])) ? Number(row[offset + 26]) : null;
            totalPaidSoFar = row[offset + 27] !== '' && !isNaN(Number(row[offset + 27])) ? Number(row[offset + 27]) : null;
            const rawRepayment = row[offset + 28] ? String(row[offset + 28]).trim().toUpperCase() : '';
            repaymentStatus = ['PAYING', 'FULLY_PAID', 'DEFAULTED'].includes(rawRepayment) ? rawRepayment : '';
            loanNotes = row[offset + 29] ? String(row[offset + 29]).trim() : '';
          } else if (isGrantOnly) {
            grantAmount = row[offset + 26] !== '' && !isNaN(Number(row[offset + 26])) ? Number(row[offset + 26]) : null;
            grantNotes = row[offset + 27] ? String(row[offset + 27]).trim() : '';
          } else {
            loanAmount = row[offset + 26] !== '' && !isNaN(Number(row[offset + 26])) ? Number(row[offset + 26]) : null;
            totalPaidSoFar = row[offset + 27] !== '' && !isNaN(Number(row[offset + 27])) ? Number(row[offset + 27]) : null;
            const rawRepayment = row[offset + 28] ? String(row[offset + 28]).trim().toUpperCase() : '';
            repaymentStatus = ['PAYING', 'FULLY_PAID', 'DEFAULTED'].includes(rawRepayment) ? rawRepayment : '';
            loanNotes = row[offset + 29] ? String(row[offset + 29]).trim() : '';

            grantAmount = row[offset + 30] !== '' && !isNaN(Number(row[offset + 30])) ? Number(row[offset + 30]) : null;
            grantNotes = row[offset + 31] ? String(row[offset + 31]).trim() : '';
          }

          return {
            originalRowIndex: idx + 3,
            province: !villageId && row[0] ? String(row[0]).trim() : '',
            district: !villageId && row[1] ? String(row[1]).trim() : '',
            division: !villageId && row[2] ? String(row[2]).trim() : '',
            village_name: !villageId && row[3] ? String(row[3]).trim() : '',
            beneficiary_number: beneficiaryNumber,
            owner_name: ownerName,
            owner_nic: ownerNic,
            owner_contact: ownerContact,
            permanent_address: permanentAddress,
            house_number: houseNumber,
            land_area_perches: landAreaPerches,
            ownership: ownership,
            infrastructure_issues: infrastructureIssues,
            construction_stage: constructionStage,
            current_status: currentStatus,
            estimated_value: estimatedValue,
            notes: notes,
            loan_amount: loanAmount,
            total_paid_so_far: totalPaidSoFar,
            repayment_status: repaymentStatus,
            loan_notes: loanNotes,
            grant_amount: grantAmount,
            grant_notes: grantNotes,
            _rowErrors: Object.keys(rowErrors).length > 0 ? rowErrors : null
          };
        }).filter(r => r !== null);

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

    const config = getHeaders();
    const excelRowDetails = {};
    parsedRows.forEach((row, pIdx) => {
      const payloadKey = String(pIdx + 1);
      if (details[payloadKey]) {
        excelRowDetails[row.originalRowIndex || (pIdx + 3)] = details[payloadKey];
      }
    });

    const errorRows = [];
    
    const newHeaders1 = [...config.headers1, 'දෝෂ විස්තරය'];
    const newHeaders2 = [...config.headers2, 'දෝෂ විස්තරය (Error Message)'];
    
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
        const targetLen = config.headers2.length;
        while (errorRow.length < targetLen) {
          errorRow.push('');
        }
        errorRow[targetLen] = errorMessages;
        errorRows.push(errorRow);
      }
    });

    const ws = XLSX.utils.aoa_to_sheet(errorRows);

    ws['!merges'] = config.merges;
    ws['!rows'] = [
      { hpt: 35 },
      { hpt: 55 }
    ];

    // Freeze top 2 header rows
    ws['!freeze'] = { xSplit: 0, ySplit: 2, topLeftCell: 'A3', activePane: 'bottomLeft', state: 'frozen' };
    ws['!views'] = [{ state: 'frozen', xSplit: 0, ySplit: 2, topLeftCell: 'A3', activePane: 'bottomLeft' }];

    const errColIdx = config.headers2.length;
    const sections = [
      ...config.sections,
      { start: errColIdx, end: errColIdx, color: 'DC2626', subColor: 'FEE2E2', textDark: '991B1B', textLight: 'FFFFFF' }
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
      const cellRef = `${getColLetter(errColIdx)}${r + 1}`;
      if (ws[cellRef]) {
        ws[cellRef].s = {
          font: { name: 'Calibri', sz: 9.5, color: { rgb: 'DC2626' }, bold: true },
          alignment: { vertical: 'center', horizontal: 'left', wrapText: true }
        };
      }
    }

    const colWidths = newHeaders2.map((h2, i) => {
      if (i === errColIdx) return { wch: 55 }; // Error Message column
      if (villageId) {
        if (i === 0) return { wch: 22 }; // Beneficiary Number
        if (i === 1) return { wch: 24 }; // Beneficiary Name
        if (i === 2) return { wch: 18 }; // NIC
        if (i === 3) return { wch: 16 }; // Phone
        if (i === 4) return { wch: 28 }; // Address
        if (i === 5) return { wch: 18 }; // House Plan No
        if (i === 6) return { wch: 15 }; // Land Size
        if (i >= 7 && i <= 23) return { wch: 15 }; // Options
        if (i === 24) return { wch: 20 }; // Estimated Value
        if (i === 25) return { wch: 25 }; // Notes
        return { wch: 20 }; // Financial
      } else {
        if (i >= 0 && i <= 3) return { wch: 18 }; // Location
        if (i === 4) return { wch: 22 }; // Beneficiary Number
        if (i === 5) return { wch: 24 }; // Beneficiary Name
        if (i === 6) return { wch: 18 }; // NIC
        if (i === 7) return { wch: 16 }; // Phone
        if (i === 8) return { wch: 28 }; // Address
        if (i === 9) return { wch: 18 }; // House Plan No
        if (i === 10) return { wch: 15 }; // Land Size
        if (i >= 11 && i <= 27) return { wch: 15 }; // Options
        if (i === 28) return { wch: 20 }; // Estimated Value
        if (i === 29) return { wch: 25 }; // Notes
        return { wch: 20 }; // Financial
      }
    });
    ws['!cols'] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Validation Errors');
    saveWorkbookWithFreeze(wb, 'House_Registration_Errors.xlsx', 'Validation Errors', 2);
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

  // Submit Parsed Array to Transactional API in 50-row Chunks
  const handleSubmit = async () => {
    if (parsedRows.length === 0) return;

    const CHUNK_SIZE = 50;
    const totalRows = parsedRows.length;
    const totalChunks = Math.ceil(totalRows / CHUNK_SIZE);
    const endpoint = villageId ? `/villages/${villageId}/houses/bulk` : '/houses/bulk';

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

    // Collect pre-flagged client-side validation errors (e.g. single-select multiple YES selections)
    parsedRows.forEach((row, pIdx) => {
      if (row._rowErrors) {
        const payloadKey = String(pIdx + 1);
        accumulatedErrors[payloadKey] = row._rowErrors;
      }
    });

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

      const validChunkItems = chunkRows
        .map((r, chunkIdx) => ({ r, chunkIdx }))
        .filter(({ r }) => !r._rowErrors);

      if (validChunkItems.length > 0) {
        try {
          const payload = validChunkItems.map(({ r }) => {
            const { originalRowIndex, _rowErrors, ...rest } = r;
            return rest;
          });
          const res = await api.post(endpoint, payload);
          const inserted = res.data?.inserted_count !== undefined ? res.data.inserted_count : payload.length;
          successCount += inserted;

          if (res.data?.details) {
            const details = res.data.details;
            Object.keys(details).forEach((cKey) => {
              const cIdx = parseInt(cKey, 10) - 1;
              const item = validChunkItems[cIdx];
              if (item) {
                const overallIdx = startIndex + item.chunkIdx;
                const payloadKey = String(overallIdx + 1);
                accumulatedErrors[payloadKey] = details[cKey];
              }
            });
          }
        } catch (err) {
          if (err.response?.data?.details) {
            const inserted = err.response.data.inserted_count || 0;
            successCount += inserted;

            const details = err.response.data.details;
            Object.keys(details).forEach((cKey) => {
              const cIdx = parseInt(cKey, 10) - 1;
              const item = validChunkItems[cIdx];
              if (item) {
                const overallIdx = startIndex + item.chunkIdx;
                const payloadKey = String(overallIdx + 1);
                accumulatedErrors[payloadKey] = details[cKey];
              }
            });
          } else {
            console.error(`Bulk house submission chunk ${c + 1} critical failure:`, err);
            setErrorMsg(err.response?.data?.error || `තොග වශයෙන් ඇතුලත් කිරීමේදී කොටසක් (${c + 1}/${totalChunks}) අසාර්ථක විය.`);
            hasCriticalError = true;
            break;
          }
        }
      }
    }

    setSubmitting(false);

    const failedCount = Object.keys(accumulatedErrors).length;
    if (failedCount > 0) {
      setValidationErrors(accumulatedErrors);
      if (successCount > 0) {
        setErrorMsg(`නිවාස ${successCount} ක් සාර්ථකව පද්ධතියට ඇතුලත් කරන ලදී. දෝෂ සහිත නිවාස ${failedCount} ක් හමුවිය. පහත "Download Error Sheet" බොත්තමෙන් දෝෂ සහිත නිවාස පමණක් අඩංගු Excel ගොනුව බාගත කර නිවැරදි කර නැවත ඇතුලත් කරන්න. නිවසෙහි දෝෂය excel ගොනුවෙහි Error Message තීරුවේ දක්වා ඇත.\nSuccessfully uploaded ${successCount} houses. ${failedCount} houses had errors. Click 'Download Error Sheet' to get an Excel file with only the failed houses. Error is shown in the Error Message column in the Excel file.`);
      } else {
        setErrorMsg('ඇතුලත් කිරීමට උත්සාහ කළ සියළු දත්තවල දෝෂ පවතී. කරුණාකර දෝෂ Excel ගොනුව බාගත කර නිවැරදි කර නැවත උත්සාහ කරන්න. \nAll the houses you tried to upload have errors. Please download the error Excel file and correct it and try again.');
      }
    } else if (!hasCriticalError) {
      setSuccessMsg(`සියලුම නිවාස ${successCount} සාර්ථකව ඇතුලත් කරන ලදී! (${successCount} Houses imported successfully!)`);
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
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 font-sans">
      
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
                ප්‍රතිලාභී අංකය සහ නම අනිවාර්ය වේ. <br />
                <span className="text-slate-300">Beneficiery number and name are strictly required (*).</span>
              </p>
            </div>

            {/* Rule 2: Multiple Choice Inputs */}
            <div className="space-y-2 bg-slate-850 p-4 rounded-xl border border-slate-800/80">
              <span className="font-semibold text-indigo-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" /> Multiple Choice Option Inputs
              </span>
              <p className="text-white leading-relaxed font-sinhala">
                බහුතේරීම් තීරූ සඳහා අදාළ තීරු වලට පමණක් "YES" ලෙස ඇතුළත් කර අදාළ නොවන තීරූ හිස්ව තබන්න.
                (උදා: ඉදිකිරීම් තත්වය සදහන් කිරීමේදී, අත්තිවාරම පමණක් ඇත්නම් "අත්තිවාරම දමා ඇත" තීරුවේ YES ලෙසද, අනික් තීරූ හිස්වද තබන්න)<br />
                <span className="text-slate-300">For multiple choice columns, enter YES in relevant column and leave others blank. (Ex - When recording construction progress, if only the foundation is laid, enter YES in the "Foundation Complete" column and leave the other columns blank.)</span>
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
          <p className="text-sm text-slate-600 leading-relaxed font-sinhala">
            බාගත කරගත් Excel ගොනුවේ Row 3 සිට අලුත් නිවාස දත්ත ඇතුලත් කරන්න. (Enter new house details starting from Row 3 in Excel sheet).
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
                      <p className="text-sm text-rose-700 mt-1 font-medium leading-relaxed whitespace-pre-line">{errorMsg}</p>
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
                <div className="rounded-2xl bg-indigo-50 border border-indigo-100 p-6 space-y-4 shadow-sm">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 flex-shrink-0 mt-0.5">
                      <div className="w-5 h-5 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-indigo-900">
                        Submitting Houses (නිවාස ඇතුලත් කරමින්...) - Chunk {uploadProgress.currentChunk} of {uploadProgress.totalChunks}
                      </h3>
                      <p className="text-sm text-indigo-700 mt-1 font-medium font-sans">
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
