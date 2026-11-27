# DataX Sprint 1 — Delegated Developer Task Handoff Packs
**Repository:** `https://github.com/harshalsawatkar/DataX.git`  
**Base Branch:** `feature/dynamic-ui` (must be at commit `95d02c8` or newer)  
**Companion Checkbook:** [`08_SPRINT1_MASTER_CHECKBOOK.md`](file:///h:/AAVIL%20Inc/DataX/DataX/docs/sprint1/08_SPRINT1_MASTER_CHECKBOOK.md)

---

## 0. Mandatory Setup & Rules (Send This First to Any Developer Joining DataX)

```bash
# 1. Clone clean repository & checkout feature/dynamic-ui ONLY
git clone https://github.com/harshalsawatkar/DataX.git
cd DataX
git checkout feature/dynamic-ui
git pull origin feature/dynamic-ui

# IMPORTANT SECURITY RULE:
# Do NOT checkout or pull `origin/main`, `origin/Raghav`, `origin/gunvanth`, or `origin/kuhu`
# until those legacy branches are reset. Always create your feature branch from `feature/dynamic-ui`:
git checkout -b feat/sprint1-wp-d1

# 2. Install & verify baseline before writing code
pip install -r backend/requirements.txt
npm ci
python -m compileall -q service.py backend tests
npm test
npm run build
```

### Engineering Ground Rules ("Zero-Fake-Code Policy")
1. **No Hardcoded Success Mocks:** Never return `success: True` or fake table/row counts when a database driver, embedding model, or external endpoint fails. Fail honestly with structured error details or require an explicit `sandbox_demo=True` flag clearly badged `[SANDBOX DEMO]` in UI.
2. **Centralized Storage Paths:** Any persistent local file MUST resolve via `from paths import DATA_DIR, data_path` ([`backend/core/paths.py`](file:///h:/AAVIL%20Inc/DataX/DataX/backend/core/paths.py)). Never write `.json` stores to repo root or `__file__` subdirectories.
3. **Zero Unbounded LLM Loops:** Never call an LLM per row. Every task below is designed so unit tests run **100% offline with ₹0 API spend**.
4. **PR Gate:** Every PR back into `feature/dynamic-ui` must pass `python -m compileall -q service.py backend tests`, `pytest -v tests/`, `npm test`, and `npm run build`.

---

## Work Pack D1 (Assign First · ~3–4 Days · Zero Merge Conflict)
### Title: *Unified Global + India DPDP 2025 PII Spine, Zero-Stub Connector Cleanup & Studio Rename*

**Why assign this first:** Completely deterministic (no OpenAI keys needed), touches isolated files, fixes our biggest technical-buyer trust gaps from [Plan 01](file:///h:/AAVIL%20Inc/DataX/DataX/docs/sprint1/01_suite_coherence_and_architecture.md) and [Plan 03](file:///h:/AAVIL%20Inc/DataX/DataX/docs/sprint1/03_market_gaps_competitors_and_innovation.md), and stays 100% out of the way of the Million-Row Sketch Engine (`Plan 05`) & DB X-Ray (`Plan 06`) track.

### Scope & Exact Deliverables

#### Task D1.1 — Frontend Bundle Secret Lock (`vite.config.js`)
- **File:** [`vite.config.js`](file:///h:/AAVIL%20Inc/DataX/DataX/vite.config.js#L6)
- **Change:** Replace `envPrefix: ['VITE_', 'PINECONE_', 'AZURE_', 'BIGQUERY_', 'DATABRICKS_', 'SALESFORCE_', 'AWS_']` with `envPrefix: ['VITE_']` so server-side `.env` cloud keys can never leak into `dist/assets/*.js`. Audit `src/` for any `import.meta.env.` usages and ensure only `VITE_*` public URLs/flags are read client-side.

#### Task D1.2 — Unified Global + India DPDP 2025 PII & Secret Engine (`backend/core/pii_classifier.py`)
Create [`backend/core/pii_classifier.py`](file:///h:/AAVIL%20Inc/DataX/DataX/backend/core/) as the **single source of truth** replacing duplicated regexes across the repo:
1. **Exact Checksum Validators (Not Naive Regexes):**
   - `is_valid_verhoeff(num_str: str) -> bool`: Full dihedral group $D_5$ multiplication/permutation checksum for **12-digit Indian Aadhaar** numbers (eliminates 90% of random 12-digit invoice/order-ID false positives!). Also reject Aadhaar starting with `0` or `1` per UIDAI spec.
   - `is_valid_pan(pan: str) -> bool`: Matches `^[A-Z]{3}[PCAFHTBLJG][A-Z][0-9]{4}[A-Z]$` (validating 4th-character taxpayer status code).
   - `is_valid_gstin(gstin: str) -> bool`: Validates 2-digit Indian state code (`01`–`38` / `97` / `99`), embedded 10-char PAN, and **Modulo-36 check digit** on character 15.
   - `is_valid_luhn(card_str: str) -> bool`: Move canonical Luhn check here from `privacy_gateway_engine.py`.
   - Additional detectors: **IFSC** (`^[A-Z]{4}0[A-Z0-9]{6}$`), **UPI VPA** (`^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$` filtered against known PSP handles `@okaxis`, `@okhdfcbank`, `@ybl`, `@paytm`, `@ibl`, `@upi`, `@apl` or column hint), **Indian Mobile** (`(?:\+91[\-\s]?)?[6-9]\d{9}`), **US SSN** (excluding `000`, `666`, `900–999`), **Email**, and **Secrets** (OpenAI, Anthropic, AWS `AKIA`, Azure key hints, GitHub PAT, Slack, JWT, DB URIs, PEM private keys).
2. **Format-Preserving Synthetic Generators (for `TokenVault`):**
   - `generate_synthetic_aadhaar(orig, seed)` $\to$ `9999-XXXX-XXXX` range or reserved test prefix preserving separator format,
   - `generate_synthetic_pan(orig, seed)` $\to$ `AAAAA9999A` format preserving 4th-char entity class,
   - `generate_synthetic_gstin(orig, seed)` $\to$ valid Mod-36 synthetic GSTIN preserving state code `orig[:2]`.
3. **Wire Existing Modules to `pii_classifier.py`:**
   - Refactor [`backend/engines/ai_firewall_engine.py`](file:///h:/AAVIL%20Inc/DataX/DataX/backend/engines/ai_firewall_engine.py), [`backend/engines/privacy_gateway_engine.py`](file:///h:/AAVIL%20Inc/DataX/DataX/backend/engines/privacy_gateway_engine.py), [`backend/engines/consensus_engine.py`](file:///h:/AAVIL%20Inc/DataX/DataX/backend/engines/consensus_engine.py), and [`backend/engines/ml_certification_engine.py`](file:///h:/AAVIL%20Inc/DataX/DataX/backend/engines/ml_certification_engine.py) to use `pii_classifier.scan_text()` / `scan_column()` while preserving 100% backward compatibility with existing response fields.
4. **Tests (`tests/test_pii_classifier.py`):**
   - Minimum **18 pytest unit tests**: valid vs invalid Verhoeff Aadhaar (verify a random 12-digit PO number is *not* misflagged as Aadhaar!), valid vs invalid Mod-36 GSTIN, PAN, IFSC, UPI, Luhn card, round-trip `TokenVault` FPE tokenization + detokenization on Hindi/English mixed prompts containing Aadhaar + PAN.

#### Task D1.3 — Honest Connectors + Real MySQL & SQL Server Drivers (`backend/connectors/connectors.py`)
- **Files:** [`backend/connectors/connectors.py`](file:///h:/AAVIL%20Inc/DataX/DataX/backend/connectors/connectors.py), [`backend/requirements.txt`](file:///h:/AAVIL%20Inc/DataX/DataX/backend/requirements.txt), new `deploy/docker-compose.test-dbs.yml`.
- **Changes:**
  1. Delete the fake catch-all `else:` block in `test_database_connection()` ([`connectors.py:179-198`](file:///h:/AAVIL%20Inc/DataX/DataX/backend/connectors/connectors.py#L179-L198)) that returns `success: True` and 6 hardcoded SAP tables for unknown/unverified engines! Return `success: False` with a clear `UNSUPPORTED_OR_UNCONFIGURED_DRIVER` error unless `demo_sandbox=True` is explicitly passed.
  2. For `sap_bw` / `s4_hana`: if `hdbcli` is not installed, return an honest status (`driverStatus: "HDBCLI_NOT_INSTALLED"`, offering an explicit *"Load Certified SAP Sandbox Dataset"* button in UI instead of claiming live SAP HANA table discovery from a raw TCP socket ping).
  3. Add **real live connectors** for **MySQL / MariaDB (`pymysql`)** and **Microsoft SQL Server (`pymssql` or `pyodbc`)** in both `test_database_connection()` and `sample_table_data()` (`INFORMATION_SCHEMA.TABLES`, exact/approx row counts, parameterized `LIMIT` / `TOP (N)` sampling).
  4. Add `deploy/docker-compose.test-dbs.yml` spinning up local `postgres:16-alpine` and `mysql:8.0` with seed SQL scripts. Start them with `docker compose -f deploy/docker-compose.test-dbs.yml up -d --wait` (host ports 55432 and 33306 by default); set `DATAX_TEST_POSTGRES_URI` and `DATAX_TEST_MYSQL_URI`, then run `python -m pytest -v tests/test_connectors_integration.py` to verify live discovery and sampling.

#### Task D1.4 — Rename Module 4 to "Schema & Migration Studio"
- **Files:** [`src/components/workflows/UseCasesSection.jsx`](file:///h:/AAVIL%20Inc/DataX/DataX/src/components/workflows/UseCasesSection.jsx), [`src/context/NavigationContext.jsx`](file:///h:/AAVIL%20Inc/DataX/DataX/src/context/NavigationContext.jsx), [`src/components/common/DataXAppShell.jsx`](file:///h:/AAVIL%20Inc/DataX/DataX/src/components/common/DataXAppShell.jsx), [`src/pages/MappingStudioPage.jsx`](file:///h:/AAVIL%20Inc/DataX/DataX/src/pages/MappingStudioPage.jsx), [`src/components/mapping/FmdTemplateGallery.jsx`](file:///h:/AAVIL%20Inc/DataX/DataX/src/components/mapping/FmdTemplateGallery.jsx).
- **Change:** Update top-level titles/labels from *"FMD Mapping & BODS Staging"* to **"Schema & Migration Studio"**, keeping URL hash `#mapping-studio` working (plus alias `#migration-studio`) and badging the SAP template as *"Certified Accelerator · SAP S/4HANA FMD → Migration Cockpit & BODS"*.

### Copy-Paste Prompt You Can Give Developer #2 (For Their AI IDE)
```text
Read docs/sprint1/07_DEVELOPER_TASK_HANDOFF_PACKS.md ("Work Pack D1") and docs/sprint1/03_market_gaps_competitors_and_innovation.md.
Implement Tasks D1.1, D1.2, D1.3, and D1.4 on a new branch `feat/sprint1-wp-d1` from `feature/dynamic-ui`:
1. Lock vite.config.js envPrefix strictly to ['VITE_'].
2. Create backend/core/pii_classifier.py with exact mathematical checksum validators for India DPDP 2025 PII (12-digit Aadhaar Verhoeff D5 checksum rejecting 0/1 prefixes, PAN 4th-char entity validation, 15-char GSTIN Modulo-36 check digit, IFSC, UPI VPA, +91 mobile) alongside Luhn credit card, US SSN, Email, and Secret patterns + format-preserving synthetic generators. Wire ai_firewall_engine.py, privacy_gateway_engine.py, consensus_engine.py, and ml_certification_engine.py to it, and write >=18 unit tests in tests/test_pii_classifier.py.
3. In backend/connectors/connectors.py, remove all fake hardcoded SAP table success responses on unconfigured engines, add real MySQL (pymysql) and SQL Server (pymssql/pyodbc) discovery + sampling, and create deploy/docker-compose.test-dbs.yml + tests/test_connectors_honesty.py.
4. Rename "FMD Mapping & BODS Staging" in UI navigation and UseCasesSection to "Schema & Migration Studio" while preserving #mapping-studio route compatibility and featuring SAP S/4HANA FMD as Certified Accelerator #1.
Verify with: python -m compileall -q service.py backend tests && pytest -v tests/test_pii_classifier.py tests/test_connectors_honesty.py && npm test && npm run build.
```

---

## Work Pack D2 (Assign Second · ~5–6 Days · Zero Merge Conflict)
### Title: *Live Customer Chatbot Endpoint Red-Team, Vulnerability Analyzer & 1-Click Virtual Patch*

**Reference Spec:** [`04_dynamic_nodes_and_endpoint_redteam_templates.md` (§2)](file:///h:/AAVIL%20Inc/DataX/DataX/docs/sprint1/04_dynamic_nodes_and_endpoint_redteam_templates.md)  
**Why this is a great standalone assignment:** Self-contained inside `backend/engines/endpoint_redteam_engine.py` + a new *"Endpoint Red-Team & Auto-Patch"* tab in `src/pages/AiFirewallPage.jsx` — zero overlap with Database/ERP files!

### Exact Deliverables
1. **Target Safety & Ownership Verifier (`backend/engines/endpoint_redteam_engine.py`):**
   - Block RFC1918 private IPs, loopback (except in local `PYTEST_CURRENT_TEST` mode), and cloud metadata `169.254.169.254` to prevent SSRF.
   - Require ownership verification before firing probes: either `X-DataX-Verify-Token` echoed by target's health header, `.well-known/datax-verify.txt`, or internal DataX sandbox target.
2. **Context-Aware Attack Suite Generator (40–80 probes across 8 categories):**
   - Accepts `company_context` (`industry`, `bot_purpose`, `allowed_tools`, `forbidden_topics`, `max_refund_limit`, `sample_policy_text`).
   - Generates deterministic + optional LLM-augmented probes covering: *(1) Direct Jailbreak & System-Prompt Leak, (2) Indirect RAG Poisoning, (3) Cross-User BOLA Leakage, (4) DPDP PII/Secret Exfiltration, (5) Excessive Tool Agency / Financial Limit Abuse, (6) Hallucinated Contractual Discounts, (7) Competitor Endorsement / Off-Topic Drift, (8) Hinglish/Multilingual Encoding Bypass*.
3. **Async Probe Runner, ASR Scorer & 1-Click Virtual Patch Compiler:**
   - Fires rate-limited (`<= 3 req/s`) single & 3-turn probes against the customer's HTTP/OpenAI-compatible endpoint.
   - Scores transcripts deterministically (leaked canary/system prompt, `pii_classifier` hit, unauthorized tool JSON, forbidden competitor match) $\to$ computes per-category **Attack Success Rate (ASR %)**.
   - **Virtual Patch Compiler:** Generates a tailored `datax_gateway_policies` configuration + hardened system-prompt diff, **re-runs every failed probe through `execute_privacy_gateway_chat()`**, and produces a SHA-256 signed **Before vs. After Remediation Report** (e.g., `ASR 37.5% -> 0.0%`).
4. **API Routes & Frontend Studio Tab:**
   - `POST /firewall/redteam/verify-target`, `POST /firewall/redteam/run`, `POST /firewall/redteam/apply-patch`.
   - New tab in [`src/pages/AiFirewallPage.jsx`](file:///h:/AAVIL%20Inc/DataX/DataX/src/pages/AiFirewallPage.jsx) + real canvas nodes in [`firewallCatalog.js`](file:///h:/AAVIL%20Inc/DataX/DataX/src/components/firewall/firewallCatalog.js).
   - Pytest suite (`tests/test_endpoint_redteam.py`) spinning up an intentionally vulnerable mock FastAPI chatbot fixture, proving the scanner catches breaches and the Virtual Patch reduces ASR to `0%`!

---

## Work Pack D3 (Optional Follow-On · ~3–4 Days · Isolated in Migration Studio)
### Title: *SAP S/4HANA Migration Cockpit XML/CSV Exporter + Unstructured PDF Spec Extractor*

**Reference Spec:** [`03_market_gaps_competitors_and_innovation.md`](file:///h:/AAVIL%20Inc/DataX/DataX/docs/sprint1/03_market_gaps_competitors_and_innovation.md) & [`04_dynamic_nodes_and_endpoint_redteam_templates.md`](file:///h:/AAVIL%20Inc/DataX/DataX/docs/sprint1/04_dynamic_nodes_and_endpoint_redteam_templates.md)
- Create `backend/engines/sap_cockpit_exporter.py` + `GET /fmd/export/migration-cockpit?object=SIF_MATERIAL` generating official S/4HANA Migration Cockpit staging sheets (`SIF_MARA`, `SIF_MAKT`, `SIF_MARC`) alongside the existing BODS `TIME_PRELOAD_*` + `Z_ERRORLOG` workbook.
- Lift the 100-line truncation cap in [`backend/governance/document_processor.py:389-402`](file:///h:/AAVIL%20Inc/DataX/DataX/backend/governance/document_processor.py#L389-L402) and extract embedded PDF/DOCX tables cleanly into structured rule candidates.

---

## Work Pack D4 (Optional Follow-On · ~3 Days · Isolated in ML Gate)
### Title: *Train/Test Split Contamination Detector + CLI / GitHub Action Certification Gate*

**Reference Spec:** [`04_dynamic_nodes_and_endpoint_redteam_templates.md` (§3.C)](file:///h:/AAVIL%20Inc/DataX/DataX/docs/sprint1/04_dynamic_nodes_and_endpoint_redteam_templates.md)
- Add `detect_train_test_contamination(train_records, eval_records)` (exact hash + normalized n-gram Jaccard near-duplicate leakage check) and `detect_label_noise()` to [`backend/engines/ml_certification_engine.py`](file:///h:/AAVIL%20Inc/DataX/DataX/backend/engines/ml_certification_engine.py).
- Create `scripts/datax_ml_gate_cli.py` returning exit code `0` (`CERTIFIED`) vs `1` (`BLOCKED`) so ML teams can run DataX dataset certification directly inside GitHub Actions / GitLab CI before launching GPU jobs.
