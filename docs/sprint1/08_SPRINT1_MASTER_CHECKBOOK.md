# DataX Sprint 1 — Sequential Master Checkbook
**How to Use:** Tick each box (`- [ ]` $\to$ `- [x]`) strictly in sequence as tasks pass their **Verification Gate**.  
**Owner Legend:**
- **`[Core]`** — Primary Architecture Track (Plans 02, 05, 06: LLM Cost Gateway, Local Embeddings/Hybrid RAG, 1M-Row Sketch Engine, 1-Click DB X-Ray & Clear)
- **`[Dev-2: WP-D1..D4]`** — Delegated Developer Track (see [`07_DEVELOPER_TASK_HANDOFF_PACKS.md`](file:///h:/AAVIL%20Inc/DataX/DataX/docs/sprint1/07_DEVELOPER_TASK_HANDOFF_PACKS.md) — zero file collisions with `[Core]`)

---

## 📊 Phase Progress Tracker

| Phase | Milestone Name | Plans Covered | Tasks | Status | Completed Date |
| :---: | :--- | :---: | :---: | :---: | :---: |
| **0** | Repo Hygiene, Remote Branch Cleanup & VM Deploy Auth | Pre-Sprint | `S1-01` – `S1-05` | ⏳ In Progress (`2/5`) | — |
| **1** | Cost Circuit Breakers, DPDP PII Spine & Zero-Stub Cleanup | Plans `01, 02, 03` | `S1-06` – `S1-17` | ⏳ In Progress (`6/12`) | — |
| **2** | Shared AI Substrate: Local ONNX Embeddings, `pgvector` Hybrid RAG & LangGraph | Plan `02` | `S1-18` – `S1-26` | ⬜ Pending | — |
| **3** | 5-Tier Million-Row & Multi-Table Zero-Token Intelligence Engine | Plan `05` | `S1-27` – `S1-36` | ⬜ Pending | — |
| **4** | Flagship MVP #1: "1-Click DB X-Ray, Safe Clear & Executive Advisor" | Plan `06` | `S1-37` – `S1-46` | ⬜ Pending | — |
| **5** | Flagship MVP #2: Real DAG Runtime & Live Chatbot Endpoint Red-Team + Patch | Plan `04` | `S1-47` – `S1-55` | ⬜ Pending | — |
| **6** | Schema & Migration Studio Expansion, Benchmarks & Compliance Pack | Plans `01, 03, 04` | `S1-56` – `S1-60` | ⬜ Pending | — |

---

## Phase 0 — Repo Hygiene, Branch Safety & VM Deploy Access
*Goal: Ensure every branch and CI/CD pipeline is clean, safe, and reproducible before feature velocity ramps up.*

- [x] **S1-01** `[Core]` Refactor flat root repository into modular `backend/{core,engines,pipeline,security,connectors,governance,models}`, `tests/`, `docs/`, `deploy/`, `data/` with central [`paths.py`](file:///h:/AAVIL%20Inc/DataX/DataX/backend/core/paths.py).  
  *Gate:* `python -m compileall -q service.py backend tests` + 225 FastAPI routes verified (`d22ffe6`, `2d20379`).
- [x] **S1-02** `[Core]` Overwrite leftover Nov 20 PolinRider commit on `feature/dynamic-ui` and fix GitHub Actions Node 22 + Python compile gates.  
  *Gate:* GitHub Actions `Backend Quality Gate` ✅ & `Frontend Quality Gate` ✅ passing on `95d02c8`.
- [ ] **S1-03** `[Core]` Clean or reset `origin/main` (`9068f13`) and stale branches (`origin/Raghav`, `origin/gunvanth`, `origin/kuhu`) so no branch on GitHub retains the Nov 20 `init` / `tailwind.config.js` payload.  
  *Gate:* `git ls-tree origin/main init` returns empty across all active remote branches.
- [ ] **S1-04** `[Core]` Generate fresh ED25519 SSH keypair (or update rotated VM password) for `azureuserSDH@20.193.248.164` and update GitHub Repo Secrets (`AZURE_VM_SSH_KEY` / `AZURE_VM_PASSWORD`).  
  *Gate:* GitHub Actions `Zero-Downtime Deployment to Azure VM` job turns green + `free -h && lscpu` recorded.
- [ ] **S1-05** `[Core]` Record exact Azure VM RAM/vCPU limits and adjust readiness RSS cap in [`backend/service.py:257`](file:///h:/AAVIL%20Inc/DataX/DataX/backend/service.py#L257) if VM RAM $\ge 4\text{ GB}$.  
  *Gate:* `GET https://dataglow.ai/datax-api/ready` returns `200 OK`.

---

## Phase 1 — Cost Protection, DPDP 2025 PII Spine & Zero-Stub Honesty
*Goal: Guarantee Azure Foundry bills can never spike again, unify PII/security math, and eliminate every fake `Success!` stub (`[Core]` + `[Dev-2: WP-D1]` can run in parallel).*

- [x] **S1-06** `[Dev-2: WP-D1]` Lock [`vite.config.js`](file:///h:/AAVIL%20Inc/DataX/DataX/vite.config.js#L6) `envPrefix` strictly to `['VITE_']` so `AZURE_*` / `AWS_*` / `PINECONE_*` server env vars never bundle into client JS.  
  *Gate:* `npm run build` succeeds and `Select-String -Path dist\assets\*.js -Pattern "AZURE_OPENAI"` returns 0 matches.
- [x] **S1-07** `[Core]` Build centralized **`backend/core/llm_gateway.py`** wrapping all LLM calls with: (a) per-tenant daily token & INR/USD hard cap, (b) `TokenBudgetViolationError` blocking $>25$ calls/request (row-loop guard), and (c) SQLite/Postgres content-addressed prompt cache.  
  *Gate:* `pytest tests/test_llm_gateway.py` verifies cache hit = `0` tokens and 26th loop call trips breaker cleanly.
- [x] **S1-08** `[Core]` Route all direct `AzureOpenAI` calls in [`backend/service.py`](file:///h:/AAVIL%20Inc/DataX/DataX/backend/service.py) and [`backend/engines/fmd_mapping_engine.py`](file:///h:/AAVIL%20Inc/DataX/DataX/backend/engines/fmd_mapping_engine.py) through `llm_gateway.py` and expose `GET /governance/llm-budget` telemetry.  
  *Gate:* `Select-String -Path backend\**\*.py -Pattern "AzureOpenAI\("` appears ONLY inside `llm_gateway.py`.
- [x] **S1-09** `[Dev-2: WP-D1]` Create **`backend/core/pii_classifier.py`** with exact checksum validators: **Aadhaar 12-digit Verhoeff $D_5$**, **PAN**, **GSTIN Modulo-36**, **IFSC**, **UPI VPA**, **+91 Mobile**, **Credit Card Luhn**, **US SSN**, **Email**, and **API Secrets**.  
  *Gate:* `pytest tests/test_pii_classifier.py` passes $\ge 18$ positive & negative checksum tests (0 false positives on 12-digit order IDs).
- [x] **S1-10** `[Dev-2: WP-D1]` Add Format-Preserving Encryption (FPE) synthetic generators for Indian PII (`Aadhaar`, `PAN`, `GSTIN`) into [`privacy_gateway_engine.py`](file:///h:/AAVIL%20Inc/DataX/DataX/backend/engines/privacy_gateway_engine.py) `TokenVault` and wire `ai_firewall_engine.py`, `consensus_engine.py`, and `ml_certification_engine.py` to `pii_classifier.py`.  
  *Gate:* Round-trip tokenize $\to$ detokenize test passes on mixed English/Hindi prompts + `tests/egress_block_test.py` passes 6/6.
- [x] **S1-11** `[Dev-2: WP-D1]` Purge fake connector success responses in [`backend/connectors/connectors.py:158-198`](file:///h:/AAVIL%20Inc/DataX/DataX/backend/connectors/connectors.py#L158-L198) so unconfigured/bogus credentials return honest `success: False` errors instead of hardcoded SAP tables.  
  *Gate:* `pytest tests/test_connectors_honesty.py` confirms bogus Snowflake/MySQL/SAP hosts return `success == False`.
- [ ] **S1-12** `[Dev-2: WP-D1]` Implement real **MySQL (`pymysql`)** and **SQL Server (`pymssql`/`pyodbc`)** table discovery & parameterized sampling in `connectors.py` + `studio_io_engine.py`, with `deploy/docker-compose.test-dbs.yml`.  
  *Gate:* Live discovery + 25-row sample verified against Dockerized Postgres 16 & MySQL 8 containers.
- [ ] **S1-13** `[Core]` Install & wire [`langgraph-consensus-guard`](file:///h:/AAVIL%20Inc/DataX/langgraph-consensus-guard/README.md) (`Layer1MetricResult`, `DomainAgentVote`, `ConsensusVerdict` with $\pm 2.5$ anchoring & graded breach caps) replacing inline [`consensus_engine.py`](file:///h:/AAVIL%20Inc/DataX/DataX/backend/engines/consensus_engine.py) duplicates.  
  *Gate:* `pytest` verifies LLM score `9.5` on a `5.0` Layer-1 dataset is mathematically clamped to `7.5`, and unmasked Aadhaar/SSN caps score at `<= 2.0` (`SUSPENDED`).
- [ ] **S1-14** `[Core]` Create unified Merkle-chained audit table `datax_unified_audit_ledger` (tagged by `module: DB_ERP | MIGRATION | ML_GATE | AI_FIREWALL`, `tenant_id`, `actor`, `sha256_prev`, `sha256_curr`) bridging the 5 fragmented audit stores.  
  *Gate:* `GET /governance/audit/verify` validates unbroken hash chain across events from all 4 modules.
- [ ] **S1-15** `[Dev-2: WP-D1]` Rename *"FMD Mapping & BODS Staging"* across UI (`UseCasesSection.jsx`, `NavigationContext.jsx`, `DataXAppShell.jsx`, `MappingStudioPage.jsx`, `FmdTemplateGallery.jsx`) to **"Schema & Migration Studio"** while keeping `#mapping-studio` route alias & SAP S/4HANA FMD Accelerator badge.  
  *Gate:* `npm test && npm run build` pass with 0 broken links.
- [ ] **S1-16** `[Core]` Define versioned HTTP client contract (`backend/connectors/dataglow_client.py`) for optional microservice calls between **DataX (`:8003`)** and **DataGlow / `nexlayer-backend` (`:8000`)** with circuit-breaker fallback when DataGlow is offline.  
  *Gate:* Contract test passes both with mocked `:8000` response and graceful standalone fallback.
- [ ] **S1-17** `[Core]` **Phase 1 Checkpoint Review:** Merge `feat/sprint1-wp-d1`, run full regression suite, push to `feature/dynamic-ui`.  
  *Gate:* All CI checks green.

---

## Phase 2 — Shared AI Substrate: Local Embeddings, `pgvector` Hybrid RAG & Real Harness
*Goal: Replace every fake embedding/RAG/agent stub identified in [Plan 02](file:///h:/AAVIL%20Inc/DataX/DataX/docs/sprint1/02_rag_harness_ingestion_embedding_pipeline.md) with real, ₹0-API-cost local CPU ONNX + PostgreSQL hybrid search.*

- [ ] **S1-18** `[Core]` Research Spike: Benchmark `fastembed` (`BAAI/bge-small-en-v1.5`, 384-dim ONNX CPU) startup time, RAM footprint, and throughput (chunks/sec) on local + VM profile.  
  *Gate:* Benchmark note saved; throughput $\ge 200$ texts/sec on CPU, RAM delta $< 250\text{ MB}$.
- [ ] **S1-19** `[Core]` Build **`backend/ai_substrate/embedder.py`** (local `fastembed` ONNX default + optional BYOK `text-embedding-3-small` via `llm_gateway.py`) and replace the SHA-256 hash stub in `POST /v1/embeddings` ([`service.py:2157`](file:///h:/AAVIL%20Inc/DataX/DataX/backend/service.py#L2157)).  
  *Gate:* Cosine similarity test proves `sim("hydraulic pump", "centrifugal pump") > 0.75` while `sim("hydraulic pump", "quarterly tax return") < 0.35`.
- [ ] **S1-20** `[Core]` Build structure-aware chunker (`backend/ai_substrate/chunker.py`) preserving Markdown headings, PDF page/table blocks, DOCX sections, and Excel `Sheet › Row` lineage metadata; lift the 100-chunk cap in [`document_processor.py:402`](file:///h:/AAVIL%20Inc/DataX/DataX/backend/governance/document_processor.py#L402).  
  *Gate:* 50-page PDF with embedded mapping tables chunks cleanly without slicing table rows mid-cell.
- [ ] **S1-21** `[Core]` Build **`backend/ai_substrate/hybrid_store.py`** using PostgreSQL `pgvector` (HNSW cosine index) + PostgreSQL Full-Text Search (`tsvector` BM25) fused via **Reciprocal Rank Fusion (RRF)**, with in-memory DuckDB cosine + BM25 fallback when `pgvector` extension isn't installed locally.  
  *Gate:* Retrieval test finds both exact SAP codes (`BAPI_PO_CREATE1`, `0PUR_C01`) AND semantic paraphrases at Top-3 recall $\ge 90\%$.
- [ ] **S1-22** `[Core]` Wire AI Firewall `vector_sink` & `scan_rag_batch` ([`ai_firewall_engine.py:353`](file:///h:/AAVIL%20Inc/DataX/DataX/backend/engines/ai_firewall_engine.py#L353)) to compute real embeddings on `VERIFIED` / `REDACTED_PASS` chunks and persist to `hybrid_store`.  
  *Gate:* Quarantined prompt-injection chunks are provably excluded from vector retrieval results.
- [ ] **S1-23** `[Core]` Replace CleanFlow's stubbed `vector_matcher` node ([`pipeline.py:161`](file:///h:/AAVIL%20Inc/DataX/DataX/backend/pipeline/pipeline.py#L161)) with **Distinct-Value Entity Clustering** (embeds unique vendor/plant/customer strings only, clusters cosine $\ge 0.86$, maps canonical IDs back to all rows).  
  *Gate:* 10,000 rows containing 150 messy vendor name variants deduplicate accurately in $< 2\text{s}$ with ₹0 cloud API cost.
- [ ] **S1-24** `[Core]` Replace CleanFlow's stubbed `rag` node ([`pipeline.py:175`](file:///h:/AAVIL%20Inc/DataX/DataX/backend/pipeline/pipeline.py#L175)) and upgrade Migration Studio `POST /fmd/ask` to retrieve from uploaded PDF/DOCX/PPTX reference specs via `hybrid_store` with exact `File › Page/Sheet › Row` citations.  
  *Gate:* Uploading `TIME_R3.2_Material_Master_Mapping_Rules_Spec.txt`/PDF and calling `/fmd/ask` returns grounded citations from both Excel FMDs and the unstructured spec.
- [ ] **S1-25** `[Core]` Replace scripted [`backend/agent_harness.py`](file:///h:/AAVIL%20Inc/DataX/DataX/backend/agent_harness.py) with a real **LangGraph `StateGraph` Harness** supporting tool registration, SSE step streaming, `checkpointer.py` persistence, and HITL `interrupt()` pause/resume.  
  *Gate:* End-to-end LangGraph run executes real tools, pauses on HITL threshold, and resumes cleanly upon approval.
- [ ] **S1-26** `[Core]` **Phase 2 Checkpoint Review:** Run RAGAS / retrieval precision evals + full backend/frontend test gates.

---

## Phase 3 — Million-Row & Multi-Table Zero-Token Intelligence Engine (`Plan 05`)
*Goal: Analyze 1M–100M+ row multi-table ERPs with $O(\text{columns})$ LLM tokens (`<13k` tokens total) and `<350 MB` constant RAM.*

- [ ] **S1-27** `[Core]` Add `sqlglot` to `backend/requirements.txt` and build **`backend/db_xray/sql_guard.py`** — AST validator enforcing read-only `SELECT` aggregates, blocking DDL/DML/`SELECT *` row dumps, injecting `LIMIT 20`, and setting `READ ONLY` + `statement_timeout = 5000ms`.  
  *Gate:* Unit tests prove `DROP`, `UPDATE`, `SELECT * FROM users`, and stacked `;` queries are 100% blocked before DB execution.
- [ ] **S1-28** `[Core]` Build **Tier 0 Catalog & Optimizer Stats Harvester (`backend/db_xray/catalog_harvester.py`)** extracting tables, columns, PKs, FKs, indexes, role privileges, and planner stats (`pg_stats` / `information_schema`) in `< 100ms` with 0 table scan.  
  *Gate:* Extracts full metadata + histograms from a 20-table Postgres schema in `< 100ms`.
- [ ] **S1-29** `[Core]` Build **Tier 1 Dialect-Transpiled Pushdown Sketch Profiler (`backend/db_xray/sketch_profiler.py`)** using `sqlglot` (Postgres, MySQL, MSSQL, DuckDB) to compute single-pass nulls, negatives, zeros, distinct counts, quantiles (`p01..p99`), and regex pattern counts in-DB (with `TABLESAMPLE` option above 10M rows).  
  *Gate:* 1,000,000-row table profiled in `< 2.5s` pulling `< 5 KB` over the wire and `0` LLM tokens.
- [ ] **S1-30** `[Core]` Build **Tier 2 Multi-Table Join & Implicit FK Graph Engine (`backend/db_xray/join_graph.py`)** combining physical FKs + **pushdown MinHash ($k=128$) Jaccard containment** + `fastembed` column-name similarity + exact orphan-key SQL counter.  
  *Gate:* Recovers $\ge 95\%$ of true joins (`MARA↔MAKT↔MARC`, `EKKO↔EKPO`) on a keyless SAP test schema and reports exact orphan counts.
- [ ] **S1-31** `[Core]` Build **Tier 3 Structural Shape Masker (`backend/db_xray/shape_masker.py`)** converting boundary/sample values into privacy-safe shape masks (`"4532-..." -> "dddd-dddd-dddd-dddd [LUHN_CARD]"`), and remove raw `sampleRows[:3]` leakage in [`service.py:1212`](file:///h:/AAVIL%20Inc/DataX/DataX/backend/service.py#L1212).  
  *Gate:* Zero raw PII characters appear in any outbound prompt payload logged by `llm_gateway.py`.
- [ ] **S1-32** `[Core]` Build **Tier 4 Compact Table Digest Serializer + Domain Clusterer** (~250–300 tokens/table card + PageRank FK clustering for schemas with $50+$ tables).  
  *Gate:* 25-table ERP schema serializes into `< 7,500` prompt tokens total.
- [ ] **S1-33** `[Core]` Fix the in-memory `fetched.extend(chunk)` bottleneck in [`backend/pipeline/pipeline.py:374`](file:///h:/AAVIL%20Inc/DataX/DataX/backend/pipeline/pipeline.py#L374) by streaming 50,000-row micro-batches through DuckDB / SQL pushdown with bounded memory.  
  *Gate:* **1,000,000-row synthetic procurement benchmark** completes rule evaluation in `< 3.5s` with peak process RSS `< 350 MB`!
- [ ] **S1-34** `[Core]` Wire `POST /rules/generate` to accept Tier 0–4 Table Digest Cards + cross-table FK context so generated rules validate multi-table constraints, not just single-column syntax.  
  *Gate:* Given `orders` + `order_items`, engine synthesizes both column rules and cross-table header-sum = line-items-sum SQL checks.
- [ ] **S1-35** `[Core]` Write automated scale & token-budget benchmark (`tests/test_million_row_sketch_pipeline.py`).  
  *Gate:* Asserts `total_llm_tokens < 15000` and `raw_rows_sent_to_llm == 0` on a 1,000,000-row dataset.
- [ ] **S1-36** `[Core]` **Phase 3 Checkpoint Review:** Commit benchmark results & merge to `feature/dynamic-ui`.

---

## Phase 4 — Flagship MVP #1: "1-Click DB X-Ray, Safe Clear & Executive Advisor" (`Plan 06`)
*Goal: Deliver the 3-minute autonomous database diagnostic (Security + DPDP PII + DataGlow Quality + Safe Clear + SQL-Grounded C-Suite Advisor) on a read-only connection.*

- [ ] **S1-37** `[Core]` Build **Node 1 — CIS Database Security Posture Auditor (`backend/db_xray/security_posture.py`)**: SSL/TLS check, superuser/`PUBLIC` over-grants, multi-tenant tables missing RLS, tables missing PKs, unindexed FKs, dead-tuple bloat $>25\%$, plaintext/MD5 password columns, and remediating `REVOKE`/`CREATE INDEX` SQL.  
  *Gate:* Detects all 8 seeded misconfigurations on a test Postgres schema with CIS Benchmark IDs attached.
- [ ] **S1-38** `[Core]` Build **Node 2 — DPDP 2025 & GDPR Exposure + Blast-Radius Mapper (`backend/db_xray/pii_exposure.py`)** combining `pii_classifier.py` (including JSONB log column scanning!) with `role_table_grants` and row counts to rank rupee/dollar regulatory risk.  
  *Gate:* Flags unmasked Aadhaar/PAN/Card columns + leaked API keys inside JSONB columns and generates masking/tokenization SQL views.
- [ ] **S1-39** `[Core]` Build **Node 3 — DataGlow Quality & Relational Integrity Scorer (`backend/db_xray/quality_scorer.py`)** computing per-table & DB-wide DQI (completeness, duplicates, IQR outliers, entropy, orphan FKs, accounting formula mismatches, zombie tables) anchored via `langgraph-consensus-guard`.  
  *Gate:* Outputs deterministic Layer-1 score + $\pm 2.5$ anchored Consensus Verdict.
- [ ] **S1-40** `[Core]` Build **Node 4 — "1-Click Safe DB Clear" Compiler (`backend/db_xray/safe_clear_compiler.py`)** supporting 3 non-destructive modes:
  1. Downloadable transactional `safe_clear_migration.sql` + `rollback.sql` (archives bad rows to quarantine, deduplicates respecting FK order, normalizes syntax),
  2. Materialize Clean Shadow Schema (`<schema>_datax_clean` via [`staging.py` ARC-01](file:///h:/AAVIL%20Inc/DataX/DataX/backend/pipeline/staging.py)),
  3. 1-Click promote to scheduled CleanFlow Thread.  
  *Gate:* Executing generated `safe_clear_migration.sql` followed by `rollback.sql` on a 50k-row dirty test DB restores exact row-for-row byte parity!
- [ ] **S1-41** `[Core]` Build **Nodes 5 & 6 — Hypothesis Pushdown SQL Runner & Hallucination-Proof Executive Advisor (`backend/db_xray/business_advisor.py`)** enforcing **100% SQL Query Citation Grounding** (every ₹/\$ metric in the Executive Report must reference an executed aggregate `query_id` from `sql_guard.py`).  
  *Gate:* Automated citation verifier confirms 100% of numbers in generated Executive Advice match executed aggregate SQL JSON outputs.
- [ ] **S1-42** `[Core]` Assemble the 6-Node LangGraph Orchestrator + SSE streaming endpoints (`POST /db-xray/scan`, `GET /db-xray/runs/{id}`, `POST /db-xray/safe-clear`, `GET /db-xray/export-pdf/{id}`).  
  *Gate:* Full scan over a 250k-row multi-table dirty ERP finishes in `< 25s` and `< 15,000` tokens.
- [ ] **S1-43** `[Core]` Seed a realistic **Dirty Enterprise ERP Demo Database** (Procurement + Orders + Customers + Inventory + GL with planted security flaws, Aadhaar/Card PII, orphan FKs, duplicates, and ₹42L stuck-order revenue leak) for instant 1-click zero-setup demos.  
  *Gate:* Demo scan runs end-to-end with 1 click when user selects *"Try Live 250k-Row Enterprise ERP Sandbox"*.
- [ ] **S1-44** `[Core]` Build Frontend **`src/pages/DbXrayPage.jsx`** (`#db-xray`) with live 6-stage radar progress, 4-pillar Executive Scorecard (*Security*, *DPDP & PII*, *DataGlow Quality*, *C-Suite Advisor* with *"View SQL Proof"* drawers), and **1-Click Safe DB Clear** modal.  
  *Gate:* Vitest component tests + `npm run build` pass cleanly.
- [ ] **S1-45** `[Core]` Add *"1-Click DB X-Ray & Clear"* launch card to Workflows & Sidebar (`DataXAppShell.jsx`, `UseCasesSection.jsx`, `NavigationContext.jsx`) + 1-click handoff buttons (*"Certify Clean Table for ML →"*, *"Sanitize Text Columns for RAG →"*).  
  *Gate:* Seamless cross-module navigation verified end-to-end.
- [ ] **S1-46** `[Core]` **Phase 4 Milestone Sign-Off:** End-to-end demo walkthrough & regression gate green.

---

## Phase 5 — Flagship MVP #2: Typed DAG Runtime & Chatbot Endpoint Red-Team (`Plan 04`)
*Goal: Replace static canvas post-processing with real topological node execution and ship the Live Customer Chatbot Vulnerability Analyzer & Virtual Patch (`[Dev-2: WP-D2]` + `[Core]`).*

- [ ] **S1-47** `[Core]` Build **`backend/runtime/dag_executor.py`** (`DataXNodeHandler` protocol, Kahn topological sort, cycle detection, typed port validation, parallel `asyncio.gather` branch execution, per-node `checkpointer.py` snapshots) replacing post-hoc loop in `pipeline.py:58`.  
  *Gate:* Changing/removing any node on canvas measurably alters downstream outputs and node telemetry.
- [ ] **S1-48** `[Dev-2: WP-D2]` Build SSRF-hardened **`customer_endpoint_connector`** with mandatory target ownership verification (`X-DataX-Verify-Token` / `.well-known/datax-verify.txt` / local sandbox).  
  *Gate:* Private RFC1918/metadata IPs (`169.254.169.254`, `127.0.0.1` in prod) and unverified external URLs are rejected with HTTP `403`.
- [ ] **S1-49** `[Dev-2: WP-D2]` Build **`company_context_loader` + `contextual_attack_synthesizer`** generating 40–80 tailored single & 3-turn Crescendo probes across 8 OWASP LLM/Agentic + India DPDP threat categories.  
  *Gate:* Given fintech refund-bot context, generates probes specifically targeting refund cap bypass, BOLA order lookup, PAN/Aadhaar leak, and competitor endorsement.
- [ ] **S1-50** `[Dev-2: WP-D2]` Build **`adversarial_probe_runner` + `vulnerability_evaluator`** calculating per-category Attack Success Rate (ASR %), severity, and exact failing transcripts.  
  *Gate:* Against a vulnerable test chatbot fixture, accurately flags seeded vulnerabilities with `< 5%` false positives.
- [ ] **S1-51** `[Dev-2: WP-D2]` Build **`virtual_patch_compiler` + `verification_replay_gate`** auto-generating `DataX Privacy Gateway` rules + system-prompt diff, and replaying all failed attacks *through* the patched gateway to verify ASR drops to `0%`.  
  *Gate:* `pytest tests/test_endpoint_redteam.py` proves vulnerable bot ASR drops from `>= 35%` $\to$ `0%` through the auto-compiled gateway policy!
- [ ] **S1-52** `[Dev-2: WP-D2]` Add **MCP Tool-Manifest Poisoning Scanner (`mcp_tool_schema_guard`)** inspecting agent tool JSON schemas/descriptions for hidden prompt injections and missing financial parameter bounds.  
  *Gate:* Catches poisoned MCP tool descriptions in unit tests.
- [ ] **S1-53** `[Dev-2: WP-D2]` Expose `/firewall/redteam/*` endpoints and build the *"Endpoint Red-Team & 1-Click Virtual Patch"* UI Studio inside [`src/pages/AiFirewallPage.jsx`](file:///h:/AAVIL%20Inc/DataX/DataX/src/pages/AiFirewallPage.jsx) + wire real nodes in [`firewallCatalog.js`](file:///h:/AAVIL%20Inc/DataX/DataX/src/components/firewall/firewallCatalog.js).  
  *Gate:* `npm test && npm run build` pass cleanly.
- [ ] **S1-54** `[Core]` Add lightweight local ONNX prompt-injection classifier option (`Llama-Prompt-Guard` / semantic jailbreak similarity via `fastembed`) alongside regexes in `ai_firewall_engine.py` to catch paraphrased & multilingual jailbreaks.  
  *Gate:* Catches Hinglish, Base64, and paraphrased system-override attacks that bypass regexes at `< 20ms` latency.
- [ ] **S1-55** `[Core]` **Phase 5 Milestone Sign-Off:** Merge `WP-D2`, verify full AI Firewall + Red-Team + Virtual Patch loop.

---

## Phase 6 — Migration Studio S/4HANA Expansion, ML CI Gate & Market Proof (`Plans 03 & 04`)
*Goal: Expand SAP Migration Studio beyond legacy BODS, embed ML Gate into CI/CD, and publish verifiable benchmarks.*

- [ ] **S1-56** `[Dev-2: WP-D3]` Build **SAP S/4HANA Migration Cockpit Exporter (`backend/engines/sap_cockpit_exporter.py` + `GET /fmd/export/migration-cockpit`)** outputting official S/4HANA staging templates (`SIF_MARA`, `SIF_MAKT`, `SIF_MARC`) alongside BODS `Z_ERRORLOG`.  
  *Gate:* Exported `.xlsx`/`.xml` validates cleanly against S/4HANA Migration Cockpit mandatory header schemas.
- [ ] **S1-57** `[Dev-2: WP-D3]` Build **`ai_schema_auto_mapper`** proposing column mappings + DuckDB SQL expressions when no Excel FMD exists yet (using Plan 05 sketches + `fastembed` column similarity).  
  *Gate:* Maps 15/18 cryptic legacy columns (`MATNR`, `MAKTX`, `WERKS`, `LIFNR` $\leftrightarrow$ modern English schema) automatically in test suite.
- [ ] **S1-58** `[Dev-2: WP-D4]` Add **Train/Test Contamination Scanner** + **Out-of-Fold Label-Noise Auditor** + headless CLI runner (`scripts/datax_ml_gate_cli.py`) to [`ml_certification_engine.py`](file:///h:/AAVIL%20Inc/DataX/DataX/backend/engines/ml_certification_engine.py).  
  *Gate:* CLI exits `1` when `>= 1%` test rows leak into training set, and `0` after auto-remediation.
- [ ] **S1-59** `[Core]` Run & publish reproducible **DataX Benchmark Suite (`benchmarks/run_all_benchmarks.py` + `docs/BENCHMARK_REPORT.md`)**:
  1. *Token Efficiency:* 1M-row ERP scan (`<13k` tokens vs `180M` naive = $>10,000\times$ reduction),
  2. *Consensus Accuracy:* `langgraph-consensus-guard` anchored vs unanchored LLM judge variance,
  3. *Firewall & DPDP Recall:* Injection + Indian/Global PII precision/recall & p95 latency.  
  *Gate:* Reproducible `docs/BENCHMARK_REPORT.md` generated from real test runs.
- [ ] **S1-60** `[Core]` **Sprint 1 Final Release Sign-Off:** All 60 tasks `[x]`, CI/CD green, production Azure VM updated and health-checked (`https://dataglow.ai/datax/#db-xray`, `#ai-firewall`, `#ml-certify`, `#mapping-studio`).
