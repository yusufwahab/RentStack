import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { AppProvider } from "./context/AppContext";
import AppLayout from "./components/layouts/AppLayout";

import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/landlord/DashboardPage";
import PropertiesPage from "./pages/landlord/PropertiesPage";
import TenantsPage from "./pages/landlord/TenantsPage";
import TenantDetailPage from "./pages/landlord/TenantDetailPage";
import TenantViewPage from "./pages/landlord/TenantViewPage";
import PaymentsPage from "./pages/landlord/PaymentsPage";
import ReportsPage from "./pages/landlord/ReportsPage";
import AnalyticsPage from "./pages/landlord/AnalyticsPage";
import SettingsPage from "./pages/landlord/SettingsPage";
import TenantPortalPage from "./pages/tenant/TenantPortalPage";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppProvider>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/tenant-portal" element={<TenantPortalPage />} />

            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/properties" element={<PropertiesPage />} />
              <Route path="/tenants" element={<TenantsPage />} />
              <Route path="/tenants/:id" element={<TenantDetailPage />} />
              <Route path="/tenant-view" element={<TenantViewPage />} />
              <Route path="/payments" element={<PaymentsPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AppProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
