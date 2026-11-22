# TaxSaathi

**TaxSaathi** is a pre-accounting desk for Indian Chartered Accountant firms. It reads invoices, matches them to the bank, and answers tax questions only from the statute it retrieved. A CA reviews every output before it is used. Amounts are calculated in code, not by a language model.

A file-by-file guide is [docs/ARCHITECTURE_AND_FUNCTIONS.md](docs/ARCHITECTURE_AND_FUNCTIONS.md).

---

## Technical stack

- **Frontend:** React 19, Vite, React Router, Tailwind CSS v4, Lucide
- **Backend:** FastAPI, Pydantic, Uvicorn (Python 3.13+)
- **Auth:** Email and password, JWT. The first account in a firm is the admin.
- **Database:** SQLite at `data/app.db` when `DATABASE_URL` is empty. PostgreSQL when it is set.
- **Invoice reading:** Groq vision (`GROQ_MODEL_EXTRACT`, default `qwen/qwen3.8-27b`) when `GROQ_API_KEY` is set. Gemini is the fallback.
- **Tax answers:** Groq (`GROQ_MODEL_ADVISORY`, default `openai/gpt-oss-20b`) over a Chroma index of the Income Tax Act 2025, the CGST Act, and the IGST Act. If those sections are not retrieved, TaxSaathi says the corpus does not contain the answer.

---

## Desk

| Section | Route | What it does |
| :--- | :--- | :--- |
| Case dashboard | `/app/dashboard` | Engagements, match totals, and activity. Match totals come from the reconciliation report: full, fuzzy, and partial rows count as matched; unpaid invoices and leftover payments count as exceptions. A scanned file is not treated as a matched payment. |
| Document upload | `/app/extract`, `/app/cases/:id/upload` | PDF, JPG, or PNG. The scan is stored and the fields are read in the same request. |
| Invoice review | `/app/cases/:id/invoices/:id/review` | Split view. The scan is loaded again from the server, so a refresh still shows the file. |
| Ledger reconciliation | `/app/reconcile` | Invoice file against a bank or payment file (CSV or Excel). |
| Tax advisory | `/app/advisory` | Questions answered only from retrieved sections. |
| Client communication | `/app/drafts` | A plain-language note queued for review. It is not sent. |
| Review and approve | `/app/approve` | CA decision on failed reads, unmatched rows, and drafts. |
| Audit trail | `/app/audit` | Ordered record of uploads, matches, notes, and decisions. |
| Voice desk | On the reconciliation page | Hindi or English questions about partly paid invoices. The spoken amount is the ledger total. |

Unknown addresses show a missing-page screen instead of a blank document. A wrong password is reported as a wrong password. "Session expired" is only for a signed-in request that the server rejected.

---

## Reconciliation

Matching runs in four steps. A unique invoice number settles first. The same amount on the same date follows. A near amount within a few days is next. Whatever is left can be a partial (several payments against one invoice) or an exception for a person.

Two lookups keep a large book fast:

- Payments are indexed by invoice number, so a partial does not scan the whole bank file.
- Payments are sorted by date, so the 30-day partial window is a slice of that list, not another full scan. At most 12 nearby payments are considered, in groups of 2 to 4.

On a 10,000-invoice book (11,500 payments) the match step is about a quarter of a second on a developer machine, with the same totals as the slower scan. The public server is a smaller machine, so the same book takes longer there, but the repeated full-file scan is what this removes.

Clearing every case also removes the review notes and advisory messages that belong to those cases, then the cases themselves.

---

## Quick start

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

Copy `.env.example` to `.env` and set at least:

```env
JWT_SECRET=generate_a_long_random_secret
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL_EXTRACT=qwen/qwen3.8-27b
GROQ_MODEL_ADVISORY=openai/gpt-oss-20b
```

`GEMINI_API_KEY` is optional. Leave `DATABASE_URL` empty to use SQLite.

```bash
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

- API docs: `http://127.0.0.1:8000/docs`
- Health: `http://127.0.0.1:8000/health`

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The app is at `http://127.0.0.1:5173/`. `frontend/.env` should contain `VITE_API_URL=http://localhost:8000` for local work.

### Tests

From `backend`, with the virtualenv active:

```bash
python -m pytest tests/test_reconciliation.py tests/test_recon_counts.py -q
```
