# DataX — Weekly Progress Client Demo & Screen-Recording Script
**Target Duration:** ~5 to 6 Minutes  
**Audience:** Enterprise Client, VP of Engineering / CDO / Head of Data Governance  
**Product:** **DataX — Enterprise Data Quality, Schema Migration & LLM Governance Platform**  
*(Note: 100% focused on DataX; zero overlap with DI/KDEM)*

---

## 🎬 Recording Setup Checklist Before You Hit "Record"
1. **Browser Tabs to Have Open:**
   - **Tab 1:** `https://dataglow.ai/datax/` (Main DataX Platform UI)
   - **Tab 2:** `https://dataglow.ai/datax/#mapping-studio` (Schema & Migration Studio)
   - **Tab 3:** `https://dataglow.ai/datax-api/governance/llm-budget` (Live LLM Cost Meter API)
   - **Tab 4:** `https://dataglow.ai/datax-api/governance/audit/verify` (Cryptographic Merkle Audit Ledger API)
2. **Resolution:** 1080p (1920x1080) at 100% or 125% browser zoom.
3. **Cursor:** Smooth mouse movements; pause 1-2 seconds after each click before speaking.

---

## ⏱️ Timeline & Step-by-Step Screen Recording Script

```
00:00 — 00:45 | Scene 1: Executive Overview & Core Problem
00:45 — 01:50 | Scene 2: Enterprise Database Connectivity & Honest Error Toasts
01:50 — 03:00 | Scene 3: DPDP 2025 Indian PII Shield & TokenVault
03:00 — 04:00 | Scene 4: ₹0-Cloud-Cost Local ONNX Embeddings & Hard Token Caps
04:00 — 05:00 | Scene 5: Cryptographic Merkle Audit Ledger & Spec RAG
05:00 — 05:45 | Scene 6: Conclusion & Next Week's 1-Click DB X-Ray Horizon
```

---

### 🎙️ Scene 1: Executive Overview (00:00 – 00:45)
**Screen:** Tab 1 — DataX Platform Homepage (`https://dataglow.ai/datax/`)

> **Spoken Script:**  
> *"Hello everyone. Today I'm excited to share our weekly progress update on **DataX** — our enterprise data quality, schema migration, and AI governance platform.*  
>  
> *Over the past sprint, our engineering focus was on solving the three biggest roadblocks that enterprise leaders face when adopting AI in enterprise data pipelines:*  
> *1. **Regulatory compliance risk** — specifically preventing unauthorized PII leaks under the new India DPDP 2025 guidelines.*  
> *2. **Unpredictable AI cost spikes** — guaranteeing cloud API budgets are strictly capped while moving bulk embeddings to ₹0 local compute.*  
> *3. **Tamper-proof auditability** — providing an unbreakable cryptographic Merkle ledger that proves every data decision to regulators.*  
>  
> *Let's jump into the live platform and see how each capability works."*

---

### 🎙️ Scene 2: Honest Connectors & Global Toast Notifications (00:45 – 01:50)
**Screen:** Tab 1 $\to$ Click **"CleanFlow Studio"** or **"Schema & Migration Studio"** in sidebar.
**Actions to Record:**
1. In the top toolbar, click **"Add Source Node"** $\to$ Select **"MySQL"** or **"SQL Server"**.
2. Click **"Test Connection"** on an unconfigured host.
3. Observe the animated **Red Error Toast** in the top right corner.
4. Select **PostgreSQL Sandbox** $\to$ Click **"Test Connection"** $\to$ Observe the **Green Success Toast** (*"Connected to PostgreSQL in 32ms"*).

> **Spoken Script:**  
> *"First, let's look at enterprise database connectivity. In production, engineering teams cannot afford opaque mock data or silent connector failures.*  
>  
> *We have completely overhauled our data ingestion engine to perform real, live parameter pushdown and schema discovery across **PostgreSQL**, **MySQL**, and **Microsoft SQL Server**.*  
>  
> *Notice when I click 'Test Connection' on an unconfigured database endpoint, the platform provides immediate, honest diagnostics. Instead of truncated inline badges, DataX dispatches an animated, full-detail error toast in the top-right corner explaining the network refusal or credential issue.*  
>  
> *When we point to our live PostgreSQL cluster, we get instant discovery with latency benchmarking in under 35 milliseconds."*

---

### 🎙️ Scene 3: DPDP 2025 Indian PII Shield & TokenVault (01:50 – 03:00)
**Screen:** CleanFlow Canvas $\to$ Click on **AI Privacy Gateway / PII Node** or show test records.

> **Spoken Script:**  
> *"Next is our India DPDP 2025 compliance engine. Standard regex scanners fail miserably in production because random 12-digit order IDs or part numbers get falsely flagged as Aadhaar numbers.*  
>  
> *DataX now implements exact mathematical checksum validation:*  
> *- For **Aadhaar**, we enforce the full 12-digit **Verhoeff $D_5$ Dihedral Group** algorithm.*  
> *- For **PAN cards**, we enforce alphanumeric structural validation.*  
> *- For **GSTIN**, we enforce the **Modulo-36 ISO/IEC 7064** checksum, alongside credit cards via Luhn and banking IFSC codes.*  
>  
> *Furthermore, through our **TokenVault**, sensitive identifiers never leave your enterprise perimeter in plaintext. They undergo Format-Preserving Encryption, meaning an Aadhaar or PAN is transformed into a synthetic surrogate that downstream LLMs and analytics can process safely without ever seeing raw citizen or corporate secrets."*

---

### 🎙️ Scene 4: ₹0-Cloud-Cost Local ONNX Embeddings & Token Budget (03:00 – 04:00)
**Screen:** Switch to Tab 3 (`https://dataglow.ai/datax-api/governance/llm-budget`) and CleanFlow `vector_matcher` node.

> **Spoken Script:**  
> *"Now let's talk about AI operating costs. Traditional platforms send every single row or chunk to external cloud APIs like OpenAI, which causes enterprise cloud bills to explode into lakhs of rupees.*  
>  
> *In DataX, we've built a **Shared AI Substrate** running quantized local ONNX models — specifically `bge-small-en-v1.5` — directly on the host CPU. Our benchmark tests clock this at over **300 texts per second** with less than 200 MB of RAM footprint, costing **₹0.00 in cloud API fees**.*  
>  
> *For our Entity Clustering node, if an enterprise has 10,000 procurement rows with 150 messy vendor name variations — like 'IBM', 'IBM Corp', and 'IBM India' — DataX extracts only the unique strings, embeds them locally in 700 milliseconds, and clusters them back to canonical records.*  
>  
> *On Tab 3, you can see our centralized **LLM Gateway Telemetry**. Every tenant has a daily dollar hard cap, an automated 25-call loop circuit breaker, and an in-memory prompt cache. Zero bill shocks, guaranteed."*

---

### 🎙️ Scene 5: Cryptographic Merkle Audit Ledger & Spec RAG (04:00 – 05:00)
**Screen:** Switch to Tab 4 (`https://dataglow.ai/datax-api/governance/audit/verify`) $\to$ Then switch to Tab 2 (Schema & Migration Studio).

> **Spoken Script:**  
> *"For compliance and regulatory auditability, DataX now features a unified **Cryptographic Merkle Audit Ledger**.*  
>  
> *Here on `/governance/audit/verify`, you can see our real-time verification endpoint. Every single action across all four DataX pillars — Database ERP, Schema Migration, ML Drift Certification, and the AI Firewall — is chained with SHA-256 hashes linking each event to the previous block from genesis.*  
>  
> *If an insider or malicious script tampers with even a single byte in the audit logs, this endpoint immediately catches the broken link and flags the exact record.*  
>  
> *In our **Schema & Migration Studio**, we've combined this with **Reciprocal Rank Fusion (RRF)** hybrid search. When engineering teams ask migration questions about SAP tables like `MAKT-MAKTX`, the platform retrieves exact rule citations from both structured multi-tab Excel workbooks and unstructured 50-page PDF specifications without slicing table cells in half."*

---

### 🎙️ Scene 6: Conclusion & Next Week's Horizon (05:00 – 05:45)
**Screen:** Switch back to Tab 1 (`https://dataglow.ai/datax/`).

> **Spoken Script:**  
> *"To summarize our progress this week:*  
> *1. We completed all 12 tasks in Phase 1 and 9 tasks in Phase 2 with **63 passing automated regression tests** and zero build errors.*  
> *2. We delivered complete DPDP 2025 compliance with Verhoeff Aadhaar and TokenVault encryption.*  
> *3. We eliminated external cloud API costs for embeddings with our local ONNX substrate.*  
> *4. We deployed unbroken Merkle-chained audit verification.*  
>  
> *Coming up next week, we are launching our flagship feature: the **1-Click DB X-Ray & Safe Clear**. This will give enterprise teams a 90-second autonomous diagnostic covering database security, PII exposure, and data quality scoring, plus 1-click rollback-safe SQL cleansing.*  
>  
> *Thank you, and we look forward to your feedback!"*
