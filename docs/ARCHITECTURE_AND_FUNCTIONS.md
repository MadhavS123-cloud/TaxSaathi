# TaxSaathi - Comprehensive Codebase & Functionality Reference

This document provides a complete file-by-file and function-by-function reference of the **TaxSaathi** codebase.

---

## 1. Backend Architecture & Functions

### `backend/main.py`
The entry point for the FastAPI backend server.
- **`app = FastAPI(title="TaxSaathi API")`**: Instantiates the FastAPI application.
- **`CORSMiddleware`**: Configures Cross-Origin Resource Sharing allowing requests from `http://localhost:5173` and `http://127.0.0.1:5173`.
- **`@app.get("/health")`**: Health check endpoint returning `{"status": "ok"}` to verify backend server status.
- **`app.include_router(extract_router)`**: Mounts `/api` routes from `routes/extract.py`.

---

### `backend/routes/extract.py`
HTTP route handler for document extraction.
- **`router = APIRouter(prefix="/api", tags=["Extract"])`**: APIRouter scoped under `/api`.
- **`@router.post("/extract")` -> `async def extract_document(file: UploadFile = File(...))`**:
  - Receives uploaded document files via HTTP multipart form data.
  - Validates `file.filename`.
  - Saves file to a temporary location using `tempfile.NamedTemporaryFile`.
  - Invokes `extract_real_invoice(tmp_path)` to execute Gemini AI OCR extractions.
  - Returns `{ "success": True, "data": parsed_json }` on success or `{ "success": False, "error": str(e) }` on error.
  - Cleans up temporary disk files in the `finally` block.

---

### `backend/extract_invoice.py`
The AI Document OCR & Forensic Extraction Engine.
- **`REAL_INVOICE_PROMPT`**: Comprehensive system prompt written for Indian Chartered Accountant statutory audits. Enforces extraction of:
  - E-commerce Section 9(5) identification (Issuer entity vs Supplier merchant).
  - Invoice numbers, dates, Order IDs, Reverse Charge applicability.
  - Line-item breakdown: particulars, HSN/SAC codes, quantities, net taxable value, CGST/SGST/IGST rates & amounts.
  - Tax summary: subtotal net taxable, total CGST/SGST/IGST, grand total, settlement status, and auditor notes.
- **`extract_real_invoice(file_path: str)`**:
  - Checks file existence on disk.
  - Detects MIME type (`image/jpeg`, `image/png`, `application/pdf`).
  - Calls Google Gemini GenerativeModel (`gemini-3.6-flash`).
  - Tracks billing metadata (input prompt tokens, output response tokens, total billed tokens).
  - Cleans code block formatting (````json...````) and parses response string into structured JSON.
  - Injects `billing_metadata` into return payload.

---

### `backend/advisory.py`
RAG-based Tax Advisory Query Engine.
- **`ChromaDB Vector Store`**: Loads pre-embedded tax statute corpus (CGST Act, Income Tax Act, Judicial Precedents).
- **`ask_tax_advisory(query: str)`**: Searches ChromaDB for relevant statute embeddings, builds context-augmented prompt for Gemini, and returns statutory advice along with section citations.

---

## 2. Frontend Architecture & Functions

### `src/services/api.ts`
The central HTTP client layer connecting React components to the FastAPI backend.
- **`API_BASE_URL`**: Reads environment variable `VITE_API_BASE_URL` (defaults to `http://127.0.0.1:8000`).
- **`api.extractDocument(file: File)`**:
  - Creates a `FormData` payload containing the file.
  - Performs an HTTP `POST` request to `${API_BASE_URL}/api/extract`.
  - Returns the JSON response containing extracted document fields and line items.
- **`api.reconcileLedger()`**: Asynchronous ledger reconciliation service helper.
- **`api.askAdvisory(query: string)`**: Asynchronous service helper for tax advisory chat query.

---

### `src/pages/DashboardPage.jsx`
Main Audit Engagements Pipeline Dashboard page.
- **`cases` State**: Stores active client cases array. Initializes from `localStorage` (`taxsaathi_cases`) or defaults to `[]`.
- **`activities` State**: Stores audit activity timeline. Initializes from `localStorage` (`taxsaathi_activities`) or defaults to `[]`.
- **`searchQuery` & `statusFilter` State**: Controls live entity search and status dropdown filtering (`ALL`, `MATCHED`, `PENDING`, `EXCEPTION`).
- **`handleCreateCase(newCaseData)`**:
  - Auto-generates assignment ID (`CAS-2024-XXX`).
  - Appends new case to `cases` state and persists to `localStorage`.
  - Logs a new event into `activities` state feed.
- **`handleClearAll()`**: Wipes active cases and activity feed from state and `localStorage`.
- **Dynamic Metric Calculations**:
  - `totalMatched`: Sum of all verified ledger entries across cases.
  - `totalExceptions`: Sum of unmatched variance exceptions.
  - `totalPending`: Sum of timing variances in transit.
  - `matchRatio`: Overall ratio calculation `(totalMatched / totalEntries) * 100`.
- **DataTable Column Rendering**: Renders Client/Scope, StatusTag, Last Updated timestamp, Reconciliation counts, and `Open` action button.

---

### `src/components/dashboard/NewCaseModal.jsx`
Interactive popup form for creating new audit client engagements.
- **State Fields**: `client`, `scope`, `gstin`, `status`, `matched`, `exception`, `pending`.
- **`handleSubmit(e)`**:
  - Validates required inputs (`client` and `scope`).
  - Calls `onCreateCase()` prop with structured engagement data.
  - Resets form state and closes modal.

---

### `src/components/dashboard/ActivityFeed.jsx`
Audit Activity Log Widget.
- Maps activity event types (`upload`, `exception`, `match`, `message`, `report`) to Lucide icons.
- Displays empty state prompt when no activities exist.

---

### `src/pages/UploadPage.jsx`
Document Upload & Ingestion Queue page.
- **`files` Queue State**: Manages list of uploaded files, their ingestion statuses (`processing`, `matched`, `exception`), confidence scores, and extracted JSON payloads.
- **`handleFilesSelected(selectedFiles)`**:
  - Iterates through selected files.
  - Invokes `api.extractDocument(file)`.
  - On success: updates document status to `matched`, stores `extractedData` payload in row state.
  - On failure: updates status to `exception` and logs error message.
- **`Review` Navigation Action**: Navigates to `/cases/:caseId/invoices/:fileId/review`, passing `extractedData` and filename in `location.state`.

---

### `src/components/upload/UploadDropzone.jsx`
File Drag-and-Drop Dropzone UI component.
- Handles `dragover`, `dragleave`, and `drop` events.
- Supports file selector input for `.pdf`, `.png`, `.jpg`, and `.webp` files.

---

### `src/pages/InvoiceReviewPage.jsx`
Split-Screen Auditor Data Verification Studio.
- **`extracted` Data Listener**: Reads `useLocation().state?.extractedData`.
- **`fields` State**: Initializes form fields (`invoiceNo`, `date`, `vendorName`, `vendorGstin`, `taxableValue`, `cgst`, `sgst`, `igst`, `totalAmount`) directly from Gemini AI extracted JSON. Fallback to default values if accessed directly.
- **`lineItems` State**: Maps line items (`particulars`, `quantity`, `net_taxable_value`, `cgst_rate`, `total_item_value`) extracted by Gemini AI into interactive data rows.
- **Split-Screen Layout**: Renders `DocumentPreview` on the left half and `FieldPanel` on the right half.

---

### `src/components/invoiceReview/DocumentPreview.jsx`
Document Viewer Component.
- Displays uploaded invoice image/PDF with bounding boxes, zoom controls, and highlight coordinates.

---

### `src/components/invoiceReview/FieldPanel.jsx`
Extracted Field Editing & Verification Panel.
- Displays key extracted metadata cards and line-items table.
- Allows auditors to edit fields and confirm extracted values before approving.

---

## 3. Data Flow Pipelines

### Document Extraction Data Pipeline

```
1. User drops PDF/Image on UploadPage.jsx
   │
   ▼
2. UploadPage calls api.extractDocument(file)
   │
   ▼
3. HTTP POST FormData to http://127.0.0.1:8000/api/extract
   │
   ▼
4. FastAPI route (extract.py) saves temp file & calls extract_real_invoice()
   │
   ▼
5. extract_invoice.py invokes Gemini 3.6 Flash model with REAL_INVOICE_PROMPT
   │
   ▼
6. Gemini returns structured JSON (Invoice #, Date, GSTIN, Line Items, CGST/SGST/IGST)
   │
   ▼
7. FastAPI returns JSON payload to frontend
   │
   ▼
8. UploadPage marks status "Extracted" & stores extractedData in file row
   │
   ▼
9. User clicks "Review" -> Navigates to InvoiceReviewPage with location.state
   │
   ▼
10. InvoiceReviewPage populates split-screen fields and line items with real AI data!
```

---

## 4. UI Components & Tokens Directory

| Component | Path | Purpose |
| :--- | :--- | :--- |
| **`PrimaryButton`** | `src/components/ui/PrimaryButton.jsx` | Dark brand primary button with brass hover state. |
| **`SecondaryButton`** | `src/components/ui/SecondaryButton.jsx` | Outline button for secondary actions. |
| **`MetricCard`** | `src/components/ui/MetricCard.jsx` | Display card for numerical metrics with mono typography and sub-labels. |
| **`DataTable`** | `src/components/ui/DataTable.jsx` | Reusable data table with custom column cell formatting and empty state support. |
| **`StatusTag`** | `src/components/ui/StatusTag.jsx` | Color-coded status badge (`matched` / forest green, `pending` / amber, `exception` / rust red). |
| **`ConfidenceBar`** | `src/components/ui/ConfidenceBar.jsx` | OCR confidence percentage indicator bar. |
| **`Sidebar`** | `src/components/layout/Sidebar.jsx` | Fixed left navigation bar with module links. |
| **`Topbar`** | `src/components/layout/Topbar.jsx` | Top header bar showing firm name, active module context, and engine status. |
