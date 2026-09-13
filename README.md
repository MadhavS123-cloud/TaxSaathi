# TaxSaathi - AI-Powered Statutory Audit & Tax Reconciliation Platform

**TaxSaathi** is an intelligent web application designed for Indian Chartered Accountants, auditors, and tax professionals. It streamlines statutory audits, document OCR extractions (using Google Gemini AI), GST ledger reconciliations, and tax advisory RAG inquiries.

---

## Technical Stack

- **Frontend**: React 19 + Vite (JavaScript / TypeScript JSX)
- **Routing**: React Router DOM v7
- **Styling**: Modern CSS design system with custom tokens (`src/styles/tokens.css`, Tailwind CSS v4)
- **Icons**: Lucide React
- **Backend API**: FastAPI (Python 3.13) + Uvicorn server
- **AI Document OCR Engine**: Google Gemini AI (`gemini-3.6-flash`)
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
│                      SERVICE LAYER (src/services/api.ts)                │
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
| **Ledger Reconciliation** | `ReconcilePage.jsx` | Bank vs. GSTR-2B / Purchase ledger variance matching engine. |
| **Tax Advisory Chat** | `AdvisoryPage.jsx` | RAG-based statutory AI Q&A backed by ChromaDB tax corpus and section citations. |

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
