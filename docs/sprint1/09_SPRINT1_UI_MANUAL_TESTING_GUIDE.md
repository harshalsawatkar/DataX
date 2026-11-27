# DataX Sprint 1 — UI & Manual Testing Guide
**Document ID:** `DOC-S1-TEST-09`  
**Target Audience:** QA Engineers, Product Managers, Developers & Business Reviewers  
**Target Environment:** Localhost (`FastAPI :8003` + `Vite :5173`) & Staging/VM (`dataglow.ai`)  

---

## 🎯 Purpose of this Guide
This manual test guide provides step-by-step, screen-by-screen instructions to verify every deliverable shipped in **Sprint 1**. Each test scenario includes:
1. **Target UI Screen & Navigation Path**
2. **Pre-conditions & Test Data (Copy-Paste Ready)**
3. **Action Steps to Execute**
4. **Expected Result vs Bug Criteria**
5. **Pass / Fail Sign-Off Checkbox**

---

## 🚀 Environment Quick Start (Local Setup)

To test the application on your local machine, open two terminal windows:

### Terminal 1: Backend Service (`:8003`)
```powershell
cd "h:\AAVIL Inc\DataX\DataX"
python service.py
```
*Expected Output:*  
`[INFO] Uvicorn running on http://127.0.0.1:8003`

### Terminal 2: Frontend Vite Server (`:5173`)
```powershell
cd "h:\AAVIL Inc\DataX\DataX"
npm run dev
```
*Expected Output:*  
`VITE v6.x ready in ... ms`  
`➜ Local: http://localhost:5173/datax/`

Open your browser to: **`http://localhost:5173/datax/`**

---

## 📋 Test Matrix & Execution Tracker

| Test Case ID | Feature / Module | Scope | Status | Verified By |
| :--- | :--- | :--- | :---: | :---: |
| **TC-UI-01** | Frontend Security Bundle Audit | `vite.config.js` Env Isolation (S1-06) | ⬜ Pending | — |
| **TC-UI-02** | Central LLM Budget & Telemetry | Live Budget API & Health (S1-07, S1-08) | ⬜ Pending | — |
| **TC-UI-03** | Prompt Cache Zero-Token Speed | Rule Generation & FMD Ask Caching (S1-07) | ⬜ Pending | — |
| **TC-UI-04** | Row-Loop Circuit Breaker | 25-Call Threshold Enforcement (S1-07) | ⬜ Pending | — |
| **TC-UI-05** | DPDP 2025 PII Checksum Scanner | Verhoeff Aadhaar, PAN, GSTIN Mod-36 (S1-09) | ⬜ Pending | — |
| **TC-UI-06** | Zero-Egress Privacy Gateway FPE | Reversible Tokenization & Masking (S1-10) | ⬜ Pending | — |
| **TC-UI-07** | Database Connector Honesty | Real Error Handling vs Fake Green Stubs (S1-11) | ⬜ Pending | — |
| **TC-UI-08** | Multi-DB Discovery & Live Sampling | PostgreSQL & MySQL Schema Inspector (S1-12) | ⬜ Pending | — |
| **TC-UI-09** | Schema & Migration Studio UI | Navigation, SAP FMD Badges & Tabs (S1-15) | ⬜ Pending | — |
| **TC-UI-10** | 1-Click DB X-Ray & Safe Clear | Security, DQI & SQL-Grounded Advisor (S1-37..46) | ⬜ Pending | — |

---

## Detailed Step-by-Step Test Scenarios

### TC-UI-01: Frontend Security Bundle Audit (S1-06)
- **Goal:** Verify that server environment variables (`AZURE_*`, `PINECONE_*`, `AWS_*`) are never leaked into the browser JavaScript assets.
- **Steps:**
  1. Open Chrome/Edge and navigate to `http://localhost:5173/datax/`.
  2. Press `F12` to open Developer Tools.
  3. Go to the **Console** tab.
  4. Type:
     ```javascript
     console.log(import.meta.env)
     ```
  5. Press Enter and expand the resulting object.
  6. Go to the **Sources** tab $\to$ Press `Ctrl + Shift + F` (Global Search) $\to$ Search for: `AZURE_OPENAI_KEY` or `PINECONE_API_KEY`.
- **Expected Result:**
  - ✅ `import.meta.env` shows ONLY keys starting with `VITE_` (e.g. `BASE_URL`, `MODE`, `DEV`, `PROD`).
  - ✅ Global Search in Sources returns **0 matches** for server private keys or credentials.
  - ❌ **Fail if:** Any raw API key or server secret appears in the console or bundled scripts.
- [ ] **Sign-off:** Verified by `____________________` on `2026-___-___`

---

### TC-UI-02: Live LLM Budget & Telemetry Dashboard (S1-07, S1-08)
- **Goal:** Verify that daily token consumption, INR budget cap, and prompt cache hit statistics are visible and accurately calculated.
- **Steps:**
  1. Open a new browser tab or Postman.
  2. Navigate to: `http://127.0.0.1:8003/governance/llm-budget?tenant_id=default`
- **Expected Result:**
  - ✅ Returns HTTP status `200 OK` with JSON structure:
    ```json
    {
      "success": true,
      "telemetry": {
        "tenant_id": "default",
        "date": "2026-11-27",
        "daily_tokens_used": 0,
        "daily_tokens_limit": 1000000,
        "daily_cost_inr": 0.0,
        "daily_cost_inr_limit": 500.0,
        "daily_cost_usd": 0.0,
        "daily_calls_count": 0,
        "max_calls_per_request": 25,
        "budget_remaining_inr": 500.0,
        "cache": {
          "unique_prompts": 0,
          "total_cache_hits": 0
        },
        "status": "HEALTHY"
      }
    }
    ```
  - ❌ **Fail if:** Returns 404, 500, or missing `budget_remaining_inr` field.
- [ ] **Sign-off:** Verified by `____________________` on `2026-___-___`

---

### TC-UI-03: Prompt Cache Zero-Token Speed & Cost Test (S1-07)
- **Goal:** Verify that submitting the exact same rule-generation prompt twice executes instantaneously on the second run with `cached: true` and ₹0 cost deduction.
- **Steps:**
  1. Open DataX UI at `http://localhost:5173/datax/#threads`.
  2. In the Rule Synthesizer input box, enter:
     - **Table Name:** `procurement_orders`
     - **Prompt:** `Ensure total_amount is positive and vendor_id is not null.`
  3. Click **"Synthesize Rules"** (or trigger `POST /rules/generate` via Swagger at `http://127.0.0.1:8003/docs#/default/api_generate_rules_rules_generate_post`).
  4. Note the time taken (typically ~1.5s to 3s on initial call).
  5. Check `GET /governance/llm-budget`: note that `daily_calls_count` is `1` and `unique_prompts` is `1`.
  6. Click **"Synthesize Rules"** again with the **exact same prompt and table**.
  7. Observe response time: it should return almost immediately (`< 20ms`).
  8. Refresh `GET /governance/llm-budget`: `total_cache_hits` has incremented by `1`, while `daily_cost_inr` has **not increased**.
- **Expected Result:**
  - ✅ Second call returns with `"cached": true`.
  - ✅ Cache hits counter increments; token spend remains unchanged.
- [ ] **Sign-off:** Verified by `____________________` on `2026-___-___`

---

### TC-UI-04: Row-Loop Guardrail Circuit Breaker (S1-07)
- **Goal:** Verify that a rogue client or looping script attempting $>25$ LLM calls in one request session is blocked cleanly before racking up cloud costs.
- **Steps:**
  1. Run automated verification in PowerShell:
     ```powershell
     python -m pytest -v tests/test_llm_gateway.py::test_row_loop_guard_trips_on_26th_call
     ```
- **Expected Result:**
  - ✅ Calls 1 to 25 complete successfully.
  - ✅ Call 26 raises `TokenBudgetViolationError` with message:  
    `"Row-loop budget violation: Maximum 25 LLM calls exceeded for request session..."`
- [ ] **Sign-off:** Verified by `____________________` on `2026-___-___`

---

### TC-UI-05: DPDP 2025 PII Checksum Scanner (S1-09)
- **Goal:** Verify that Indian identifiers (Aadhaar, PAN, GSTIN, Mobile, IFSC) and global identifiers (Credit Card Luhn, SSN) are detected with mathematical checksum validation (0 false positives on random 12-digit order numbers).
- **Test Data for Manual Entry:**
  | Field Type | Valid Test Input (Should Flag PII) | Invalid / Non-PII Input (Should NOT Flag) |
  | :--- | :--- | :--- |
  | **Aadhaar (Verhoeff $D_5$)** | `3675 9834 6215` *(valid Verhoeff)* | `1234 5678 9012` *(invalid Verhoeff, false-positive guard)* |
  | **PAN** | `ABCDE1234F` | `ABC1234567` |
  | **GSTIN (Modulo-36)** | `29ABCDE1234F1Z5` | `99ZZZZZ9999Z9Z9` |
  | **Credit Card (Luhn)** | `4532 0150 0000 0008` | `4532 0150 0000 0009` |
  | **Indian Mobile** | `+91 9876543210` | `+1 555-0199` |
- **Steps:**
  1. In CleanFlow Canvas or AI Firewall UI, paste the valid test inputs.
  2. Click **"Scan for PII"**.
- **Expected Result:**
  - ✅ Valid Aadhaar, PAN, GSTIN, and Credit Cards are flagged with red `CRITICAL PII` badges.
  - ✅ Arbitrary 12-digit order numbers (e.g. `123456789012`) are **NOT** flagged as Aadhaar because the Verhoeff checksum fails.
- [ ] **Sign-off:** Verified by `____________________` on `2026-___-___`

---

### TC-UI-06: Database Connector Honesty (S1-11)
- **Goal:** Verify that entering bogus connection parameters displays an honest red error message instead of returning fake hardcoded tables.
- **Steps:**
  1. Open DataX UI at `http://localhost:5173/datax/#threads`.
  2. Open the **Source Database Modal** (select *PostgreSQL* or *MySQL* or *Snowflake*).
  3. Enter intentionally incorrect credentials:
     - **Host:** `fake-nonexistent-db.internal.net`
     - **User:** `bogus_user`
     - **Password:** `wrong_password_999`
  4. Click **"Test Connection"**.
- **Expected Result:**
  - ✅ The UI displays a **RED error banner**: `"Connection Failed: Could not resolve host or authentication rejected"`.
  - ✅ `success: false` is returned.
  - ❌ **Fail if:** The UI turns GREEN and shows a mock list of tables like `MARA`, `MAKT`, `KNA1`!
- [ ] **Sign-off:** Verified by `____________________` on `2026-___-___`

---

### TC-UI-07: Schema & Migration Studio UI Navigation (S1-15)
- **Goal:** Verify that the former *"FMD Mapping & BODS Staging"* module is cleanly updated to **"Schema & Migration Studio"** across the top navigation, sidebar, and landing use cases without breaking URL aliases.
- **Steps:**
  1. Open `http://localhost:5173/datax/`.
  2. Inspect the Navigation Bar / Sidebar: verify the menu item reads **"Schema & Migration Studio"**.
  3. Look for the badge: **"SAP S/4HANA FMD Accelerator"**.
  4. Directly visit URL: `http://localhost:5173/datax/#mapping-studio`.
- **Expected Result:**
  - ✅ The page loads seamlessly (route alias backwards compatible).
  - ✅ Header displays *"Schema & Migration Studio"*.
  - ✅ All template gallery cards and BODS staging buttons function without console errors.
- [ ] **Sign-off:** Verified by `____________________` on `2026-___-___`

---

### TC-UI-08: 1-Click DB X-Ray & Safe Clear Walkthrough (S1-37..S1-46)
- **Goal:** Verify the flagship 3-minute database health diagnostic and non-destructive Safe Clear compilation.
- **Steps:**
  1. Navigate to: `http://localhost:5173/datax/#db-xray`.
  2. Click **"Try Live 250k-Row Enterprise ERP Sandbox"**.
  3. Watch the 6-stage radar progress bar:
     - Stage 1: Security Posture Audit
     - Stage 2: DPDP 2025 PII Exposure
     - Stage 3: Data Quality (DQI) & Relational Integrity
     - Stage 4: 1-Click Safe DB Clear Compilation
     - Stage 5: Hypothesis Pushdown SQL Runner
     - Stage 6: Executive C-Suite Advisor
  4. Once complete, inspect the Executive Advisor scorecards.
  5. Click **"View SQL Proof"** on any metric: verify that a modal pops up showing the exact pushdown SQL query and result count.
  6. Click **"Download Safe Clear Migration SQL"**: verify that a `.sql` file downloads containing transactional quarantine tables and a matching `rollback.sql`.
- **Expected Result:**
  - ✅ Full scan finishes in $< 30$ seconds.
  - ✅ Every single rupee/dollar metric has an inspectable SQL proof drawer.
  - ✅ Safe Clear script uses transactional DDL with quarantine isolation (zero destructive drops).
- [ ] **Sign-off:** Verified by `____________________` on `2026-___-___`

---

## 🛠️ Automated Regression Execution (Pre-Release Gate)

Before signing off any release, run the following commands in sequence:
```powershell
# 1. Syntax & Python Typecheck Gate
python -m compileall -q service.py backend tests

# 2. Python Unit & Integration Tests
python -m pytest -v tests/

# 3. Frontend Unit Tests
npm test

# 4. Production Build Gate
npm run build

# 5. Secret Leakage Verification
Select-String -Path dist\assets\*.js -Pattern "AZURE_OPENAI"
```
*All 5 gates must pass with 0 errors before tagging production.*
