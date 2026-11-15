import os
import io
import json
import base64
import mimetypes
import logging
import time
import warnings
from dotenv import load_dotenv
from google import genai
from google.genai import types
from PIL import Image

# Suppress background warnings
logging.getLogger("google").setLevel(logging.ERROR)
warnings.filterwarnings("ignore")

from config import (
    GEMINI_MODEL_EXTRACT,
    GROQ_MODEL_EXTRACT,
    gemini_api_key,
    groq_api_key,
)

load_dotenv()

# Client is created lazily at call time so a missing key does not crash startup.
_client = None


def _get_client():
    global _client
    if _client is None:
        _client = genai.Client(api_key=gemini_api_key())
    return _client


def _retryable_gemini_error(exc):
    """True for Gemini 429 and 503 responses, including wrapped causes."""
    current = exc
    seen = set()
    while current is not None and id(current) not in seen:
        seen.add(id(current))
        if getattr(current, "code", None) in (429, 503):
            return True
        if getattr(current, "status_code", None) in (429, 503):
            return True
        current = current.__cause__
    return False


def _generate_content(client, **kwargs):
    """Call generate_content up to 3 times. On 429/503, wait 1s, then 2s, then 4s before giving up."""
    waits = (1, 2, 4)
    last_error = None
    for wait in waits:
        try:
            return client.models.generate_content(**kwargs)
        except Exception as exc:
            last_error = exc
            if not _retryable_gemini_error(exc):
                raise
            time.sleep(wait)
    raise last_error

REAL_INVOICE_PROMPT = """
You are a senior Indian Chartered Accountant specializing in GST statutory audits and document forensics.
Extract all data from this invoice with extreme precision. 

CRITICAL EXTRACTION GUIDELINES:
1. ENTITY IDENTIFICATION:
   - Identify if this is a marketplace / aggregator invoice issued under Section 9(5) of the CGST Act (e.g., Zomato/Eternal, Swiggy, Amazon).
   - "issuer_platform": The entity issuing the tax invoice (found in the header or footer, e.g., Eternal Limited).
   - "supplier_merchant": The actual merchant/restaurant/vendor (e.g., Neway Cafe / Pavithra N).
   - Never assign the platform's PAN/GSTIN/CIN to the local merchant.

2. NUMERICAL & TAX PRECISION:
   - Extract Gross value, Discount, Net/Taxable value, and exact CGST/SGST/IGST amounts for each line item as printed in the table.
   - Capture line-item totals (e.g., ₹146.00 + ₹7.30 tax = ₹153.30).

3. REGULATORY METADATA:
   - Capture FSSAI license numbers, Order IDs, CIN, HSN/SAC codes, and whether reverse charge is applicable.

Return ONLY a valid JSON object matching this structure (no markdown fences, no explanatory text):
{
  "document_summary": {
    "title": "TAX INVOICE",
    "invoice_number": "string or null",
    "invoice_date": "YYYY-MM-DD",
    "order_id": "string or null",
    "is_section_9_5_ecommerce": true,
    "reverse_charge_applicable": false
  },
  "issuer_entity": {
    "legal_name": "string",
    "trade_name": "string or null",
    "gstin": "string or null",
    "pan": "string or null",
    "cin": "string or null",
    "fssai_license": "string or null"
  },
  "supplier_merchant": {
    "legal_name": "string or null",
    "trade_name": "string or null",
    "gst_status": "REGISTERED | UNREGISTERED",
    "gstin": "string or null",
    "address": "string or null",
    "fssai_license": "string or null"
  },
  "recipient_customer": {
    "name": "string or null",
    "delivery_address": "string or null",
    "place_of_supply": "string or null (e.g., Karnataka (29))"
  },
  "line_items": [
    {
      "particulars": "string",
      "hsn_sac_code": "string or null",
      "quantity": 0.0,
      "gross_value": 0.0,
      "discount": 0.0,
      "net_taxable_value": 0.0,
      "cgst_rate": "string",
      "cgst_amount": 0.0,
      "sgst_rate": "string",
      "sgst_amount": 0.0,
      "total_item_value": 0.0
    }
  ],
  "tax_summary": {
    "subtotal_net_taxable": 0.0,
    "total_cgst": 0.0,
    "total_sgst": 0.0,
    "total_igst": 0.0,
    "grand_total": 0.0,
    "amount_in_words": "string or null",
    "settlement_status": "string or null"
  },
  "auditor_notes": [
    "string list of accounting observations"
  ]
}
"""

def _parse_json_response(raw_text: str, input_tokens: int, output_tokens: int, total_tokens: int) -> dict:
    cleaned = raw_text.strip()
    if cleaned.startswith("```json"):
        cleaned = cleaned[7:]
    if cleaned.startswith("```"):
        cleaned = cleaned[3:]
    if cleaned.endswith("```"):
        cleaned = cleaned[:-3]
    cleaned = cleaned.strip()

    try:
        parsed_data = json.loads(cleaned)
        parsed_data["billing_metadata"] = {
            "input_tokens": input_tokens,
            "output_tokens": output_tokens,
            "total_tokens": total_tokens,
        }
        return parsed_data
    except json.JSONDecodeError as e:
        print(f"[-] JSON Parsing error: {e}")
        return {
            "raw_output": cleaned,
            "error": "JSONDecodeError",
            "billing_metadata": {
                "input_tokens": input_tokens,
                "output_tokens": output_tokens,
                "total_tokens": total_tokens,
            },
        }


def _retryable_groq_error(exc):
    """True for Groq 429 (rate limit) and 503 responses, including wrapped causes."""
    current = exc
    seen = set()
    while current is not None and id(current) not in seen:
        seen.add(id(current))
        status_code = getattr(current, "status_code", None) or getattr(current, "code", None)
        if status_code in (429, 503):
            return True
        err_msg = str(current).lower()
        if "429" in err_msg or "rate limit" in err_msg or "rate_limit" in err_msg or "503" in err_msg:
            return True
        current = getattr(current, "__cause__", None)
    return False


def _extract_with_groq(file_path: str) -> dict:
    from groq import Groq

    client = Groq(api_key=groq_api_key())
    mime_type, _ = mimetypes.guess_type(file_path)

    image_data_urls = []
    if file_path.lower().endswith(".pdf"):
        try:
            import pypdfium2 as pdfium
            pdf = pdfium.PdfDocument(file_path)
            first_page = pdf[0]
            pil_image = first_page.render(scale=2.0).to_pil()
            buf = io.BytesIO()
            pil_image.save(buf, format="JPEG")
            b64 = base64.b64encode(buf.getvalue()).decode("utf-8")
            image_data_urls.append(f"data:image/jpeg;base64,{b64}")
        except Exception as e:
            logging.warning("Could not render PDF with pypdfium2: %s", e)
    elif mime_type and mime_type.startswith("image/"):
        with open(file_path, "rb") as f:
            b64 = base64.b64encode(f.read()).decode("utf-8")
        actual_mime = mime_type or "image/jpeg"
        image_data_urls.append(f"data:{actual_mime};base64,{b64}")
    else:
        with open(file_path, "rb") as f:
            b64 = base64.b64encode(f.read()).decode("utf-8")
        image_data_urls.append(f"data:image/jpeg;base64,{b64}")

    content = [{"type": "text", "text": REAL_INVOICE_PROMPT}]
    for url in image_data_urls:
        content.append({"type": "image_url", "image_url": {"url": url}})

    waits = (1, 2, 4)
    last_error = None
    response = None
    for wait in waits:
        try:
            response = client.chat.completions.create(
                model=GROQ_MODEL_EXTRACT,
                messages=[{"role": "user", "content": content}],
                response_format={"type": "json_object"},
                temperature=0.1,
            )
            break
        except Exception as exc:
            last_error = exc
            if not _retryable_groq_error(exc):
                raise
            time.sleep(wait)
    if response is None:
        raise last_error

    input_tokens = response.usage.prompt_tokens if response.usage else 0
    output_tokens = response.usage.completion_tokens if response.usage else 0
    total_tokens = response.usage.total_tokens if response.usage else 0

    print("\n--- Token Usage Receipt (Groq) ---")
    print(f"Input Tokens: {input_tokens}")
    print(f"Output Tokens: {output_tokens}")
    print(f"Total Tokens Billed: {total_tokens}")

    raw_text = response.choices[0].message.content.strip()
    return _parse_json_response(raw_text, input_tokens, output_tokens, total_tokens)


def _extract_with_gemini(file_path: str) -> dict:
    mime_type, _ = mimetypes.guess_type(file_path)
    c = _get_client()

    config = types.GenerateContentConfig(response_mime_type="application/json")

    if mime_type and mime_type.startswith("image/"):
        with Image.open(file_path) as image:
            response = _generate_content(
                c,
                model=GEMINI_MODEL_EXTRACT,
                contents=[REAL_INVOICE_PROMPT, image],
                config=config,
            )
    elif file_path.lower().endswith(".pdf"):
        uploaded_pdf = c.files.upload(file=file_path)
        while uploaded_pdf.state.name == "PROCESSING":
            time.sleep(2)
            uploaded_pdf = c.files.get(name=uploaded_pdf.name)
        response = _generate_content(
            c,
            model=GEMINI_MODEL_EXTRACT,
            contents=[REAL_INVOICE_PROMPT, uploaded_pdf],
            config=config,
        )
    else:
        uploaded_file = c.files.upload(file=file_path)
        while uploaded_file.state.name == "PROCESSING":
            time.sleep(2)
            uploaded_file = c.files.get(name=uploaded_file.name)
        response = _generate_content(
            c,
            model=GEMINI_MODEL_EXTRACT,
            contents=[REAL_INVOICE_PROMPT, uploaded_file],
            config=config,
        )

    input_tokens = response.usage_metadata.prompt_token_count
    output_tokens = response.usage_metadata.candidates_token_count
    total_tokens = response.usage_metadata.total_token_count

    print("\n--- Token Usage Receipt (Gemini) ---")
    print(f"Input Tokens (Prompt + Image): {input_tokens}")
    print(f"Output Tokens (JSON Result): {output_tokens}")
    print(f"Total Tokens Billed: {total_tokens}")

    raw_text = response.text.strip()
    return _parse_json_response(raw_text, input_tokens, output_tokens, total_tokens)


def extract_real_invoice(file_path: str):
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"File not found: {file_path}")

    print(f"\n[Processing Real Document] {file_path}")

    groq_key = os.getenv("GROQ_API_KEY", "").strip()
    gemini_key = os.getenv("GEMINI_API_KEY", "").strip()

    if groq_key:
        return _extract_with_groq(file_path)
    elif gemini_key:
        return _extract_with_gemini(file_path)
    else:
        raise RuntimeError(
            "No LLM API key configured. Please set GROQ_API_KEY in your environment."
        )

if __name__ == "__main__":
    base_dir = os.path.dirname(os.path.abspath(__file__))
    folder = os.path.join(base_dir, "..", "data", "sample_invoices")
    supported_exts = (".png", ".jpg", ".jpeg", ".pdf", ".webp")
    valid_files = [f for f in os.listdir(folder) if f.lower().endswith(supported_exts)]
    
    if valid_files:
        target_path = os.path.join(folder, valid_files[0])
        extracted_json = extract_real_invoice(target_path)
        print("\n" + "=" * 50)
        print(f"RE-EXTRACTED AUDIT JSON: {valid_files[0]}")
        print("=" * 50)
        print(json.dumps(extracted_json, indent=2))