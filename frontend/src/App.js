import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Layout from "./components/Layout";
import { Spinner } from "./components/ui";
import Login from "./pages/Login";
import ChangePassword from "./pages/ChangePassword";
import ExecutiveDashboard from "./pages/ExecutiveDashboard";
import PersonalDashboard from "./pages/PersonalDashboard";
import Leaderboard from "./pages/Leaderboard";
import Riwayat from "./pages/Riwayat";
import Rekap from "./pages/Rekap";
import MyIncentives from "./pages/MyIncentives";
import Approval from "./pages/Approval";
import Audit from "./pages/Audit";
import Collection from "./pages/Collection";
import InputPencapaian from "./pages/admin/InputPencapaian";
import Targets from "./pages/admin/Targets";
import Incentives from "./pages/admin/Incentives";
import Users from "./pages/admin/Users";
import DataManagement from "./pages/admin/DataManagement";
import Compare from "./pages/Compare";

function Protected({ children }) {
  const { user, loading, needsReset } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><Spinner /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (needsReset) return <Navigate to="/change-password" replace />;
  return children;
}

function HomeRedirect() {
  const { user } = useAuth();
  const home = user?.jabatan === "Direktur" || user?.jabatan === "Admin" ? "/executive" : "/dashboard";
  return <Navigate to={home} replace />;
}

function Guard({ roles, children }) {
  const { user } = useAuth();
  if (roles && !roles.includes(user?.jabatan)) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <Toaster position="top-right" richColors closeButton />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/change-password" element={<ChangePassword />} />
          <Route element={<Protected><Layout /></Protected>}>
            <Route path="/" element={<HomeRedirect />} />
            <Route path="/executive" element={<Guard roles={["Direktur", "Admin"]}><ExecutiveDashboard /></Guard>} />
            <Route path="/dashboard" element={<Guard roles={["AO Pembiayaan", "AO Funding", "Collection & Remedial"]}><PersonalDashboard /></Guard>} />
            <Route path="/rekap" element={<Rekap />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/compare" element={<Guard roles={["Direktur", "Admin"]}><Compare /></Guard>} />
            <Route path="/riwayat" element={<Riwayat />} />
            <Route path="/my-incentives" element={<MyIncentives />} />
            <Route path="/collection" element={<Collection />} />
            <Route path="/approval" element={<Guard roles={["Direktur"]}><Approval /></Guard>} />
            <Route path="/audit" element={<Guard roles={["Direktur", "Admin"]}><Audit /></Guard>} />
            <Route path="/input" element={<Guard roles={["Admin"]}><InputPencapaian /></Guard>} />
            <Route path="/targets" element={<Guard roles={["Admin"]}><Targets /></Guard>} />
            <Route path="/incentives" element={<Guard roles={["Admin"]}><Incentives /></Guard>} />
            <Route path="/users" element={<Guard roles={["Admin"]}><Users /></Guard>} />
            <Route path="/data" element={<Guard roles={["Admin"]}><DataManagement /></Guard>} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
