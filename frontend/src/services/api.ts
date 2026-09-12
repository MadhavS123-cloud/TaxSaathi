// Mock API Service Layer

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const api = {
  extractDocument: async (_file: File) => {
    // In a real app, this would be:
    // const formData = new FormData();
    // formData.append('file', file);
    // return fetch('http://127.0.0.1:8000/api/extract', { method: 'POST', body: formData });
    
    await delay(1500); // simulate extraction time
    
    // Mock response
    return {
      success: true,
      data: {
        confidence: 'HIGH',
        classifier: 'PRINTED_INVOICE',
        issuer: {
          legalEntity: 'Swiggy (Bundl Technologies Pvt Ltd)',
          cin: 'U74110KA2013PTC096530',
          gstin: '29AAFCB2983G1ZU',
          pan: 'AAFCB2983G',
        },
        merchant: {
          tradeName: 'Meghana Foods',
          proprietor: 'Meghana Foods Pvt Ltd',
          gstStatus: 'REGISTERED',
          fssai: '11214333000192',
        },
        lineItems: [
          { id: 1, description: 'Chicken Biryani (Full)', hsn: '210690', taxableValue: 350.00, cgstRate: 2.5, cgstAmt: 8.75, sgstRate: 2.5, sgstAmt: 8.75, igstRate: 0, igstAmt: 0, gross: 367.50 },
          { id: 2, description: 'Mutton Biryani (Full)', hsn: '210690', taxableValue: 420.00, cgstRate: 2.5, cgstAmt: 10.50, sgstRate: 2.5, sgstAmt: 10.50, igstRate: 0, igstAmt: 0, gross: 441.00 },
          { id: 3, description: 'Delivery Charges', hsn: '9968', taxableValue: 40.00, cgstRate: 9, cgstAmt: 3.60, sgstRate: 9, sgstAmt: 3.60, igstRate: 0, igstAmt: 0, gross: 47.20 },
        ],
        totals: {
          taxableValue: 810.00,
          totalTax: 45.20,
          grandTotal: 855.20
        },
        validationPassed: true
      }
    };
  },

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
  }
};
