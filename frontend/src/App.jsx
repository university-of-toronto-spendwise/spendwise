import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import Registration from "./components/Registration"
import Login from "./components/Login"
import Home from "./components/Home"
import Scholarships from "./components/Scholarships"
import Plaid from "./components/Plaid"

const ProtectedRoute = ({ children }) => {
  const token = sessionStorage.getItem("userToken");
  if (!token) return <Navigate to="/login" replace />;
  return children;
};

const PublicRoute = ({ children }) => {
  const token = sessionStorage.getItem("userToken");
  if (token) return <Navigate to="/home" replace />;
  return children;
};

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PublicRoute><Registration /></PublicRoute>} />
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />
        <Route path="/scholarships" element={<ProtectedRoute><Scholarships /></ProtectedRoute>} />
        <Route path="/transactions" element={<ProtectedRoute><Plaid /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
