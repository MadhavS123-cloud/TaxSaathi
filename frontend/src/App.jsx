import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import CustomCursor from './components/ui/CustomCursor';
import { isAuthenticated } from './lib/api';

import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import Cases from './pages/Cases';
import UploadPage from './pages/UploadPage';
import InvoiceReviewPage from './pages/InvoiceReviewPage';
import Reconciliation from './pages/Reconciliation';
import Advisory from './pages/Advisory';
import Drafts from './pages/Drafts';
import AuditLog from './pages/AuditLog';
import ReviewApprove from './pages/ReviewApprove';

/**
 * ProtectedRoute — guards all /app/* routes.
 *
 * Checks isAuthenticated() which decodes the JWT exp claim client-side.
 * An expired or missing token redirects immediately to /login.
 * The backend still validates the JWT on every request.
 */
function ProtectedRoute({ children }) {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

function App() {
  return (
    <BrowserRouter>
      <CustomCursor />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/dashboard" element={<Navigate to="/app/dashboard" replace />} />

        <Route
          path="/app"
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="cases" element={<Cases />} />
          <Route path="cases/:caseId/upload" element={<UploadPage />} />
          <Route path="cases/:caseId/invoices/:invoiceId/review" element={<InvoiceReviewPage />} />
          {/* /app/extract — standalone upload page; prompts user to pick a case */}
          <Route path="extract" element={<UploadPage />} />
          <Route path="reconcile" element={<Reconciliation />} />
          <Route path="advisory" element={<Advisory />} />
          <Route path="drafts" element={<Drafts />} />
          <Route path="approve" element={<ReviewApprove />} />
          <Route path="audit" element={<AuditLog />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
