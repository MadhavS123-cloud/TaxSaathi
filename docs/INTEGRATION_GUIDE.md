# TaxSaathi Backend-Frontend Integration Guide

## Quick Start

### Backend Setup (Terminal 1)

```bash
# Navigate to backend
cd TaxSaathi/backend

# Install dependencies (if not already done)
pip install -r requirements.txt

# Make sure .env has GEMINI_API_KEY
# cat .env  # Check the file

# Run backend
python -m uvicorn main:app --reload --port 8000
```

You should see:
```
Uvicorn running on http://127.0.0.1:8000
```

### Frontend Setup (Terminal 2)

```bash
# Navigate to frontend
cd TaxSaathi/frontend

# Install dependencies (if not already done)
npm install

# Run frontend
npm run dev
```

You should see:
```
Local:   http://localhost:5173/
```

### Open in Browser

1. Go to `http://localhost:5173`
2. Navigate to `/app/advisory` to test Tax Advisory
3. Navigate to `/app/reconcile` to test Reconciliation

---

## Feature Testing

### 1. Tax Advisory (POST /api/advisory)

**URL**: http://localhost:5173/app/advisory

**How to Test**:
1. Type: "What is GST and who needs to register for it?"
2. Click "Ask"
3. Expected Response:
   - Answer text
   - Confidence score (0-100%)
   - Citations with act, section, and title
   - If confidence < 70%, low-confidence badge appears

**Backend Requirement**: 
- ✅ Advisory service running
- ✅ ChromaDB with tax law corpus loaded
- ✅ Gemini API key configured

### 2. Reconciliation (POST /reconciliation/run)

**URL**: http://localhost:5173/app/reconcile

**How to Test**:
1. Upload Invoice file: `backend/data/reconciliation_samples/invoices.json`
2. Upload Payment file: `backend/data/reconciliation_samples/payments.csv`
3. Click "Run Reconciliation"
4. Expected Response:
   - Summary with totals and match rates
   - Rows showing:
     - Match type (exact, fuzzy, unmatched)
     - Confidence score
     - Invoice and payment details
     - Amount diff and date diff
     - "Needs Review" flag for low-confidence matches

### 3. Document Extraction (POST /api/extract)

**URL**: http://localhost:5173/app/extract (or through invoice review flow)

**How to Test**:
1. Upload invoice image: `TaxSaathi/data/sample_invoices/`
2. View extracted fields:
   - Vendor/supplier info
   - Line items with HSN/SAC codes
   - Tax amounts (CGST/SGST/IGST)
   - Confidence scores

---

## API Endpoints Reference

### Advisory
```
POST /api/advisory
{
  "query": "Your tax question here",
  "top_k": 3
}

GET /api/advisory/health
```

### Reconciliation
```
POST /reconciliation/run
Content-Type: multipart/form-data
invoice_file: [file]
payment_file: [file]
date_tolerance_days: 3
amount_tolerance: 1.00
```

### Extract
```
POST /api/extract
Content-Type: multipart/form-data
file: [invoice/receipt file]
```

---

## Troubleshooting

### Backend Won't Start
```
Error: GEMINI_API_KEY not found
→ Set environment variable: export GEMINI_API_KEY="your-key"

Error: ChromaDB not found
→ Run: pip install chromadb

Error: Port 8000 already in use
→ Use different port: python -m uvicorn main:app --port 8001
```

### Frontend Won't Connect
```
Error: API call fails
→ Check backend is running on http://127.0.0.1:8000
→ Check CORS headers in backend/main.py

Error: Advisory service unavailable
→ Verify ChromaDB is loaded: check data/chroma_db folder exists
→ Check Gemini API key is valid
```

### Advisory Takes Too Long
```
Timeout occurs
→ First query takes longer (model loading)
→ Subsequent queries are faster
→ If > 30s consistently, check Gemini API quota
```

---

## Environment Configuration

### Backend (.env)
```
GEMINI_API_KEY=your-api-key-here
```

### Frontend (src/services/api.ts)
```typescript
const API_BASE_URL = 'http://127.0.0.1:8000';
```

---

## Development Tips

### Hot Reload
- Backend: Changes auto-reload with `--reload` flag
- Frontend: Changes auto-reload in dev server

### Debugging
- Backend: Check console output in terminal
- Frontend: Open DevTools (F12) → Console tab
- API calls: Use `Network` tab in DevTools

### Testing with curl
```bash
# Test advisory
curl -X POST http://localhost:8000/api/advisory \
  -H "Content-Type: application/json" \
  -d '{"query":"What is GST?","top_k":3}'

# Test advisory health
curl http://localhost:8000/api/advisory/health

# Test reconciliation (with files)
curl -X POST http://localhost:8000/reconciliation/run \
  -F "invoice_file=@invoices.json" \
  -F "payment_file=@payments.csv" \
  -F "date_tolerance_days=3" \
  -F "amount_tolerance=1.00"
```

---

## Next Steps After Testing

1. ✅ Test all three features end-to-end
2. 📊 Add case management backend (database + CRUD endpoints)
3. 🔐 Implement user authentication and multi-tenancy
4. 💾 Add database persistence for cases and audit logs
5. 📦 Containerize with Docker
6. 🚀 Deploy to staging/production

---

## Support

For issues with specific features:
- **Advisory**: Check ChromaDB, Gemini API key, and corpus loading
- **Reconciliation**: Check file format (JSON/CSV/Excel), data normalization
- **Extract**: Check file type (PDF/JPG/PNG), image quality, Gemini Vision API

All three services should work together seamlessly when both backend and frontend servers are running!
