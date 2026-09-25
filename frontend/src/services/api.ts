const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

<<<<<<< HEAD
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const api = {
=======
export const api = {
  // Extract invoice/receipt from document
>>>>>>> 3897d796505b0e45bd4a7ccf08ec1fb22351e79b
  extractDocument: async (file: File) => {
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

<<<<<<< HEAD
  reconcileLedger: async () => {
    // return fetch('http://127.0.0.1:8000/api/reconcile', { method: 'POST' });
    await delay(1000);
    return {
      success: true,
      data: {
        metrics: {
          ledgerSum: 1450230.50,
          matchedCount: 142,
          partialMatches: 12,
          exceptionsCount: 4,
        },
        grid: [
          { id: 'REC-001', type: 'Payment', ref: 'UPI/123456789', counterparty: 'Vendor A', date: '2025-05-12', ledgerAmt: 12500.00, bankAmt: 12500.00, variance: 0, status: 'match' },
          { id: 'REC-002', type: 'Receipt', ref: 'NEFT/XYZ', counterparty: 'Client B', date: '2025-05-13', ledgerAmt: 45000.00, bankAmt: 44950.00, variance: -50.00, status: 'partial' },
          { id: 'REC-003', type: 'Payment', ref: 'IMPS/ABC', counterparty: 'Cloud Hosting', date: '2025-05-14', ledgerAmt: 8400.00, bankAmt: null, variance: -8400.00, status: 'exception' },
        ]
      }
    };
  },

  askAdvisory: async (_query: string) => {
    // return fetch('http://127.0.0.1:8000/api/advisory', { method: 'POST', body: JSON.stringify({query}) });
    await delay(1200);
    return {
      success: true,
      data: {
        reply: "Based on Sec 9(5) of the CGST Act, the e-commerce operator (Swiggy) is liable to pay tax on restaurant services provided through it. The restaurant (Meghana Foods) is not required to charge GST on these specific supplies.",
        citations: [
          { id: 'c1', label: 'CGST Act, Sec 9(5)', act: 'Central Goods and Services Tax Act, 2017', section: 'Section 9(5)', title: 'Levy and Collection', content: 'The Government may, on the recommendations of the Council, by notification, specify categories of services the tax on intra-State supplies of which shall be paid by the electronic commerce operator if such services are supplied through it...' }
        ]
      }
    };
=======
  // Reconcile invoices with bank statements
  reconcileLedger: async (invoiceFile: File, paymentFile: File, dateToleranceDays: number = 3, amountTolerance: number = 1.00) => {
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
  askAdvisory: async (query: string, topK: number = 3) => {
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
>>>>>>> 3897d796505b0e45bd4a7ccf08ec1fb22351e79b
  }
};
