# DataX — Weekly Progress Client Demo & Screen-Recording Script
**Target Duration:** ~5 to 6 Minutes  
**Audience:** Enterprise Client, VP of Engineering / CDO / Head of Data Governance  
**Product:** **DataX — Enterprise Data Quality, Schema Migration & AI Governance Platform**  
*(Strict Notice: 100% dedicated to DataX; zero references to DI/KDEM)*

---

## 🎬 Recording Setup Checklist Before Hitting "Record"
1. **Browser Tabs to Prepare:**
   - **Tab 1:** `https://dataglow.ai/datax/` (Main DataX CleanFlow Studio UI)
   - **Tab 2:** `https://dataglow.ai/datax/#mapping-studio` (Schema & Migration Studio)
   - **Tab 3:** `https://dataglow.ai/datax-api/governance/llm-budget` (Live AI Spend & Budget Meter API)
   - **Tab 4:** `https://dataglow.ai/datax-api/governance/audit/verify` (Cryptographic Merkle Audit Ledger API)
2. **Display Settings:** 1080p (1920x1080) at 100% browser zoom.
3. **Pacing:** Move cursor smoothly; pause 1-2 seconds after each click before speaking.

---

## ⏱️ Video Timeline
```
00:00 — 00:45 | Scene 1: Executive Overview & Sprint Achievements
00:45 — 01:45 | Scene 2: Enterprise Database Connectivity & Honest Toast Diagnostics
01:45 — 02:45 | Scene 3: DPDP 2025 Indian PII Shield & TokenVault Encryption
02:45 — 03:45 | Scene 4: ₹0-Cloud-Cost Local ONNX Substrate & LLM Budget Governance
03:45 — 04:45 | Scene 5: Cryptographic Merkle Audit Chain & Schema Migration Studio
04:45 — 05:30 | Scene 6: Executive Wrap-Up & Next Sprint Horizon (1-Click DB X-Ray)
```

---

## 🎙️ Scene 1: Executive Overview (00:00 – 00:45)
**Screen:** Tab 1 — DataX Platform Homepage (`https://dataglow.ai/datax/`)

> **Spoken Script:**  
> *"Hello everyone. Today I'm excited to share our weekly progress update on **DataX** — our enterprise data quality, schema migration, and AI governance platform.*  
>  
> *Over the past sprint, our engineering team focused on resolving three mission-critical challenges that enterprise leaders face when adopting AI in enterprise data pipelines:*  
> *1. **Regulatory and PII Compliance Risk** — specifically meeting the strict mandate of India's DPDP 2025 Act without false-positive business disruptions.*  
> *2. **Unpredictable AI Cloud Operating Costs** — capping enterprise LLM token spend while running high-throughput semantic vector embeddings locally at ₹0 cloud cost.*  
> *3. **Enterprise Ingestion Honesty & Cryptographic Auditability** — eliminating silent failures with live parameter pushdown, real-time top-right toast diagnostics, and Merkle-chained tamper verification.*  
>  
> *Let's step through the live platform to see these in action."*

---

## 🎙️ Scene 2: Honest Connectors & Top-Right Toast Notifications (00:45 – 01:45)
**Screen:** Tab 1 (`https://dataglow.ai/datax/`) $\to$ CleanFlow Studio

**Click-by-Click Sequence:**
1. Click **"CleanFlow Studio"** in the left sidebar navigation.
2. In the canvas toolbar, click **"Add Source Node"** $\to$ Select **"MySQL"** or **"SQL Server"**.
3. Double-click the node to open the configuration panel.
4. Leave the host empty or type `fake-host.internal` and click the blue **"Test Connection"** button.
5. **Observe:** An animated **Red Error Toast** immediately pops up in the top-right corner showing the exact connection failure reason.
6. Now select **"PostgreSQL Sandbox"** (or type `demo-sandbox`) $\to$ Click **"Test Connection"**.
7. **Observe:** An animated **Green Success Toast** appears in the top-right corner (*"Connected successfully in 32ms. Discovered 5 tables"*), and 5 live sample rows immediately render in the schema drawer.

> **Spoken Script:**  
> *"First, enterprise database connectivity. In production architectures, data engineering teams cannot rely on opaque mock data or silent connector timeouts.*  
>  
> *We have completely overhauled DataX's connector fabric to perform honest, live pushdown across **PostgreSQL**, **MySQL**, and **Microsoft SQL Server**.*  
>  
> *Notice when I click 'Test Connection' on an unconfigured or bogus endpoint, the platform provides immediate, honest diagnostics. Instead of squished inline badges, DataX dispatches an animated, full-detail error toast in the top-right corner explaining the network refusal.*  
>  
> *When connecting to a valid endpoint or our enterprise sandbox, we get instantaneous schema discovery and live record sampling in under 35 milliseconds."*

---

## 🎙️ Scene 3: DPDP 2025 Indian PII Shield & TokenVault Encryption (01:45 – 02:45)
**Screen:** Tab 1 $\to$ CleanFlow Canvas $\to$ Click on **AI Privacy Gateway / PII Node**

**Click-by-Click Sequence:**
1. In the canvas, click on the **"AI Privacy Gateway"** node (or navigate to `#firewall`).
2. Toggle the **"India DPDP 2025 Compliance Suite"** switch to **Active**.
3. Paste or view sample records containing mixed data: valid Aadhaar, invalid repetitive digits (`999999999999`), PAN numbers, and GSTIN strings.
4. Click **"Scan & Tokenize"**.
5. **Observe:** The platform flags the valid Aadhaar via mathematical Verhoeff check, flags the GSTIN via Modulo-36 check, and instantly generates irreversible synthetic surrogate tokens via **TokenVault**.

> **Spoken Script:**  
> *"Next is our India DPDP 2025 compliance engine. Generic regex scanners fail in enterprise environments because random 12-digit order numbers or part IDs get falsely flagged as Aadhaar numbers.*  
>  
> *DataX now implements strict mathematical checksum algorithms:*  
> *- For **Aadhaar**, we validate the full 12-digit **Verhoeff Dihedral Group ($D_5$)** check digit, rejecting false sequences and repetitive dummy numbers.*  
> *- For **PAN cards**, we enforce alphanumeric structural validation.*  
> *- For **GSTIN**, we enforce the **ISO/IEC 7064 Modulo-36** checksum, alongside credit cards via Luhn and banking IFSC codes.*  
>  
> *Furthermore, through our **TokenVault**, sensitive identifiers never leave your enterprise perimeter in plaintext. They undergo Format-Preserving Encryption, meaning an Aadhaar or PAN is transformed into a synthetic surrogate that downstream LLMs and analytics can process safely without ever exposing raw citizen data."*

---

## 🎙️ Scene 4: ₹0-Cloud-Cost Local ONNX Substrate & LLM Budget Governance (02:45 – 03:45)
**Screen:** Switch to **Tab 3** (`https://dataglow.ai/datax-api/governance/llm-budget`) $\to$ Then switch back to Tab 1 Canvas (`vector_matcher` node)

**Click-by-Click Sequence:**
1. Show Tab 3: Highlight the live JSON response showing `monthly_budget_usd: 50.0`, `current_spend_usd`, `budget_remaining_usd`, and `total_tokens_used`.
2. Switch to Tab 1 CleanFlow canvas $\to$ Click on the **"Entity Clustering & Semantic Resolution"** node.
3. Show that embeddings are generated using the local CPU-quantized ONNX engine.

> **Spoken Script:**  
> *"Now let's examine AI operating costs. Traditional data platforms send every single row or chunk to external cloud APIs like OpenAI, causing enterprise cloud bills to skyrocket uncontrollably.*  
>  
> *In DataX, we've engineered a **Shared AI Substrate** running quantized local ONNX models — specifically `bge-small-en-v1.5` — directly on the host CPU. Our benchmark tests clock this at over **300 texts per second** with less than 200 MB of RAM footprint, costing **₹0.00 in cloud API fees**.*  
>  
> *For semantic vendor matching, DataX extracts unique strings, embeds them locally in 700 milliseconds, and clusters them back to canonical records.*  
>  
> *Here on our live governance endpoint, you can see our centralized **LLM Gateway Telemetry**. Every tenant has a daily dollar hard cap, an automated 25-call loop circuit breaker, and an in-memory prompt cache. Zero bill shocks, guaranteed."*

---

## 🎙️ Scene 5: Cryptographic Merkle Audit Ledger & Schema Migration Studio (03:45 – 04:45)
**Screen:** Switch to **Tab 4** (`https://dataglow.ai/datax-api/governance/audit/verify`) $\to$ Then switch to **Tab 2** (`https://dataglow.ai/datax/#mapping-studio`)

**Click-by-Click Sequence:**
1. Show Tab 4: Point to `"chain_valid": true` and `"tamper_detected": false` with the sequential SHA-256 block hashes.
2. Switch to Tab 2 (`#mapping-studio`):
3. Click on the **"SAP FMD & BODS Staging Fabric"** banner.
4. Click on **"Excel Walkthrough Drawer"** to inspect mapped multi-tab legacy fields (`MAKT-MAKTX`) against modern target entities.

> **Spoken Script:**  
> *"For compliance and regulatory auditability, DataX features an unbreakable **Cryptographic Merkle Audit Ledger**.*  
>  
> *Here on `/governance/audit/verify`, you can see our real-time verification endpoint. Every single action across all four DataX pillars — Database ERP, Schema Migration, ML Drift Certification, and the AI Firewall — is chained with SHA-256 hashes linking each event to the previous block from genesis.*  
>  
> *If an insider or malicious script tampers with even a single byte in the audit logs, this endpoint immediately flags the exact broken block.*  
>  
> *In our **Schema & Migration Studio**, we combine this with **Reciprocal Rank Fusion (RRF)** hybrid search. When engineering teams ask migration questions about SAP tables like `MAKT-MAKTX`, the platform retrieves exact rule citations from both structured multi-tab Excel workbooks and unstructured PDF specifications without slicing table cells in half."*

---

## 🎙️ Scene 6: Executive Wrap-Up & Next Sprint Horizon (04:45 – 05:30)
**Screen:** Switch back to Tab 1 (`https://dataglow.ai/datax/`)

> **Spoken Script:**  
> *"To summarize our progress this week:*  
> *1. We resolved all PR #3 acceptance criteria and unified our codebase with **110 passing automated regression tests** and zero frontend secret leaks.*  
> *2. We delivered complete DPDP 2025 compliance with Verhoeff Aadhaar and TokenVault encryption.*  
> *3. We eliminated external cloud API costs for embeddings with our local ONNX substrate.*  
> *4. We deployed unbroken Merkle-chained audit verification and live top-right toast diagnostics.*  
>  
> *Looking ahead to next week, we are launching our flagship feature: the **1-Click DB X-Ray & Rollback-Safe Auto-Cleanse**. This will give enterprise teams a 90-second autonomous diagnostic covering database security, PII exposure, and schema hygiene, backed by 1-click snapshot rollback.*  
>  
> *Thank you, and I look forward to your feedback."*
