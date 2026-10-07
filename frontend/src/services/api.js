import { API_BASE_URL } from '../config/api';

export const api = {
  // Extract invoice/receipt from document
  extractDocument: async (file) => {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_BASE_URL}/api/extract`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Extraction failed with status ${response.status}`);
      }

      return await response.json();
    } catch (err) {
      console.error('API Error in extractDocument:', err);
      return { success: false, error: String(err) };
    }
  },

  // Reconcile invoices with bank statements
  reconcileLedger: async (invoiceFile, paymentFile, dateToleranceDays = 3, amountTolerance = 1.00) => {
    try {
      const formData = new FormData();
      formData.append('invoice_file', invoiceFile);
      formData.append('payment_file', paymentFile);
      formData.append('date_tolerance_days', String(dateToleranceDays));
      formData.append('amount_tolerance', String(amountTolerance));

      const response = await fetch(`${API_BASE_URL}/reconciliation/run`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Reconciliation failed with status ${response.status}`);
      }

      return await response.json();
    } catch (err) {
      console.error('API Error in reconcileLedger:', err);
      return { success: false, error: String(err) };
    }
  },

  // Ask tax advisory question
  askAdvisory: async (query, topK = 3) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/advisory`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: query,
          top_k: topK,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Advisory query failed with status ${response.status}`);
      }

      return await response.json();
    } catch (err) {
      console.error('API Error in askAdvisory:', err);
      return { success: false, error: String(err) };
    }
  },

  // Check advisory service health
  checkAdvisoryHealth: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/advisory/health`);
      return await response.json();
    } catch (err) {
      console.error('API Error checking advisory health:', err);
      return { status: 'error', message: String(err) };
    }
  }
};
