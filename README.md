# TaxSaathi

**TaxSaathi** is a pre-accounting workspace for Indian Chartered Accountant firms. It drafts invoice extraction, ledger reconciliation, and statute-grounded tax answers. A CA reviews every output before it is used.

The HTTP contract is [docs/API_CONTRACT.md](docs/API_CONTRACT.md).

---

## Technical Stack

- **Frontend**: React 19 + Vite (JavaScript / TypeScript JSX)
- **Routing**: React Router DOM v7
- **Styling**: Modern CSS design system with custom tokens (`src/styles/tokens.css`, Tailwind CSS v4)
- **Icons**: Lucide React
- **Backend API**: FastAPI (Python 3.13) + Uvicorn server
- **AI Document OCR Engine**: Google Gemini. `GEMINI_MODEL_EXTRACT` and `GEMINI_MODEL_ADVISORY` both default to `gemini-3.8-flash` (see `backend/config.py`).
- **RAG & Vector Database**: ChromaDB + Gemini Embeddings

---

## High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           REACT FRONTEND (Vite)                         │
│                                                                         │
│  ┌───────────────────┐    ┌────────────────────┐   ┌─────────────────┐ │
│  │   DashboardPage   │    │     UploadPage     │   │InvoiceReviewPage│ │
│  │(New Case & Queue) │    │  (Dropzone & OCR)  │   │(Split-Screen)   │ │
│  └─────────┬─────────┘    └─────────┬──────────┘   └────────┬────────┘ │
└────────────┼────────────────────────┼───────────────────────┼───────────┘
             │                        │                       │
             ▼                        ▼                       ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      SERVICE LAYER (src/lib/api.js)                     │
└─────────────────────────────────────┬───────────────────────────────────┘
                                      │ HTTP Multipart POST /api/extract
                                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        FASTAPI BACKEND (Python)                         │
│                                                                         │
│  ┌──────────────────────────┐             ┌──────────────────────────┐  │
│  │  backend/main.py (CORS)  │ ──────────► │ backend/routes/extract.py│  │
│  └──────────────────────────┘             └────────────┬─────────────┘  │
└────────────────────────────────────────────────────────┼────────────────┘
                                                         │
                                                         ▼
                                            ┌──────────────────────────┐
                                            │backend/extract_invoice.py│
                                            │ (Gemini 3.6 Flash Engine)│
                                            └──────────────────────────┘
```

---

## Feature Matrix & Key Modules

| Module | Route / File | Description |
| :--- | :--- | :--- |
| **Case Dashboard** | `DashboardPage.jsx` | Audit engagements pipeline, dynamic metrics recalculation, live search/filtering, modal case creator. |
| **Document Upload & OCR** | `UploadPage.jsx` | Multipart drag-and-drop document queue with progress tracking and Gemini AI processing. |
| **Invoice Data Review** | `InvoiceReviewPage.jsx` | Split-screen auditor verification studio displaying real Gemini-extracted line items and tax breakdown. |
| **Ledger Reconciliation** | `Reconciliation.jsx` | Invoice vs bank/payment matching. |
| **Tax Advisory Chat** | `Advisory.jsx` | RAG answers grounded in the Income Tax Act 2025, CGST Act, and IGST Act. |

---

## Quick Start Guide

### 1. Backend Setup
```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

Ensure your `GEMINI_API_KEY` is present in `backend/.env`:
```env
GEMINI_API_KEY=your_google_gemini_api_key_here
```

Start the FastAPI backend server:
```bash
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```
- API Docs: `http://127.0.0.1:8000/docs`
- Health Endpoint: `http://127.0.0.1:8000/health`

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
- App URL: `http://127.0.0.1:5173/`

---

## Detailed Documentation

For a full file-by-file function guide, consult [`docs/ARCHITECTURE_AND_FUNCTIONS.md`](file:///c:/Users/rishi/OneDrive/Desktop/TaxSaathi/TaxSaathi/docs/ARCHITECTURE_AND_FUNCTIONS.md).
