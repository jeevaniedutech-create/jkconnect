import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import StudentDashboard from "./pages/StudentDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import { Toaster } from "@/components/ui/sonner";
import { getSession } from "./lib/auth";

function Protected({ role, children }: { role: "admin" | "student"; children: React.ReactElement }) {
  const s = getSession();
  if (!s) return <Navigate to="/" replace />;
  if (s.role !== role) return <Navigate to={s.role === "admin" ? "/admin" : "/student"} replace />;
  return children;
}

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/student" element={<Protected role="student"><StudentDashboard /></Protected>} />
        <Route path="/admin" element={<Protected role="admin"><AdminDashboard /></Protected>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster position="top-center" richColors />
    </>
  );
}
