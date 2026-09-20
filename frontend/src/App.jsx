import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import CustomCursor from './components/ui/CustomCursor';

import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import Cases from './pages/Cases';
import UploadPage from './pages/UploadPage';
import InvoiceReviewPage from './pages/InvoiceReviewPage';
import DocumentProcessing from './pages/DocumentProcessing';
import Reconciliation from './pages/Reconciliation';
import Advisory from './pages/Advisory';
import Drafts from './pages/Drafts';
import AuditLog from './pages/AuditLog';

function App() {
  return (
    <BrowserRouter>
      <CustomCursor />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/dashboard" element={<Navigate to="/app/dashboard" replace />} />
        
        <Route path="/app" element={<AppLayout />}>
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="cases" element={<Cases />} />
          <Route path="cases/:caseId/upload" element={<UploadPage />} />
          <Route path="cases/:caseId/invoices/:invoiceId/review" element={<InvoiceReviewPage />} />
          <Route path="extract" element={<DocumentProcessing />} />
          <Route path="reconcile" element={<Reconciliation />} />
          <Route path="advisory" element={<Advisory />} />
          <Route path="drafts" element={<Drafts />} />
          <Route path="approve" element={
            <div className="max-w-6xl mx-auto">
              <h2 className="text-3xl font-serif text-ink tracking-tight mb-6">Review & Approve</h2>
              <div className="bg-paper-raised border border-hairline p-8 min-h-[400px] flex flex-col items-center justify-center">
                <h3 className="text-2xl font-serif text-ink mb-2">Coming soon</h3>
                <p className="text-ink-muted font-sans">Approval workflows will be built here.</p>
              </div>
            </div>
          } />
          <Route path="audit" element={<AuditLog />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
