# React Frontend Architecture
## Village & Housing Development Investigation System

---

**Document Version:** 1.0  
**Date:** May 2026  
**Stack:** React 18, React Router v6, Axios, Recharts, TailwindCSS

---

## 1. Project Structure

```
frontend/
├── public/
│   └── index.html
├── src/
│   ├── api/
│   │   ├── axios.js              # Axios instance with auth interceptor
│   │   ├── auth.js
│   │   ├── villages.js
│   │   ├── houses.js
│   │   ├── loans.js
│   │   ├── issues.js
│   │   └── dashboard.js
│   ├── components/
│   │   ├── common/
│   │   │   ├── Navbar.jsx
│   │   │   ├── Sidebar.jsx
│   │   │   ├── StatCard.jsx
│   │   │   ├── Table.jsx
│   │   │   ├── Badge.jsx
│   │   │   ├── Modal.jsx
│   │   │   └── LoadingSpinner.jsx
│   │   ├── village/
│   │   │   ├── VillageForm.jsx
│   │   │   ├── VillageCard.jsx
│   │   │   └── VillageFilters.jsx
│   │   ├── house/
│   │   │   ├── HouseForm.jsx
│   │   │   ├── HouseCard.jsx
│   │   │   └── ConstructionProgressBar.jsx
│   │   ├── loan/
│   │   │   ├── LoanForm.jsx
│   │   │   ├── LoanPaymentForm.jsx
│   │   │   ├── LoanDefaultReasonForm.jsx
│   │   │   └── LoanStatusBadge.jsx
│   │   └── charts/
│   │       ├── ConstructionFunnelChart.jsx
│   │       ├── LoanRepaymentPieChart.jsx
│   │       ├── OccupancyBarChart.jsx
│   │       └── ProblemFrequencyChart.jsx
│   ├── pages/
│   │   ├── LoginPage.jsx
│   │   ├── DashboardPage.jsx
│   │   ├── VillageListPage.jsx
│   │   ├── VillageDetailPage.jsx
│   │   ├── HouseDetailPage.jsx
│   │   ├── LoanDetailPage.jsx
│   │   ├── IssueListPage.jsx
│   │   └── LoanApproverPage.jsx    # Corruption analysis
│   ├── context/
│   │   └── AuthContext.jsx
│   ├── hooks/
│   │   ├── useVillages.js
│   │   ├── useHouses.js
│   │   └── useDashboard.js
│   ├── utils/
│   │   ├── formatters.js           # Currency, date, enum → label
│   │   └── constants.js
│   ├── App.jsx
│   └── main.jsx
├── package.json
└── tailwind.config.js
```

---

## 2. Axios Setup — `src/api/axios.js`

```js
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost/api/v1',
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 globally — redirect to login
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
```

---

## 3. API Service Modules

### `src/api/villages.js`
```js
import api from './axios';

export const getVillages = (filters = {}) =>
  api.get('/villages', { params: filters }).then(r => r.data);

export const getVillage = (id) =>
  api.get(`/villages/${id}`).then(r => r.data);

export const createVillage = (data) =>
  api.post('/villages', data).then(r => r.data);

export const updateVillage = (id, data) =>
  api.put(`/villages/${id}`, data).then(r => r.data);
```

### `src/api/loans.js`
```js
import api from './axios';

export const getLoan = (houseId) =>
  api.get(`/houses/${houseId}/loan`).then(r => r.data);

export const createLoan = (houseId, data) =>
  api.post(`/houses/${houseId}/loan`, data).then(r => r.data);

export const updateLoan = (loanId, data) =>
  api.put(`/loans/${loanId}`, data).then(r => r.data);

export const getLoanPayments = (loanId) =>
  api.get(`/loans/${loanId}/payments`).then(r => r.data);

export const addLoanPayment = (loanId, data) =>
  api.post(`/loans/${loanId}/payments`, data).then(r => r.data);

export const addDefaultReason = (loanId, data) =>
  api.post(`/loans/${loanId}/default-reason`, data).then(r => r.data);
```

### `src/api/dashboard.js`
```js
import api from './axios';

export const getDashboardSummary = () =>
  api.get('/dashboard/summary').then(r => r.data);

export const getConstructionProgress = () =>
  api.get('/dashboard/construction-progress').then(r => r.data);

export const getLoanApprovers = () =>
  api.get('/dashboard/loan-approvers').then(r => r.data);

export const getCommonProblems = () =>
  api.get('/dashboard/common-problems').then(r => r.data);
```

---

## 4. Auth Context — `src/context/AuthContext.jsx`

```jsx
import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) setUser(JSON.parse(stored));
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    localStorage.setItem('token', res.data.token);
    localStorage.setItem('user', JSON.stringify(res.data.user));
    setUser(res.data.user);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
```

---

## 5. Page Designs

### 5.1 Dashboard Page — `DashboardPage.jsx`

The dashboard is the landing page for investigators. It displays:

**Row 1 — KPI Stat Cards:**
- Total Villages (split: Loan / Grant)
- Total Houses (split: Complete / Under Construction)
- Loan Repayment Rate (% fully paid)
- Open Issues (count with severity breakdown)

**Row 2 — Charts:**
- Construction Progress (horizontal bar chart by stage — Recharts `BarChart`)
- Loan Repayment Status (pie chart — `PieChart`)
- Occupancy Status (stacked bar chart for completed houses)

**Row 3 — Tables:**
- Common Problems table with suggested solution column
- Loan Approver leaderboard (sorted by default rate) — corruption signal

```jsx
import { useEffect, useState } from 'react';
import { getDashboardSummary, getConstructionProgress,
  getLoanApprovers, getCommonProblems } from '../api/dashboard';
import StatCard from '../components/common/StatCard';
import ConstructionFunnelChart from '../components/charts/ConstructionFunnelChart';
import LoanRepaymentPieChart from '../components/charts/LoanRepaymentPieChart';

export default function DashboardPage() {
  const [summary, setSummary] = useState(null);
  const [construction, setConstruction] = useState([]);
  const [approvers, setApprovers] = useState([]);
  const [problems, setProblems] = useState([]);

  useEffect(() => {
    getDashboardSummary().then(setSummary);
    getConstructionProgress().then(setConstruction);
    getLoanApprovers().then(setApprovers);
    getCommonProblems().then(setProblems);
  }, []);

  if (!summary) return <div>Loading...</div>;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Investigation Dashboard</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard title="Total Villages" value={summary.villages.total}
          sub={`Loan: ${summary.villages.loan} | Grant: ${summary.villages.grant}`} />
        <StatCard title="Total Houses" value={summary.houses.total}
          sub={`Complete: ${summary.houses.fully_developed}`} />
        <StatCard title="Loans Defaulted" value={summary.loans.not_paid}
          sub={`Partially Paid: ${summary.loans.partially_paid}`} color="red" />
        <StatCard title="Open Issues" value={summary.open_issues} color="orange" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-6">
        <ConstructionFunnelChart data={construction} />
        <LoanRepaymentPieChart data={summary.loans} />
      </div>

      {/* Corruption Analysis Table */}
      <div>
        <h2 className="text-xl font-semibold mb-3">Loan Approver Analysis</h2>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2 text-left">Approver</th>
              <th className="p-2 text-left">Institution</th>
              <th className="p-2 text-right">Loans Approved</th>
              <th className="p-2 text-right">Total Value (LKR)</th>
              <th className="p-2 text-right">Defaulted</th>
              <th className="p-2 text-right">Default Rate</th>
            </tr>
          </thead>
          <tbody>
            {approvers.map((a, i) => (
              <tr key={i} className={a.default_rate > 30 ? 'bg-red-50' : ''}>
                <td className="p-2">{a.approved_by_name}</td>
                <td className="p-2">{a.approved_by_institution}</td>
                <td className="p-2 text-right">{a.total_loans}</td>
                <td className="p-2 text-right">{a.total_value.toLocaleString()}</td>
                <td className="p-2 text-right">{a.defaulted}</td>
                <td className="p-2 text-right font-semibold
                  {a.default_rate > 30 ? 'text-red-600' : 'text-green-600'}">
                  {a.default_rate}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Common Problems */}
      <div>
        <h2 className="text-xl font-semibold mb-3">Common Problems & Suggested Solutions</h2>
        {problems.map((p, i) => (
          <div key={i} className="border rounded p-3 mb-2 flex justify-between">
            <div>
              <span className="font-medium">{p.issue_type.replace('_', ' ')}</span>
              <span className="ml-3 text-gray-500">{p.count} occurrences</span>
            </div>
            <div className="text-sm text-blue-700 max-w-md">{p.suggested_solution}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

### 5.2 Village List Page

Features: search by name, filter by category (Loan/Grant), status, division. Card or table toggle. Each row links to Village Detail.

### 5.3 Village Detail Page

Shows village info at top, then a house list table below. House rows show:
- House number, owner name, NIC
- Construction stage progress bar (color-coded)
- Occupancy status badge
- Loan status badge (for loan villages)
- Quick action: View House / Edit

### 5.4 House Detail Page

Full house data, construction progress, loan section (if loan village), and issues list. Actions:
- Update construction stage
- Add loan payment
- Record issue

### 5.5 Loan Approver Page

Dedicated page for corruption investigation. Sortable table of all approvers with drill-down: click an approver to see all loans they approved and each loan's repayment status.

---

## 6. Construction Progress Bar Component

```jsx
const STAGES = [
  'No Foundation', 'Foundation Done', 'Lintel Done', 'Windows Done',
  'Roof Level', 'Roof Done', 'Plastering Done', 'Fully Developed'
];

export default function ConstructionProgressBar({ currentStageOrder }) {
  return (
    <div className="flex gap-1">
      {STAGES.map((label, i) => {
        const stageOrder = i + 1;
        const done = stageOrder <= currentStageOrder;
        const current = stageOrder === currentStageOrder;
        return (
          <div key={i} title={label}
            className={`h-3 flex-1 rounded-sm ${
              done
                ? current ? 'bg-blue-500' : 'bg-green-500'
                : 'bg-gray-200'
            }`}
          />
        );
      })}
    </div>
  );
}
```

---

## 7. Utility — `src/utils/formatters.js`

```js
export const formatCurrency = (amount) =>
  new Intl.NumberFormat('si-LK', { style: 'currency', currency: 'LKR' }).format(amount);

export const formatDate = (dateStr) =>
  new Date(dateStr).toLocaleDateString('en-GB');

export const loanStatusLabel = {
  NOT_PAID: 'Not Paid',
  PARTIALLY_PAID: 'Partially Paid',
  PAYING: 'Currently Paying',
  FULLY_PAID: 'Fully Paid',
};

export const loanStatusColor = {
  NOT_PAID: 'red',
  PARTIALLY_PAID: 'orange',
  PAYING: 'blue',
  FULLY_PAID: 'green',
};

export const occupancyLabel = {
  BORROWER_LIVING: 'Borrower Living',
  SOLD: 'House Sold',
  ABANDONED: 'No One / Abandoned',
  NOT_APPLICABLE: '—',
};
```

---

## 8. Package.json Dependencies

```json
{
  "dependencies": {
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "react-router-dom": "^6.23.0",
    "axios": "^1.7.0",
    "recharts": "^2.12.0",
    "@tailwindcss/forms": "^0.5.7"
  },
  "devDependencies": {
    "vite": "^5.2.0",
    "@vitejs/plugin-react": "^4.3.0",
    "tailwindcss": "^3.4.0",
    "autoprefixer": "^10.4.0"
  }
}
```

---

## 9. React Router Setup — `src/App.jsx`

```jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import VillageListPage from './pages/VillageListPage';
import VillageDetailPage from './pages/VillageDetailPage';
import HouseDetailPage from './pages/HouseDetailPage';
import IssueListPage from './pages/IssueListPage';
import LoanApproverPage from './pages/LoanApproverPage';
import Sidebar from './components/common/Sidebar';

function PrivateRoute({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" replace />;
}

function Layout({ children }) {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto bg-gray-50">{children}</main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<PrivateRoute><Layout><DashboardPage /></Layout></PrivateRoute>} />
          <Route path="/villages" element={<PrivateRoute><Layout><VillageListPage /></Layout></PrivateRoute>} />
          <Route path="/villages/:id" element={<PrivateRoute><Layout><VillageDetailPage /></Layout></PrivateRoute>} />
          <Route path="/houses/:id" element={<PrivateRoute><Layout><HouseDetailPage /></Layout></PrivateRoute>} />
          <Route path="/issues" element={<PrivateRoute><Layout><IssueListPage /></Layout></PrivateRoute>} />
          <Route path="/loan-approvers" element={<PrivateRoute><Layout><LoanApproverPage /></Layout></PrivateRoute>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
```
