# Quick Run Commands - TaxSaathi

## Backend

### Start Backend Server
```bash
cd TaxSaathi/backend
python -m uvicorn main:app --reload --port 8000
```

**Output should show:**
```
INFO:     Uvicorn running on http://127.0.0.1:8000
INFO:     Application startup complete
```

### Alternative: With Venv Activation
```bash
cd TaxSaathi/backend
.\venv\Scripts\Activate.ps1
python -m uvicorn main:app --reload --port 8000
```

### Test Backend Health
```bash
curl http://127.0.0.1:8000/health
```

**Expected Response:**
```json
{"status": "ok"}
```

---

## Frontend

### Start Frontend Server (New Terminal)
```bash
cd TaxSaathi/frontend
npm run dev
```

**Output should show:**
```
Local:   http://localhost:5173/
```

### Install Dependencies (if needed)
```bash
cd TaxSaathi/frontend
npm install
```

---

## Both Running

### Terminal 1 - Backend
```bash
cd TaxSaathi/backend
python -m uvicorn main:app --reload --port 8000
```

### Terminal 2 - Frontend
```bash
cd TaxSaathi/frontend
npm run dev
```

### Terminal 3 - Browser
```
http://localhost:5173
```

---

## Testing Endpoints

### Health Check
```bash
curl http://127.0.0.1:8000/health
```

### Advisory Health
```bash
curl http://127.0.0.1:8000/api/advisory/health
```

### Extract Document
```bash
curl -X POST http://127.0.0.1:8000/api/extract \
  -F "file=@path/to/invoice.pdf"
```

### Ask Advisory Question
```bash
curl -X POST http://127.0.0.1:8000/api/advisory \
  -H "Content-Type: application/json" \
  -d '{"query":"What is GST?","top_k":3}'
```

### Reconciliation
```bash
curl -X POST http://127.0.0.1:8000/reconciliation/run \
  -F "invoice_file=@invoices.json" \
  -F "payment_file=@payments.csv" \
  -F "date_tolerance_days=3" \
  -F "amount_tolerance=1.00"
```

---

## Useful Information

### Backend URL
```
http://127.0.0.1:8000
```

### Frontend URL
```
http://localhost:5173
```

### Main Routes
- POST `/api/extract` - Extract invoice data
- POST `/reconciliation/run` - Reconcile files
- POST `/api/advisory` - Ask tax question
- GET `/api/advisory/health` - Check advisory service
- GET `/health` - Health check

---

## Common Issues & Fixes

### Port Already in Use
```bash
# Use different port
python -m uvicorn main:app --port 8001
```

### Module Not Found
```bash
# Use full python path with venv
cd TaxSaathi/backend
.\venv\Scripts\python.exe -m uvicorn main:app --port 8000
```

### Frontend Can't Find Backend
```
# Check backend is running on port 8000
curl http://127.0.0.1:8000/health

# Check frontend .env has correct API URL
# Should be: http://127.0.0.1:8000
```

---

## Complete Setup Workflow

### Step 1: Start Backend (Terminal 1)
```bash
cd TaxSaathi/backend
python -m uvicorn main:app --reload --port 8000
# Wait for "Application startup complete"
```

### Step 2: Start Frontend (Terminal 2)
```bash
cd TaxSaathi/frontend
npm run dev
# Wait for "Local: http://localhost:5173/"
```

### Step 3: Open Browser
```
http://localhost:5173
```

### Step 4: Test Features
- Go to http://localhost:5173/app/advisory → Ask tax questions
- Go to http://localhost:5173/app/reconcile → Upload and reconcile files
- Go to http://localhost:5173/app/extract → Extract from documents

---

## File Locations

Backend:
```
TaxSaathi/backend/
├── main.py
├── requirements.txt
├── .env
└── venv/
```

Frontend:
```
TaxSaathi/frontend/
├── package.json
├── src/
│   ├── App.jsx
│   ├── pages/
│   │   ├── Advisory.jsx
│   │   └── ...
│   └── services/
│       └── api.ts
└── node_modules/
```

---

## Environment Setup

### Backend .env
```
GEMINI_API_KEY=your-key-here
```

### Frontend api.ts
```typescript
const API_BASE_URL = 'http://127.0.0.1:8000';
```

---

## Verification

### All Working When:
✅ Backend starts without errors
✅ Frontend connects successfully
✅ http://127.0.0.1:8000/health returns {"status":"ok"}
✅ Frontend pages load
✅ API calls from frontend reach backend

---

## Summary

**Backend**: `python -m uvicorn main:app --reload --port 8000`
**Frontend**: `npm run dev`
**Browser**: `http://localhost:5173`

That's it! Both should be running and connected. 🚀
