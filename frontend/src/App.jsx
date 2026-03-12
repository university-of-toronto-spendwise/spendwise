import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom"
import { ThemeProvider } from "./context/ThemeContext"
import Registration from "./components/Registration"
import Login from "./components/Login"
import Home from "./components/Home"
import Scholarships from "./components/Scholarships"
import Onboarding from "./components/Onboarding"
import Profile from "./components/Profile"
import MyScholarships from "./components/MyScholarships"
import { getToken, isOnboardingComplete } from "./utils/session"
import Plaid from "./components/Plaid"
import Transactions from "./components/Transactions"
import Investing from "./components/Investing"

const ProtectedRoute = ({ children }) => {
  const token = getToken();
  const location = useLocation();
  if (!token) return <Navigate to="/login" replace />;
  if (location.pathname !== "/onboarding" && !isOnboardingComplete()) {
    return <Navigate to="/onboarding" replace />;
  }
  return children;
};

const PublicRoute = ({ children }) => {
  const token = getToken();
  if (token) return <Navigate to={isOnboardingComplete() ? "/home" : "/onboarding"} replace />;
  return children;
};

export default function App() {
  return (
    <ThemeProvider>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PublicRoute><Registration /></PublicRoute>} />
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
        <Route path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />
        <Route path="/scholarships" element={<ProtectedRoute><Scholarships /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/my-scholarships" element={<ProtectedRoute><MyScholarships /></ProtectedRoute>} />
        <Route path="/transactions" element={<ProtectedRoute><Transactions /></ProtectedRoute>} />
        <Route path="/investing" element={<ProtectedRoute><Investing /></ProtectedRoute>} />
          {/* <Route path="/student-codes/deal/:id" element={<ProtectedRoute><StudentCodeDetail /></ProtectedRoute>} /> */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
    </ThemeProvider>
  )
}