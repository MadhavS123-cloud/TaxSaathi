import os
import json
import mimetypes
from dotenv import load_dotenv
import google.generativeai as genai
from PIL import Image

load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    raise ValueError("GEMINI_API_KEY not found in .env file.")

genai.configure(api_key=api_key)

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

def extract_real_invoice(file_path: str):
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"File not found: {file_path}")

    print(f"\n[Processing Real Document] {file_path}")
    model = genai.GenerativeModel("gemini-3.6-flash")
    mime_type, _ = mimetypes.guess_type(file_path)

    if mime_type and mime_type.startswith("image/"):
        image = Image.open(file_path)
        response = model.generate_content([REAL_INVOICE_PROMPT, image])
    elif file_path.lower().endswith(".pdf"):
        uploaded_pdf = genai.upload_file(file_path, mime_type="application/pdf")
        response = model.generate_content([REAL_INVOICE_PROMPT, uploaded_pdf])
    else:
        with open(file_path, "rb") as f:
            data = f.read()
        response = model.generate_content([
            REAL_INVOICE_PROMPT,
            {"mime_type": mime_type or "image/jpeg", "data": data}
        ])

    # --- TOKEN USAGE TRACKING ---
    input_tokens = response.usage_metadata.prompt_token_count
    output_tokens = response.usage_metadata.candidates_token_count
    total_tokens = response.usage_metadata.total_token_count

    print("\n--- 💰 Token Usage Receipt ---")
    print(f"Input Tokens (Prompt + Image): {input_tokens}")
    print(f"Output Tokens (JSON Result): {output_tokens}")
    print(f"Total Tokens Billed: {total_tokens}")

    raw_text = response.text.strip()
    if raw_text.startswith("```json"):
        raw_text = raw_text[7:]
    if raw_text.startswith("```"):
        raw_text = raw_text[3:]
    if raw_text.endswith("```"):
        raw_text = raw_text[:-3]
    raw_text = raw_text.strip()

    try:
        parsed_data = json.loads(raw_text)
        
        # Inject the billing details directly into the response payload
        parsed_data["billing_metadata"] = {
            "input_tokens": input_tokens,
            "output_tokens": output_tokens,
            "total_tokens": total_tokens
        }
        
        return parsed_data
        
    except json.JSONDecodeError as e:
        print(f"[-] JSON Parsing error: {e}")
        return {
            "raw_output": raw_text, 
            "error": "JSONDecodeError",
            "billing_metadata": {
                "input_tokens": input_tokens,
                "output_tokens": output_tokens,
                "total_tokens": total_tokens
            }
        }

if __name__ == "__main__":
    folder = os.path.join("data", "sample_invoices")
    supported_exts = (".png", ".jpg", ".jpeg", ".pdf", ".webp")
    valid_files = [f for f in os.listdir(folder) if f.lower().endswith(supported_exts)]
    
    if valid_files:
        target_path = os.path.join(folder, valid_files[0])
        extracted_json = extract_real_invoice(target_path)
        print("\n" + "=" * 50)
        print(f"RE-EXTRACTED AUDIT JSON: {valid_files[0]}")
        print("=" * 50)
        print(json.dumps(extracted_json, indent=2))