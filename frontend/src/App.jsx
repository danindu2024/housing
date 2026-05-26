import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

// Navigation Components
import Sidebar from './components/common/Sidebar';
import Navbar from './components/common/Navbar';

// Page Views
import LoginPage from './pages/LoginPage';
import VillageListPage from './pages/VillageListPage';
import VillageDetailPage from './pages/VillageDetailPage';
import DashboardPage from './pages/DashboardPage';
import VillageForm from './components/village/VillageForm';
import HouseForm from './components/house/HouseForm';
import LoanForm from './components/loan/LoanForm';

// Global Layout Wrapper for Authenticated Pages
const AppLayout = ({ children, title }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin" />
          <p className="text-sm font-semibold text-slate-500">Synchronizing Session...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex bg-slate-50 min-h-screen">
      {/* Dynamic Sidebar */}
      <Sidebar />

      {/* Main Main Content Container */}
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar title={title} />
        <main className="p-8 flex-1 overflow-y-auto max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Authentication page */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected Routes */}
          <Route
            path="/dashboard"
            element={
              <AppLayout title="Dashboard Analysis">
                <DashboardPage />
              </AppLayout>
            }
          />
          <Route
            path="/villages"
            element={
              <AppLayout title="Villages Directory">
                <VillageListPage />
              </AppLayout>
            }
          />
          <Route
            path="/villages/new"
            element={
              <AppLayout title="Register New Housing Village">
                <VillageForm />
              </AppLayout>
            }
          />
          <Route
            path="/villages/:id"
            element={
              <AppLayout title="Village Details & Houses Ledger">
                <VillageDetailPage />
              </AppLayout>
            }
          />

          <Route
            path="/houses/new"
            element={
              <AppLayout title="නිවාස ලේකනය - Register House">
                <HouseForm />
              </AppLayout>
            }
          />
          <Route
            path="/loans/new"
            element={
              <AppLayout title="ණය / ආටාර ලේකනය - Loan & Grant">
                <LoanForm />
              </AppLayout>
            }
          />

          {/* Catch-all Routing */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
