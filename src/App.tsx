import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { Login } from "./pages/Login";
import { Clients } from "./pages/admin/Clients";
import { AdminDashboard } from "./pages/admin/Dashboard";
import { AdminLoanDetail } from "./pages/admin/LoanDetail";
import { AdminLoans } from "./pages/admin/Loans";
import { NewLoan } from "./pages/admin/NewLoan";
import { ClientLoanView } from "./pages/client/LoanView";
import { MyLoans } from "./pages/client/MyLoans";
import { Profile } from "./pages/client/Profile";

function RootRedirect() {
  const { user, profile, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-600">
        Loading...
      </div>
    );
  }
  if (!user || !profile) return <Navigate to="/login" replace />;
  return <Navigate to={profile.role === "admin" ? "/admin" : "/my-loans"} replace />;
}

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route element={<ProtectedRoute allow="admin" />}>
            <Route element={<Layout />}>
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/clients" element={<Clients />} />
              <Route path="/admin/loans" element={<AdminLoans />} />
              <Route path="/admin/loans/new" element={<NewLoan />} />
              <Route path="/admin/loans/:id" element={<AdminLoanDetail />} />
            </Route>
          </Route>

          <Route element={<ProtectedRoute allow="client" />}>
            <Route element={<Layout />}>
              <Route path="/my-loans" element={<MyLoans />} />
              <Route path="/my-loans/:id" element={<ClientLoanView />} />
              <Route path="/profile" element={<Profile />} />
            </Route>
          </Route>

          <Route path="/" element={<RootRedirect />} />
          <Route path="*" element={<RootRedirect />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
