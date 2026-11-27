// =========================================================================
// ENTERPRISE WORKFLOW TEMPLATES & AUTOFILL CATALOG
// 10 Prioritized Multi-Node Production Pipelines Across All Enterprise Domains
// =========================================================================

export const TEMPLATE_AUTOFILLS = {
  // -----------------------------------------------------------------------
  // 1. TIER 1: SAP BW -> S/4HANA Clean Core Modernizer (with HITL Approval)
  // -----------------------------------------------------------------------
  sap_bw_s4hana: {
    id: 'sap_bw_s4hana',
    name: 'SAP BW → S/4HANA Clean Core Modernizer',
    shortName: 'SAP Clean Core',
    category: 'ERP Modernization',
    priority: 'Tier 1 (Mission-Critical)',
    desc: 'Extract InfoCube purchasing lines, resolve legacy plant codes via plant ontology, split high-value purchase orders for human review, and commit verified orders into S/4HANA via BAPI.',
    nodes: [
      {
        id: 'node-source',
        type: 'source',
        x: 60,
        y: 165,
        width: 215,
        height: 145,
        title: 'SAP BW InfoCube',
        system: 'HANA Cloud',
        table: '0PUR_C01',
        rowCount: '1,420',
        status: 'Demo',
        variant: 'blue'
      },
      {
        id: 'node-rules',
        type: 'rules',
        x: 325,
        y: 165,
        width: 215,
        height: 145,
        title: 'Intelligence engine',
        system: 'Clean core ontologies',
        ruleCount: 5,
        aiModel: 'gpt-5-mini',
        status: 'Auto-fix',
        variant: 'indigo'
      },
      {
        id: 'node-conditional',
        type: 'conditional',
        x: 590,
        y: 165,
        width: 215,
        height: 145,
        title: 'If / else router',
        system: 'TOTAL_AMOUNT > 50,000',
        postRunSubtitle: 'TOTAL > 50,000',
        table: 'TRUE · FALSE',
        status: 'Active',
        variant: 'purple'
      },
      {
        id: 'node-hitl',
        type: 'hitl',
        x: 865,
        y: 45,
        width: 215,
        height: 140,
        title: 'Controller gate',
        system: 'Procurement controller',
        sla: '8 h',
        table: 'SLA: 8 hrs',
        status: 'Armed',
        variant: 'orange'
      },
      {
        id: 'node-router',
        type: 'router',
        x: 865,
        y: 280,
        width: 215,
        height: 145,
        title: 'CleanFlow router',
        system: 'Clean · Fixed · Quarantined',
        split: 'Clean · Fixed · Quarantined',
        healthGate: '90%',
        status: 'Active',
        variant: 'purple'
      },
      {
        id: 'node-target',
        type: 'target',
        x: 1130,
        y: 45,
        width: 215,
        height: 140,
        title: 'SAP S/4HANA',
        system: 'Clean core',
        table: '0PUR_C01_clean',
        bapi: 'BAPI_PO_CREATE1',
        status: 'Ready',
        variant: 'green'
      },
      {
        id: 'node-quarantine',
        type: 'quarantine',
        x: 1130,
        y: 280,
        width: 215,
        height: 145,
        title: 'Quarantine store',
        system: 'Dead-letter isolation',
        table: '0PUR_C01_quarantine',
        status: 'Locked',
        variant: 'orange'
      }
    ],
    edges: [
      { id: 'e-1', from: 'node-source', to: 'node-rules', label: 'Raw Stream' },
      { id: 'e-2', from: 'node-rules', to: 'node-conditional', label: 'Validated Records' },
      { id: 'e-3', from: 'node-conditional', to: 'node-hitl', label: 'High Value (> $50K)', variant: 'orange' },
      { id: 'e-4', from: 'node-conditional', to: 'node-router', label: 'Routine PO Stream', variant: 'purple' },
      { id: 'e-5', from: 'node-hitl', to: 'node-target', label: 'Controller Approved', variant: 'green' },
      { id: 'e-6', from: 'node-router', to: 'node-target', label: 'Compliant & Auto-Fixed', variant: 'green' },
      { id: 'e-7', from: 'node-router', to: 'node-quarantine', label: 'Critical Violations', variant: 'orange' }
    ],
    sourceConfig: {
      engine: 'sap_bw',
      host: 'hana.corp.ondemand.com',
      port: '443',
      database: 'SAP_BW',
      user: 'bwp_rfc_user',
      password: '••••••••',
      table: '0PUR_C01',
      connectionUri: 'jdbc:sap://hana.corp.ondemand.com:443?encrypt=true&validateCertificate=false&user=bwp_rfc_user&databaseName=SAP_BW'
    },
    targetConfig: {
      engine: 's4_hana',
      host: 's4h.corp.ondemand.com',
      port: '443',
      database: 'S4HANA_PRD',
      user: 'bapi_comm_user',
      password: '••••••••',
      table: '0PUR_C01_clean',
      quarantineTable: '0PUR_C01_quarantine',
      writeMode: 'append',
      connectionUri: 'https://s4h.corp.ondemand.com/sap/bc/srt/rfc/sap/z_bapi_po_create1'
    },
    rules: [
      { id: 'r_sap_1', name: 'Positive Line Quantity', field: 'QUANTITY', severity: 'Critical', code: 'QUANTITY > 0', selected: true, desc: 'Reject negative or zero line item quantities' },
      { id: 'r_sap_2', name: 'Calculation Equality', field: 'TOTAL_AMOUNT', severity: 'Critical', code: 'ABS(TOTAL_AMOUNT - (QUANTITY * UNIT_PRICE)) < 0.05', selected: true, desc: 'Line item total must equal quantity times unit price' },
      { id: 'r_sap_3', name: 'Mandatory Vendor Code', field: 'VENDOR_ID', severity: 'Critical', code: 'VENDOR_ID IS NOT NULL AND LENGTH(TRIM(VENDOR_ID)) > 0', selected: true, desc: 'Valid vendor assigned for procurement writeback' },
      { id: 'r_sap_4', name: 'Authorized S/4HANA Plant', field: 'DELIVERY_PLANT', severity: 'Warning', code: "DELIVERY_PLANT IN ('P1000', 'P2000', 'P3000')", selected: true, desc: 'Delivery plant matches active S/4HANA plant via ontology lookup' },
      { id: 'r_sap_5', name: 'Sequential Line Item', field: 'ITEM_NO', severity: 'Warning', code: 'ITEM_NO > 0 AND ITEM_NO % 10 == 0', selected: true, desc: 'SAP purchasing lines must increment predictably' }
    ]
  },

  // -----------------------------------------------------------------------
  // 2. TIER 1: Financial General Ledger & SOX 404 Balance Audit
  // -----------------------------------------------------------------------
  financial_gl_ledger: {
    id: 'financial_gl_ledger',
    name: 'Financial General Ledger & SOX 404 Balance Audit',
    shortName: 'Financial GL & SOX',
    category: 'Finance & Audit',
    priority: 'Tier 1 (Mission-Critical)',
    desc: 'Audit general ledger journal entries across disparate legacy systems, guarantee zero imbalance (Debits = Credits), gate entries exceeding $100K for CFO sign-off, and stage approved entries to BigQuery & financial vault.',
    nodes: [
      {
        id: 'node-source',
        type: 'source',
        x: 60,
        y: 165,
        width: 215,
        height: 145,
        title: 'ERP General Ledger',
        system: 'PostgreSQL Ledger',
        table: 'gl_journal_entries',
        rowCount: '2,800',
        status: 'Demo',
        variant: 'blue'
      },
      {
        id: 'node-rules',
        type: 'rules',
        x: 325,
        y: 165,
        width: 215,
        height: 145,
        title: 'SOX 404 Rules',
        system: 'Debits = Credits validator',
        ruleCount: 4,
        aiModel: 'gpt-5-mini',
        status: 'Auto-fix',
        variant: 'indigo'
      },
      {
        id: 'node-conditional',
        type: 'conditional',
        x: 590,
        y: 165,
        width: 215,
        height: 145,
        title: 'If / else router',
        system: 'DEBIT_AMOUNT > 100,000',
        postRunSubtitle: 'DEBIT > 100,000',
        table: 'TRUE · FALSE',
        status: 'Active',
        variant: 'purple'
      },
      {
        id: 'node-hitl',
        type: 'hitl',
        x: 865,
        y: 45,
        width: 215,
        height: 140,
        title: 'Controller gate',
        system: 'CFO / Controller sign-off',
        sla: '4 h',
        table: 'SLA: 4 hrs',
        status: 'Armed',
        variant: 'orange'
      },
      {
        id: 'node-router',
        type: 'router',
        x: 865,
        y: 280,
        width: 215,
        height: 145,
        title: 'CleanFlow router',
        system: 'Balanced · Repaired · Suspense',
        split: 'Balanced · Repaired · Suspense',
        healthGate: '95%',
        status: 'Active',
        variant: 'purple'
      },
      {
        id: 'node-bigquery',
        type: 'bigquery',
        x: 1130,
        y: 45,
        width: 215,
        height: 140,
        title: 'Google BigQuery',
        system: 'Audited core ledger',
        table: 'gl_ledger_audited_gold',
        status: 'Ready',
        variant: 'blue'
      },
      {
        id: 'node-quarantine',
        type: 'quarantine',
        x: 1130,
        y: 280,
        width: 215,
        height: 145,
        title: 'Suspense account',
        system: 'SOX imbalance isolation',
        table: 'gl_suspense_quarantine',
        status: 'Locked',
        variant: 'orange'
      }
    ],
    edges: [
      { id: 'e-1', from: 'node-source', to: 'node-rules', label: 'Journal Stream' },
      { id: 'e-2', from: 'node-rules', to: 'node-conditional', label: 'SOX Validated' },
      { id: 'e-3', from: 'node-conditional', to: 'node-hitl', label: 'Material Journal (> $100K)', variant: 'orange' },
      { id: 'e-4', from: 'node-conditional', to: 'node-router', label: 'Sub-Threshold Entries', variant: 'purple' },
      { id: 'e-5', from: 'node-hitl', to: 'node-bigquery', label: 'CFO Sign-off', variant: 'green' },
      { id: 'e-6', from: 'node-router', to: 'node-bigquery', label: 'Balanced Journal Entries', variant: 'green' },
      { id: 'e-7', from: 'node-router', to: 'node-quarantine', label: 'Imbalance Suspense', variant: 'orange' }
    ],
    sourceConfig: {
      engine: 'postgres',
      host: 'pg-finance.internal.net',
      port: '5432',
      database: 'erp_finance',
      user: 'sox_audit_user',
      password: '••••••••',
      table: 'gl_journal_entries',
      connectionUri: 'postgresql://sox_audit_user:••••••••@pg-finance.internal.net:5432/erp_finance?sslmode=require'
    },
    targetConfig: {
      engine: 'bigquery',
      host: 'bigquery.googleapis.com',
      port: '443',
      database: 'enterprise_analytics_landing',
      user: 'datax_svc@gcp.iam.gserviceaccount.com',
      password: '••••••••',
      table: 'gl_ledger_audited_gold',
      quarantineTable: 'gl_suspense_quarantine',
      writeMode: 'append',
      connectionUri: 'bigquery://datax-enterprise-prd/finance/gl_ledger_audited_gold'
    },
    rules: [
      { id: 'r_gl_1', name: 'Debits Equal Credits', field: 'DEBIT', severity: 'Critical', code: 'ABS(DEBIT - CREDIT) < 0.01', selected: true, desc: 'Zero balance equation required by SOX 404' },
      { id: 'r_gl_2', name: 'Valid ISO Currency', field: 'CURRENCY', severity: 'Critical', code: "CURRENCY IN ('USD', 'EUR', 'GBP', 'CHF')", selected: true, desc: 'Recognized ISO-4217 currency standard' },
      { id: 'r_gl_3', name: 'Valid GL Account Code', field: 'ACCOUNT_CODE', severity: 'Critical', code: 'LENGTH(ACCOUNT_CODE) >= 4', selected: true, desc: 'General ledger account must exist in chart of accounts' },
      { id: 'r_gl_4', name: 'Open Fiscal Period', field: 'FISCAL_PERIOD', severity: 'Warning', code: 'FISCAL_PERIOD >= 1 AND FISCAL_PERIOD <= 12', selected: true, desc: 'Must match active posting period' }
    ]
  },

  // -----------------------------------------------------------------------
  // 3. TIER 2: Customer 360 & Entity Resolution Harmonizer
  // -----------------------------------------------------------------------
  customer_master_reconciliation: {
    id: 'customer_master_reconciliation',
    name: 'Customer 360 & Entity Resolution Harmonizer',
    shortName: 'Customer 360',
    category: 'Customer 360',
    priority: 'Tier 2 (High Value)',
    desc: 'Harmonize raw customer documents from MongoDB Atlas, apply vector embeddings to resolve duplicate company names (e.g., "IBM Corp" ↔ "International Business Machines"), enforce RFC-5322 syntax, and write Golden Customer records to PostgreSQL Neon.',
    nodes: [
      {
        id: 'node-source',
        type: 'source',
        x: 60,
        y: 165,
        width: 215,
        height: 145,
        title: 'MongoDB Atlas',
        system: 'Document cluster',
        table: 'customers_raw',
        rowCount: '1,000',
        status: 'Demo',
        variant: 'blue'
      },
      {
        id: 'node-vector',
        type: 'vector_matcher',
        x: 325,
        y: 165,
        width: 215,
        height: 145,
        title: 'Vector matcher',
        system: 'text-embedding-3-small',
        table: 'Similarity > 85%',
        status: 'Auto-fix',
        variant: 'indigo'
      },
      {
        id: 'node-rules',
        type: 'rules',
        x: 590,
        y: 165,
        width: 215,
        height: 145,
        title: 'Identity rules',
        system: 'RFC-5322 & phone E.164',
        ruleCount: 5,
        aiModel: 'gpt-5-mini',
        status: 'Auto-fix',
        variant: 'indigo'
      },
      {
        id: 'node-router',
        type: 'router',
        x: 865,
        y: 165,
        width: 215,
        height: 145,
        title: 'CleanFlow router',
        system: 'Golden · Fixed · Unresolved',
        split: 'Golden · Fixed · Unresolved',
        healthGate: '90%',
        status: 'Active',
        variant: 'purple'
      },
      {
        id: 'node-target',
        type: 'target',
        x: 1130,
        y: 45,
        width: 215,
        height: 140,
        title: 'PostgreSQL',
        system: 'Golden customer records',
        table: 'customers_gold',
        status: 'Ready',
        variant: 'green'
      },
      {
        id: 'node-quarantine',
        type: 'quarantine',
        x: 1130,
        y: 280,
        width: 215,
        height: 145,
        title: 'Quarantine store',
        system: 'Identity review DLQ',
        table: 'customers_unresolved',
        status: 'Locked',
        variant: 'orange'
      }
    ],
    edges: [
      { id: 'e-1', from: 'node-source', to: 'node-vector', label: 'Document Stream' },
      { id: 'e-2', from: 'node-vector', to: 'node-rules', label: 'Harmonized Entities' },
      { id: 'e-3', from: 'node-rules', to: 'node-router', label: 'Cleaned Identity' },
      { id: 'e-4', from: 'node-router', to: 'node-target', label: 'Golden Customer Profiles', variant: 'green' },
      { id: 'e-5', from: 'node-router', to: 'node-quarantine', label: 'Ambiguous Matches', variant: 'orange' }
    ],
    sourceConfig: {
      engine: 'mongodb',
      host: 'atlas-cluster0.mongodb.net',
      port: '27017',
      database: 'crm_master',
      user: 'atlas_admin',
      password: '••••••••',
      table: 'customers_raw',
      connectionUri: 'mongodb+srv://atlas_admin:••••••••@atlas-cluster0.mongodb.net/crm_master?retryWrites=true&w=majority'
    },
    targetConfig: {
      engine: 'postgres',
      host: 'pg-reconciled.internal.net',
      port: '5432',
      database: 'reconciled_db',
      user: 'postgres_admin',
      password: '••••••••',
      table: 'customers_gold',
      quarantineTable: 'customers_unresolved',
      writeMode: 'append',
      connectionUri: 'postgresql://postgres_admin:••••••••@pg-reconciled.internal.net:5432/reconciled_db?sslmode=require'
    },
    rules: [
      { id: 'r_cm_1', name: 'RFC-5322 Email Syntax', field: 'email', severity: 'Critical', code: "REGEX_MATCH(email, '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$')", selected: true, desc: 'Valid corporate email syntax' },
      { id: 'r_cm_2', name: 'Required Full Name', field: 'full_name', severity: 'Critical', code: 'full_name IS NOT NULL AND LENGTH(full_name) >= 2', selected: true, desc: 'Reject null or single character names' },
      { id: 'r_cm_3', name: 'Non-Negative Account Balance', field: 'account_balance', severity: 'Critical', code: 'account_balance >= 0.00', selected: true, desc: 'Disallow corrupt negative balance amounts' },
      { id: 'r_cm_4', name: 'Entity Resolution Cosine Score', field: 'company_name', severity: 'Warning', code: 'VECTOR_SIMILARITY >= 0.85', selected: true, desc: 'Harmonize duplicate legal entity names' }
    ]
  },

  // -----------------------------------------------------------------------
  // 4. TIER 2: Enterprise Policy RAG & Contract Intelligence Pipeline
  // -----------------------------------------------------------------------
  enterprise_rag_knowledge: {
    id: 'enterprise_rag_knowledge',
    name: 'Enterprise Policy RAG & Contract Intelligence Pipeline',
    shortName: 'Policy RAG',
    category: 'Enterprise AI & RAG',
    priority: 'Tier 2 (GenAI & Knowledge Systems)',
    desc: 'Ingest enterprise contract documents from AWS S3, retrieve internal compliance policy context via RAG Enricher, evaluate clause risk scores, route critical clauses to Legal Counsel, and persist embeddings into Pinecone Vector DB.',
    nodes: [
      {
        id: 'node-source',
        type: 'source',
        x: 60,
        y: 165,
        width: 215,
        height: 145,
        title: 'AWS S3 Contracts',
        system: 'Contract document bucket',
        table: 'vendor_contracts_q1',
        rowCount: '840',
        status: 'Demo',
        variant: 'blue'
      },
      {
        id: 'node-rag',
        type: 'rag',
        x: 325,
        y: 165,
        width: 215,
        height: 145,
        title: 'RAG Context Enricher',
        system: 'Policy library lookup',
        table: 'Azure AI Search Policies',
        status: 'Auto-fix',
        variant: 'purple'
      },
      {
        id: 'node-vector',
        type: 'vector_matcher',
        x: 590,
        y: 165,
        width: 215,
        height: 145,
        title: 'Vector matcher',
        system: 'text-embedding-3-small',
        table: 'Similarity > 80%',
        status: 'Auto-fix',
        variant: 'indigo'
      },
      {
        id: 'node-conditional',
        type: 'conditional',
        x: 865,
        y: 165,
        width: 215,
        height: 145,
        title: 'If / else router',
        system: 'RISK_SCORE > 80',
        postRunSubtitle: 'RISK > 80',
        table: 'TRUE · FALSE',
        status: 'Active',
        variant: 'purple'
      },
      {
        id: 'node-hitl',
        type: 'hitl',
        x: 1130,
        y: 45,
        width: 215,
        height: 140,
        title: 'Controller gate',
        system: 'General counsel review',
        sla: '24 h',
        table: 'SLA: 24 hrs',
        status: 'Armed',
        variant: 'orange'
      },
      {
        id: 'node-pinecone',
        type: 'pinecone',
        x: 1395,
        y: 45,
        width: 215,
        height: 140,
        title: 'Pinecone Vector DB',
        system: 'Enterprise knowledge base',
        table: 'enterprise-knowledge-base',
        status: 'Ready',
        variant: 'green'
      },
      {
        id: 'node-quarantine',
        type: 'quarantine',
        x: 1130,
        y: 280,
        width: 215,
        height: 145,
        title: 'Quarantine store',
        system: 'Breach policy quarantine',
        table: 'contracts_policy_violations',
        status: 'Locked',
        variant: 'orange'
      }
    ],
    edges: [
      { id: 'e-1', from: 'node-source', to: 'node-rag', label: 'Raw Contracts' },
      { id: 'e-2', from: 'node-rag', to: 'node-vector', label: 'Enriched Context' },
      { id: 'e-3', from: 'node-vector', to: 'node-conditional', label: 'Risk Scored' },
      { id: 'e-4', from: 'node-conditional', to: 'node-hitl', label: 'High Legal Risk (> 80)', variant: 'orange' },
      { id: 'e-5', from: 'node-conditional', to: 'node-quarantine', label: 'Critical Policy Violations', variant: 'orange' },
      { id: 'e-7', from: 'node-hitl', to: 'node-pinecone', label: 'Counsel Approved', variant: 'green' }
    ],
    sourceConfig: {
      engine: 'aws_s3',
      host: 's3.us-east-1.amazonaws.com',
      port: '443',
      database: 'Parquet Snappy',
      user: 's3_contract_reader',
      password: '••••••••',
      table: 'vendor_contracts_q1',
      connectionUri: 's3://datax-enterprise-lake/legal-contracts/vendor_contracts_q1.parquet'
    },
    targetConfig: {
      engine: 'pinecone',
      host: 'pinecone.io',
      port: '443',
      database: 'enterprise-knowledge-base',
      user: 'pinecone_svc',
      password: '••••••••',
      table: 'enterprise-knowledge-base',
      quarantineTable: 'contracts_policy_violations',
      writeMode: 'append',
      connectionUri: 'pinecone://production/enterprise-knowledge-base'
    },
    rules: [
      { id: 'r_rag_1', name: 'Valid Expiration Date', field: 'EXPIRY_DATE', severity: 'Critical', code: 'EXPIRY_DATE > CURRENT_DATE()', selected: true, desc: 'Contract cannot be already expired at execution' },
      { id: 'r_rag_2', name: 'Indemnity Risk Threshold', field: 'INDEMNITY_SCORE', severity: 'Critical', code: 'INDEMNITY_SCORE <= 80', selected: true, desc: 'Gate high-liability indemnity clauses' },
      { id: 'r_rag_3', name: 'Governing Jurisdiction', field: 'JURISDICTION', severity: 'Warning', code: "JURISDICTION IN ('DE', 'NY', 'CA', 'UK', 'EU')", selected: true, desc: 'Approved legal jurisdiction standard' },
      { id: 'r_rag_4', name: 'Mandatory Signatory Title', field: 'SIGNATORY_TITLE', severity: 'Critical', code: 'LENGTH(SIGNATORY_TITLE) > 0', selected: true, desc: 'Authorized officer signature required' }
    ]
  },

  // -----------------------------------------------------------------------
  // 5. TIER 3: Salesforce CRM -> BigQuery Real-Time Revenue Pipeline
  // -----------------------------------------------------------------------
  // -----------------------------------------------------------------------
  // ML Feature Drift & Fine-Tuning Certification Gate
  // -----------------------------------------------------------------------
  ml_dataset_certification: {
    id: 'ml_dataset_certification',
    name: 'ML Feature Drift & Fine-Tuning Certification Gate',
    shortName: 'ML Drift Gate',
    category: 'MLOps & LLM Engineering',
    priority: 'Tier 1 (AI Quality & Governance)',
    desc: 'Ingest candidate training sets, compute Population Stability Index (PSI) against production baseline, flag target leakage (|r| >= 0.75), audit protected demographic balance, and enforce automated EU AI Act / SR 11-7 gate before model training.',
    nodes: [
      {
        id: 'node-source',
        type: 'source',
        x: 60,
        y: 165,
        width: 215,
        height: 145,
        title: 'S3 Feature Store',
        system: 'Candidate training dataset',
        table: 'credit_risk_candidate_q2',
        rowCount: '25,000',
        status: 'Demo',
        variant: 'blue'
      },
      {
        id: 'node-rules',
        type: 'rules',
        x: 325,
        y: 165,
        width: 215,
        height: 145,
        title: 'PSI Drift Auditor',
        system: 'Covariate shift & leakage',
        ruleCount: 6,
        aiModel: 'DuckDB PSI Math',
        status: 'Auto-fix',
        variant: 'indigo'
      },
      {
        id: 'node-conditional',
        type: 'conditional',
        x: 590,
        y: 165,
        width: 215,
        height: 145,
        title: 'If / else router',
        system: 'PSI <= 0.20 & |r| < 0.75',
        postRunSubtitle: 'PSI <= 0.20',
        table: 'TRUE · FALSE',
        status: 'Active',
        variant: 'purple'
      },
      {
        id: 'node-hitl',
        type: 'hitl',
        x: 865,
        y: 45,
        width: 215,
        height: 140,
        title: 'Controller gate',
        system: 'Lead ML scientist review',
        sla: '4 h',
        table: 'SLA: 4 hrs',
        status: 'Armed',
        variant: 'orange'
      },
      {
        id: 'node-target',
        type: 'target',
        x: 1130,
        y: 45,
        width: 215,
        height: 140,
        title: 'Certified Feature Store',
        system: 'Approved training bucket',
        table: 'certified_q2.parquet',
        status: 'Ready',
        variant: 'green'
      },
      {
        id: 'node-quarantine',
        type: 'quarantine',
        x: 865,
        y: 280,
        width: 215,
        height: 145,
        title: 'Drift quarantine',
        system: 'Drift & leakage isolation',
        table: 'ml_drift_quarantine',
        status: 'Locked',
        variant: 'orange'
      }
    ],
    edges: [
      { id: 'e-1', from: 'node-source', to: 'node-rules', label: 'Raw Features' },
      { id: 'e-2', from: 'node-rules', to: 'node-conditional', label: 'PSI & Pearson Scores' },
      { id: 'e-3', from: 'node-conditional', to: 'node-hitl', label: 'Borderline Drift (0.10 < PSI < 0.25)', variant: 'orange' },
      { id: 'e-4', from: 'node-conditional', to: 'node-target', label: 'Certified (PSI <= 0.10)', variant: 'green' },
      { id: 'e-5', from: 'node-conditional', to: 'node-quarantine', label: 'Critical Drift (PSI >= 0.25) / Leakage', variant: 'orange' },
      { id: 'e-6', from: 'node-hitl', to: 'node-target', label: 'Scientist Override Approved', variant: 'green' }
    ],
    sourceConfig: {
      engine: 'aws_s3',
      host: 's3.us-east-1.amazonaws.com',
      port: '443',
      database: 'credit_risk_lakehouse',
      user: 'ml_feature_store',
      password: '••••••••',
      table: 'credit_risk_candidate_q2',
      connectionUri: 's3://datax-ml-lake/features/candidate_q2.parquet'
    },
    targetConfig: {
      engine: 'aws_s3',
      host: 's3.us-east-1.amazonaws.com',
      port: '443',
      database: 'certified_training_pool',
      user: 'mlops_pipeline',
      password: '••••••••',
      table: 'certified_training_data',
      quarantineTable: 'ml_drift_quarantine',
      writeMode: 'append',
      connectionUri: 's3://datax-ml-lake/certified/training_q2.parquet'
    },
    rules: [
      { id: 'r_ml_1', name: 'Covariate Shift (PSI < 0.20)', field: 'DEBT_TO_INCOME', severity: 'Critical', code: 'PSI(DEBT_TO_INCOME) < 0.20', selected: true, desc: 'Guard against extreme macroeconomic population drift' },
      { id: 'r_ml_2', name: 'Label Leakage Blocker', field: 'TARGET_CORRELATION', severity: 'Critical', code: 'PEARSON_CORR(feature, target) < 0.75', selected: true, desc: 'Block downstream features recorded after target event' },
      { id: 'r_ml_3', name: 'EU AI Act Protected Balance', field: 'AGE_GROUP', severity: 'Warning', code: 'MIN_REPRESENTATION(AGE_GROUP) >= 0.05', selected: true, desc: 'Ensure subgroup representation per EU AI Act Article 10' },
      { id: 'r_ml_4', name: 'Missingness Invariant', field: 'CREDIT_SCORE', severity: 'Critical', code: 'NULL_RATIO(CREDIT_SCORE) < 0.02', selected: true, desc: 'Feature completeness must match baseline distribution' }
    ]
  },

  salesforce_crm_bigquery: {
    id: 'salesforce_crm_bigquery',
    name: 'Salesforce CRM → BigQuery Real-Time Revenue Pipeline',
    shortName: 'Salesforce CRM',
    category: 'Revenue Operations',
    priority: 'Tier 3 (Cloud Data Warehouse)',
    desc: 'Ingest live Accounts and Opportunities from Salesforce CRM, cleanse lead emails and corporate domains, route enterprise deals exceeding $250K to RevOps Director, and stream golden customer pipeline records to Google BigQuery.',
    nodes: [
      {
        id: 'node-source',
        type: 'source',
        x: 60,
        y: 165,
        width: 215,
        height: 145,
        title: 'Salesforce CRM',
        system: 'Opportunities & accounts',
        table: 'Opportunity',
        rowCount: '4,200',
        status: 'Demo',
        variant: 'blue'
      },
      {
        id: 'node-rules',
        type: 'rules',
        x: 325,
        y: 165,
        width: 215,
        height: 145,
        title: 'Lead & ARR rules',
        system: 'Lead scoring & RFC-5322',
        ruleCount: 5,
        aiModel: 'gpt-5-mini',
        status: 'Auto-fix',
        variant: 'indigo'
      },
      {
        id: 'node-conditional',
        type: 'conditional',
        x: 590,
        y: 165,
        width: 215,
        height: 145,
        title: 'If / else router',
        system: 'DEAL_ARR > 250,000',
        postRunSubtitle: 'ARR > 250,000',
        table: 'TRUE · FALSE',
        status: 'Active',
        variant: 'purple'
      },
      {
        id: 'node-hitl',
        type: 'hitl',
        x: 865,
        y: 45,
        width: 215,
        height: 140,
        title: 'Controller gate',
        system: 'RevOps director review',
        sla: '6 h',
        table: 'SLA: 6 hrs',
        status: 'Armed',
        variant: 'orange'
      },
      {
        id: 'node-router',
        type: 'router',
        x: 865,
        y: 280,
        width: 215,
        height: 145,
        title: 'CleanFlow router',
        system: 'Qualified · Enriched · Junk',
        split: 'Qualified · Enriched · Junk',
        healthGate: '90%',
        status: 'Active',
        variant: 'purple'
      },
      {
        id: 'node-bigquery',
        type: 'bigquery',
        x: 1130,
        y: 45,
        width: 215,
        height: 140,
        title: 'Google BigQuery',
        system: 'Revenue pipeline gold',
        table: 'sales_pipeline_gold',
        status: 'Ready',
        variant: 'blue'
      },
      {
        id: 'node-quarantine',
        type: 'quarantine',
        x: 1130,
        y: 280,
        width: 215,
        height: 145,
        title: 'Quarantine store',
        system: 'Junk lead isolation',
        table: 'salesforce_junk_quarantine',
        status: 'Locked',
        variant: 'orange'
      }
    ],
    edges: [
      { id: 'e-1', from: 'node-source', to: 'node-rules', label: 'CRM Stream' },
      { id: 'e-2', from: 'node-rules', to: 'node-conditional', label: 'Scored Leads' },
      { id: 'e-3', from: 'node-conditional', to: 'node-hitl', label: 'Strategic (> $250K)', variant: 'orange' },
      { id: 'e-4', from: 'node-conditional', to: 'node-router', label: 'Velocity Pipeline', variant: 'purple' },
      { id: 'e-5', from: 'node-hitl', to: 'node-bigquery', label: 'Director Approved', variant: 'green' },
      { id: 'e-6', from: 'node-router', to: 'node-bigquery', label: 'Standard Clean Deals', variant: 'green' },
      { id: 'e-7', from: 'node-router', to: 'node-quarantine', label: 'Unqualified / Spam', variant: 'orange' }
    ],
    sourceConfig: {
      engine: 'salesforce',
      host: 'login.salesforce.com',
      port: '443',
      database: 'Salesforce CRM Enterprise',
      user: 'sfdc_api_user@enterprise.com',
      password: '••••••••',
      table: 'Opportunity',
      connectionUri: 'https://login.salesforce.com/services/oauth2/token'
    },
    targetConfig: {
      engine: 'bigquery',
      host: 'bigquery.googleapis.com',
      port: '443',
      database: 'revops_analytics',
      user: 'datax_svc@gcp.iam.gserviceaccount.com',
      password: '••••••••',
      table: 'sales_pipeline_gold',
      quarantineTable: 'salesforce_junk_quarantine',
      writeMode: 'append',
      connectionUri: 'bigquery://datax-enterprise-prd/revops/sales_pipeline_gold'
    },
    rules: [
      { id: 'r_sfdc_1', name: 'Business Email Domain', field: 'LeadEmail', severity: 'Critical', code: "REGEX_MATCH(LeadEmail, '^[A-Za-z0-9._%+-]+@(?!gmail|yahoo)[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$')", selected: true, desc: 'Disallow freemail domains on enterprise accounts' },
      { id: 'r_sfdc_2', name: 'Positive Opportunity Value', field: 'Amount', severity: 'Critical', code: 'Amount > 0 AND Amount <= 50000000', selected: true, desc: 'Reasonable revenue bounds for deals' },
      { id: 'r_sfdc_3', name: 'Valid Deal Stage', field: 'StageName', severity: 'Critical', code: "StageName IN ('Prospecting', 'Qualification', 'Proposal', 'Negotiation', 'Closed Won')", selected: true, desc: 'Enforce standard CRM sales stages' },
      { id: 'r_sfdc_4', name: 'Lead Quality Score', field: 'LeadScore', severity: 'Warning', code: 'LeadScore >= 0 AND LeadScore <= 100', selected: true, desc: 'Lead scoring normalization bounds' }
    ]
  },

  // -----------------------------------------------------------------------
  // 6. TIER 3: Cloud Telemetry & Vector Semantic Search
  // -----------------------------------------------------------------------
  support_telemetry_vector: {
    id: 'support_telemetry_vector',
    name: 'Cloud Telemetry & Vector Semantic Search',
    shortName: 'SRE Telemetry',
    category: 'SRE & Support AI',
    priority: 'Tier 3 (Observability & Vector AI)',
    desc: 'Ingest raw service crash dumps and support telemetry from Azure Blob Storage, scrub internal IP/token credentials, cluster duplicate incident patterns via Semantic Vector Matcher, and index embeddings into Pinecone for autonomous Copilot retrieval.',
    nodes: [
      {
        id: 'node-source',
        type: 'source',
        x: 60,
        y: 165,
        width: 215,
        height: 145,
        title: 'Azure Blob Storage',
        system: 'Service crash telemetry',
        table: 'telemetry_logs.parquet',
        rowCount: '15,000',
        status: 'Demo',
        variant: 'blue'
      },
      {
        id: 'node-rules',
        type: 'rules',
        x: 325,
        y: 165,
        width: 215,
        height: 145,
        title: 'Token & IP Scrubber',
        system: 'PII & credential redaction',
        ruleCount: 4,
        aiModel: 'gpt-5-mini',
        status: 'Auto-fix',
        variant: 'indigo'
      },
      {
        id: 'node-vector',
        type: 'vector_matcher',
        x: 590,
        y: 165,
        width: 215,
        height: 145,
        title: 'Vector matcher',
        system: 'text-embedding-3-small',
        table: 'Incident Clustering',
        status: 'Auto-fix',
        variant: 'indigo'
      },
      {
        id: 'node-router',
        type: 'router',
        x: 865,
        y: 165,
        width: 215,
        height: 145,
        title: 'CleanFlow router',
        system: 'Known · Auto-Triaged · Corrupt',
        split: 'Known · Auto-Triaged · Corrupt',
        healthGate: '90%',
        status: 'Active',
        variant: 'purple'
      },
      {
        id: 'node-pinecone',
        type: 'pinecone',
        x: 1130,
        y: 45,
        width: 215,
        height: 140,
        title: 'Pinecone Vector DB',
        system: 'Incident embeddings index',
        table: 'incident-embeddings',
        status: 'Ready',
        variant: 'green'
      },
      {
        id: 'node-quarantine',
        type: 'quarantine',
        x: 1130,
        y: 280,
        width: 215,
        height: 145,
        title: 'Corrupt log store',
        system: 'Dead-letter parquet isolation',
        table: 'corrupt_telemetry_dlq',
        status: 'Locked',
        variant: 'orange'
      }
    ],
    edges: [
      { id: 'e-1', from: 'node-source', to: 'node-rules', label: 'Log Stream' },
      { id: 'e-2', from: 'node-rules', to: 'node-vector', label: 'Anonymized Logs' },
      { id: 'e-3', from: 'node-vector', to: 'node-router', label: 'Clustered Incidents' },
      { id: 'e-4', from: 'node-router', to: 'node-pinecone', label: 'Indexed for Copilot', variant: 'green' },
      { id: 'e-5', from: 'node-router', to: 'node-quarantine', label: 'Unparseable Corrupt Lines', variant: 'orange' }
    ],
    sourceConfig: {
      engine: 'azure_blob',
      host: 'azure-storage.blob.core.windows.net',
      port: 'telemetry-container',
      database: 'Azure Blob Snappy',
      user: 'azure_telemetry_client',
      password: '••••••••',
      table: 'telemetry_logs.parquet',
      connectionUri: 'https://azure-storage.blob.core.windows.net/telemetry-container/telemetry_logs.parquet'
    },
    targetConfig: {
      engine: 'pinecone',
      host: 'pinecone.io',
      port: '443',
      database: 'incident-embeddings',
      user: 'pinecone_svc',
      password: '••••••••',
      table: 'incident-embeddings',
      quarantineTable: 'corrupt_telemetry_dlq',
      writeMode: 'append',
      connectionUri: 'pinecone://production/incident-embeddings'
    },
    rules: [
      { id: 'r_tel_1', name: 'IP Anonymization Mask', field: 'client_ip', severity: 'Critical', code: "REGEX_MATCH(client_ip, '^[0-9]{1,3}\\.[0-9]{1,3}\\.XXX\\.XXX$')", selected: true, desc: 'GDPR compliance client IP obfuscation' },
      { id: 'r_tel_2', name: 'Standard Log Level', field: 'log_level', severity: 'Critical', code: "log_level IN ('DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL')", selected: true, desc: 'Enforce structured logging levels' },
      { id: 'r_tel_3', name: 'Incident Semantic Match', field: 'incident_summary', severity: 'Warning', code: 'CLUSTER_SIMILARITY >= 0.80', selected: true, desc: 'Correlate with existing known SRE root-cause issues' },
      { id: 'r_tel_4', name: 'Latency Outlier Flag', field: 'latency_ms', severity: 'Warning', code: 'latency_ms >= 0 AND latency_ms <= 30000', selected: true, desc: 'Flag aberrant server latency spikes' }
    ]
  },

  // -----------------------------------------------------------------------
  // 7. TIER 3: Snowflake -> SAP S/4HANA Spend Analytics Harmonizer
  // -----------------------------------------------------------------------
  snowflake_s4hana_procurement: {
    id: 'snowflake_s4hana_procurement',
    name: 'Snowflake → SAP S/4HANA Spend Analytics Harmonizer',
    shortName: 'Snowflake Spend',
    category: 'Cross-Cloud Spend',
    priority: 'Tier 3 (Enterprise Procurement)',
    desc: 'Ingest procurement lines from Snowflake Data Cloud, resolve vendor naming discrepancies with vector embeddings, validate tax & currency codes, and dispatch clean purchase orders to SAP S/4HANA.',
    nodes: [
      {
        id: 'node-source',
        type: 'source',
        x: 60,
        y: 165,
        width: 215,
        height: 145,
        title: 'Snowflake Cloud',
        system: 'Procurement spend landing',
        table: 'PURCHASING_STAGE',
        rowCount: '5,200',
        status: 'Demo',
        variant: 'blue'
      },
      {
        id: 'node-vector',
        type: 'vector_matcher',
        x: 325,
        y: 165,
        width: 215,
        height: 145,
        title: 'Vector matcher',
        system: 'text-embedding-3-small',
        table: 'Vendor Master Resolution',
        status: 'Auto-fix',
        variant: 'indigo'
      },
      {
        id: 'node-rules',
        type: 'rules',
        x: 590,
        y: 165,
        width: 215,
        height: 145,
        title: 'Spend & Tax rules',
        system: 'Currency & tax compliance',
        ruleCount: 5,
        aiModel: 'gpt-5-mini',
        status: 'Auto-fix',
        variant: 'indigo'
      },
      {
        id: 'node-router',
        type: 'router',
        x: 865,
        y: 165,
        width: 215,
        height: 145,
        title: 'CleanFlow router',
        system: 'Compliant · Repaired · Maverick',
        split: 'Compliant · Repaired · Maverick',
        healthGate: '90%',
        status: 'Active',
        variant: 'purple'
      },
      {
        id: 'node-target',
        type: 'target',
        x: 1130,
        y: 45,
        width: 215,
        height: 140,
        title: 'SAP S/4HANA',
        system: 'Reconciled procurement ERP',
        table: '0PUR_C01_reconciled',
        bapi: 'BAPI_PO_CREATE1',
        status: 'Ready',
        variant: 'green'
      },
      {
        id: 'node-quarantine',
        type: 'quarantine',
        x: 1130,
        y: 280,
        width: 215,
        height: 145,
        title: 'Quarantine store',
        system: 'Maverick spend isolation',
        table: 'procurement_maverick_dlq',
        status: 'Locked',
        variant: 'orange'
      }
    ],
    edges: [
      { id: 'e-1', from: 'node-source', to: 'node-vector', label: 'Snowflake Stream' },
      { id: 'e-2', from: 'node-vector', to: 'node-rules', label: 'Resolved Vendors' },
      { id: 'e-3', from: 'node-rules', to: 'node-router', label: 'Audited Orders' },
      { id: 'e-4', from: 'node-router', to: 'node-target', label: 'ERP Commit', variant: 'green' },
      { id: 'e-5', from: 'node-router', to: 'node-quarantine', label: 'Unauthorized Maverick Spend', variant: 'orange' }
    ],
    sourceConfig: {
      engine: 'snowflake',
      host: 'xy12345.us-east-1.snowflakecomputing.com',
      port: '443',
      database: 'ANALYTICS_LANDING',
      user: 'datax_svc',
      password: '••••••••',
      table: 'PURCHASING_STAGE',
      connectionUri: 'snowflake://datax_svc:••••••••@xy12345.us-east-1.snowflakecomputing.com/ANALYTICS_LANDING?warehouse=COMPUTE_WH'
    },
    targetConfig: {
      engine: 's4_hana',
      host: 's4h.corp.ondemand.com',
      port: '443',
      database: 'S4HANA_PRD',
      user: 'bapi_comm_user',
      password: '••••••••',
      table: '0PUR_C01_reconciled',
      quarantineTable: 'procurement_maverick_dlq',
      writeMode: 'append',
      connectionUri: 'https://s4h.corp.ondemand.com/sap/bc/srt/rfc/sap/z_bapi_po_create1'
    },
    rules: [
      { id: 'r_snw_1', name: 'Spend Ledger Accuracy', field: 'SPEND_AMOUNT', severity: 'Critical', code: 'SPEND_AMOUNT > 0 AND SPEND_AMOUNT == INVOICE_QTY * UNIT_COST', selected: true, desc: 'Snowflake spend matches line item total' },
      { id: 'r_snw_2', name: 'S/4HANA Vendor Ontology Resolution', field: 'VENDOR_NAME', severity: 'Critical', code: 'VECTOR_MATCH_SCORE >= 0.90', selected: true, desc: 'Map informal supplier name to official vendor master code' },
      { id: 'r_snw_3', name: 'Cost Center Code Format', field: 'COST_CENTER', severity: 'Critical', code: 'LENGTH(COST_CENTER) == 10', selected: true, desc: 'Valid 10-digit SAP cost center allocation' },
      { id: 'r_snw_4', name: 'Fiscal Year Alignment', field: 'FISCAL_YEAR', severity: 'Warning', code: 'FISCAL_YEAR == 2026', selected: true, desc: 'Ensure active budget year consistency' }
    ]
  },

  // -----------------------------------------------------------------------
  // 8. TIER 4: Supply Chain Multi-Echelon Inventory & SKU Balancer
  // -----------------------------------------------------------------------
  supply_chain_inventory: {
    id: 'supply_chain_inventory',
    name: 'Supply Chain Multi-Echelon Inventory & SKU Balancer',
    shortName: 'Supply Chain',
    category: 'Supply Chain & Logistics',
    priority: 'Tier 4 (Operations & Logistics)',
    desc: 'Reconcile logistics warehouse counts from AWS S3, verify SKU barcode & unit-of-measure alignment, route critical safety stock deficits to Logistics Controller, and synchronize balanced stock into SAP S/4HANA and Google BigQuery.',
    nodes: [
      {
        id: 'node-source',
        type: 'source',
        x: 60,
        y: 165,
        width: 215,
        height: 145,
        title: 'AWS S3 WMS',
        system: 'Warehouse stock extracts',
        table: 'inventory_levels.parquet',
        rowCount: '6,200',
        status: 'Demo',
        variant: 'blue'
      },
      {
        id: 'node-rules',
        type: 'rules',
        x: 325,
        y: 165,
        width: 215,
        height: 145,
        title: 'SKU & Stock rules',
        system: 'GS1 barcode & UoM sync',
        ruleCount: 4,
        aiModel: 'gpt-5-mini',
        status: 'Auto-fix',
        variant: 'indigo'
      },
      {
        id: 'node-conditional',
        type: 'conditional',
        x: 590,
        y: 165,
        width: 215,
        height: 145,
        title: 'If / else router',
        system: 'STOCK_DEFICIT > 500',
        postRunSubtitle: 'DEFICIT > 500',
        table: 'TRUE · FALSE',
        status: 'Active',
        variant: 'purple'
      },
      {
        id: 'node-hitl',
        type: 'hitl',
        x: 865,
        y: 45,
        width: 215,
        height: 140,
        title: 'Controller gate',
        system: 'Logistics manager gate',
        sla: '4 h',
        table: 'SLA: 4 hrs',
        status: 'Armed',
        variant: 'orange'
      },
      {
        id: 'node-router',
        type: 'router',
        x: 865,
        y: 280,
        width: 215,
        height: 145,
        title: 'CleanFlow router',
        system: 'Balanced · Restocked · Variance',
        split: 'Balanced · Restocked · Variance',
        healthGate: '92%',
        status: 'Active',
        variant: 'purple'
      },
      {
        id: 'node-target',
        type: 'target',
        x: 1130,
        y: 45,
        width: 215,
        height: 140,
        title: 'SAP S/4HANA',
        system: 'Reconciled inventory ledger',
        table: 'inventory_reconciled_gold',
        bapi: 'BAPI_GOODSMVT_CREATE',
        status: 'Ready',
        variant: 'green'
      },
      {
        id: 'node-quarantine',
        type: 'quarantine',
        x: 1130,
        y: 280,
        width: 215,
        height: 145,
        title: 'Variance store',
        system: 'Count discrepancy isolation',
        table: 'inventory_variance_dlq',
        status: 'Locked',
        variant: 'orange'
      }
    ],
    edges: [
      { id: 'e-1', from: 'node-source', to: 'node-rules', label: 'WMS Stream' },
      { id: 'e-2', from: 'node-rules', to: 'node-conditional', label: 'Balanced SKUs' },
      { id: 'e-3', from: 'node-conditional', to: 'node-hitl', label: 'Critical Stock Deficit', variant: 'orange' },
      { id: 'e-4', from: 'node-conditional', to: 'node-router', label: 'Routine Replenishment', variant: 'purple' },
      { id: 'e-5', from: 'node-hitl', to: 'node-target', label: 'Manager Expedited', variant: 'green' },
      { id: 'e-6', from: 'node-router', to: 'node-target', label: 'Stock Reconciled', variant: 'green' },
      { id: 'e-7', from: 'node-router', to: 'node-quarantine', label: 'Count Discrepancies', variant: 'orange' }
    ],
    sourceConfig: {
      engine: 'aws_s3',
      host: 's3.us-east-1.amazonaws.com',
      port: '443',
      database: 'Parquet Snappy',
      user: 's3_wms_agent',
      password: '••••••••',
      table: 'inventory_levels.parquet',
      connectionUri: 's3://datax-enterprise-lake/wms-telemetry/inventory_levels.parquet'
    },
    targetConfig: {
      engine: 's4_hana',
      host: 's4h.corp.ondemand.com',
      port: '443',
      database: 'S4HANA_PRD',
      user: 'bapi_comm_user',
      password: '••••••••',
      table: 'inventory_reconciled_gold',
      quarantineTable: 'inventory_variance_dlq',
      writeMode: 'append',
      connectionUri: 'https://s4h.corp.ondemand.com/sap/bc/srt/rfc/sap/z_bapi_goodsmvt'
    },
    rules: [
      { id: 'r_sc_1', name: 'UPC/EAN Barcode Validity', field: 'sku_barcode', severity: 'Critical', code: "REGEX_MATCH(sku_barcode, '^[0-9]{12,14}$')", selected: true, desc: 'Standard GS1 compliant barcode format' },
      { id: 'r_sc_2', name: 'Stock On Hand Non-Negative', field: 'stock_on_hand', severity: 'Critical', code: 'stock_on_hand >= 0', selected: true, desc: 'Disallow corrupt phantom negative stock' },
      { id: 'r_sc_3', name: 'Safety Stock Threshold', field: 'stock_on_hand', severity: 'Warning', code: 'stock_on_hand >= safety_stock_min', selected: true, desc: 'Trigger reorder warning when stock drops below threshold' },
      { id: 'r_sc_4', name: 'Warehouse Bin Code Syntax', field: 'bin_location', severity: 'Warning', code: "REGEX_MATCH(bin_location, '^[A-Z]{2}-[0-9]{2}-[0-9]{2}$')", selected: true, desc: 'Valid aisle-rack-shelf bin identifier' }
    ]
  },

  // -----------------------------------------------------------------------
  // 9. TIER 4: Healthcare Patient Master & HIPAA Clinical Data Sanitizer
  // -----------------------------------------------------------------------
  healthcare_hipaa_clinical: {
    id: 'healthcare_hipaa_clinical',
    name: 'Healthcare Patient Master & HIPAA Clinical Sanitizer',
    shortName: 'Healthcare HIPAA',
    category: 'Healthcare & Life Sciences',
    priority: 'Tier 4 (Regulated Compliance)',
    desc: 'Ingest EHR and clinical patient records from PostgreSQL, execute Safe Harbor PII redaction and National Provider Identifier (NPI) verification, gate records missing patient consent for Privacy Officer approval, and stage HIPAA-compliant clinical data to Google BigQuery.',
    nodes: [
      {
        id: 'node-source',
        type: 'source',
        x: 60,
        y: 165,
        width: 215,
        height: 145,
        title: 'PostgreSQL EHR',
        system: 'Clinical patient records',
        table: 'patients_clinical_raw',
        rowCount: '2,400',
        status: 'Demo',
        variant: 'blue'
      },
      {
        id: 'node-rules',
        type: 'rules',
        x: 325,
        y: 165,
        width: 215,
        height: 145,
        title: 'HIPAA Sanitizer',
        system: 'Safe Harbor PII masking',
        ruleCount: 5,
        aiModel: 'gpt-5-mini',
        status: 'Auto-fix',
        variant: 'indigo'
      },
      {
        id: 'node-conditional',
        type: 'conditional',
        x: 590,
        y: 165,
        width: 215,
        height: 145,
        title: 'If / else router',
        system: 'CONSENT_VERIFIED == false',
        postRunSubtitle: 'CONSENT == false',
        table: 'TRUE · FALSE',
        status: 'Active',
        variant: 'purple'
      },
      {
        id: 'node-hitl',
        type: 'hitl',
        x: 865,
        y: 45,
        width: 215,
        height: 140,
        title: 'Controller gate',
        system: 'Hospital privacy officer',
        sla: '12 h',
        table: 'SLA: 12 hrs',
        status: 'Armed',
        variant: 'orange'
      },
      {
        id: 'node-router',
        type: 'router',
        x: 865,
        y: 280,
        width: 215,
        height: 145,
        title: 'CleanFlow router',
        system: 'Sanitized · Masked · Breach',
        split: 'Sanitized · Masked · Breach',
        healthGate: '98%',
        status: 'Active',
        variant: 'purple'
      },
      {
        id: 'node-bigquery',
        type: 'bigquery',
        x: 1130,
        y: 45,
        width: 215,
        height: 140,
        title: 'HIPAA Vault',
        system: 'Google BigQuery clinical',
        table: 'patients_clean_gold',
        status: 'Ready',
        variant: 'blue'
      },
      {
        id: 'node-quarantine',
        type: 'quarantine',
        x: 1130,
        y: 280,
        width: 215,
        height: 145,
        title: 'Breach quarantine',
        system: 'HIPAA audit vault',
        table: 'patients_breach_quarantine',
        status: 'Locked',
        variant: 'orange'
      }
    ],
    edges: [
      { id: 'e-1', from: 'node-source', to: 'node-rules', label: 'EHR Stream' },
      { id: 'e-2', from: 'node-rules', to: 'node-conditional', label: 'Redacted Records' },
      { id: 'e-3', from: 'node-conditional', to: 'node-hitl', label: 'Missing Consent Form', variant: 'orange' },
      { id: 'e-4', from: 'node-conditional', to: 'node-router', label: 'Consent Verified', variant: 'purple' },
      { id: 'e-5', from: 'node-hitl', to: 'node-bigquery', label: 'Privacy Officer Approved', variant: 'green' },
      { id: 'e-6', from: 'node-router', to: 'node-bigquery', label: 'HIPAA Compliant Gold', variant: 'green' },
      { id: 'e-7', from: 'node-router', to: 'node-quarantine', label: 'PII Exposure Anomalies', variant: 'orange' }
    ],
    sourceConfig: {
      engine: 'postgres',
      host: 'hipaa-vault.internal.net',
      port: '5432',
      database: 'clinical_raw',
      user: 'ehr_sync_agent',
      password: '••••••••',
      table: 'patients_clinical_raw',
      connectionUri: 'postgresql://ehr_sync_agent:••••••••@hipaa-vault.internal.net:5432/clinical_raw?sslmode=require'
    },
    targetConfig: {
      engine: 'bigquery',
      host: 'bigquery.googleapis.com',
      port: '443',
      database: 'clinical_warehouse',
      user: 'datax_svc@gcp.iam.gserviceaccount.com',
      password: '••••••••',
      table: 'patients_clean_gold',
      quarantineTable: 'patients_breach_quarantine',
      writeMode: 'append',
      connectionUri: 'bigquery://datax-healthcare-prd/clinical/patients_clean_gold'
    },
    rules: [
      { id: 'r_hc_1', name: 'HIPAA Safe Harbor De-ID', field: 'SSN', severity: 'Critical', code: 'SSN IS NULL AND CREDIT_CARD IS NULL', selected: true, desc: 'Strict prohibition of raw identifiers in analytics' },
      { id: 'r_hc_2', name: 'MRN Format Validity', field: 'MRN', severity: 'Critical', code: "REGEX_MATCH(MRN, '^MRN-[0-9]{6}$')", selected: true, desc: 'Valid institutional medical record number' },
      { id: 'r_hc_3', name: 'DOB Plausibility Guard', field: 'DOB', severity: 'Critical', code: "DOB < CURRENT_DATE() AND DOB > '1900-01-01'", selected: true, desc: 'Date of birth sanity check' },
      { id: 'r_hc_4', name: 'National Provider Identifier', field: 'NPI', severity: 'Critical', code: "REGEX_MATCH(NPI, '^[0-9]{10}$')", selected: true, desc: '10-digit CMS NPI provider validation' },
      { id: 'r_hc_5', name: 'HL7 Standard Gender Code', field: 'GENDER', severity: 'Warning', code: "GENDER IN ('M', 'F', 'O', 'U')", selected: true, desc: 'HL7 standard administrative sex value' }
    ]
  },

  // -----------------------------------------------------------------------
  // 10. TIER 5: Multi-Cloud Parquet Ingestion (Azure Blob -> BigQuery & Lakehouse)
  // -----------------------------------------------------------------------
  multicloud_parquet_lakehouse: {
    id: 'multicloud_parquet_lakehouse',
    name: 'Multi-Cloud Parquet Ingestion (Azure Blob → BigQuery)',
    shortName: 'Multi-Cloud Parquet',
    category: 'Data Lakehouse & Warehouse',
    priority: 'Tier 5 (Big Data & Lakehouse)',
    desc: 'Ingest high-throughput Snappy-compressed Parquet event streams from Azure Blob Storage, guard against schema drift, deduplicate event timestamps, and multi-dispatch compliant records into Google BigQuery.',
    nodes: [
      {
        id: 'node-source',
        type: 'source',
        x: 60,
        y: 165,
        width: 215,
        height: 145,
        title: 'Azure Blob Parquet',
        system: 'Snappy event stream',
        table: 'raw_events_stream.parquet',
        rowCount: '50,000',
        status: 'Demo',
        variant: 'blue'
      },
      {
        id: 'node-rules',
        type: 'rules',
        x: 380,
        y: 165,
        width: 215,
        height: 145,
        title: 'Schema Drift Guard',
        system: 'DuckDB type enforcer',
        ruleCount: 4,
        aiModel: 'gpt-5-mini',
        status: 'Auto-fix',
        variant: 'indigo'
      },
      {
        id: 'node-router',
        type: 'router',
        x: 700,
        y: 165,
        width: 215,
        height: 145,
        title: 'CleanFlow router',
        system: 'Valid · Coerced · Corrupt',
        split: 'Valid · Coerced · Corrupt',
        healthGate: '95%',
        status: 'Active',
        variant: 'purple'
      },
      {
        id: 'node-bigquery',
        type: 'bigquery',
        x: 1020,
        y: 45,
        width: 215,
        height: 140,
        title: 'Google BigQuery',
        system: 'Enterprise events gold',
        table: 'enterprise_events_clean',
        status: 'Ready',
        variant: 'blue'
      },
      {
        id: 'node-quarantine',
        type: 'quarantine',
        x: 1020,
        y: 280,
        width: 215,
        height: 145,
        title: 'Dead-letter Parquet',
        system: 'Schema drift isolation',
        table: 'events_corrupt_dlq',
        status: 'Locked',
        variant: 'orange'
      }
    ],
    edges: [
      { id: 'e-1', from: 'node-source', to: 'node-rules', label: 'Parquet Stream' },
      { id: 'e-2', from: 'node-rules', to: 'node-router', label: 'Validated Stream' },
      { id: 'e-3', from: 'node-router', to: 'node-bigquery', label: 'Clean Analytical Events', variant: 'green' },
      { id: 'e-4', from: 'node-router', to: 'node-quarantine', label: 'Unparseable / Corrupt', variant: 'orange' }
    ],
    sourceConfig: {
      engine: 'azure_blob',
      host: 'azure-storage.blob.core.windows.net',
      port: 'telemetry-container',
      database: 'Azure Blob Snappy',
      user: 'azure_telemetry_client',
      password: '••••••••',
      table: 'raw_events_stream.parquet',
      connectionUri: 'https://azure-storage.blob.core.windows.net/telemetry-container/raw_events_stream.parquet'
    },
    targetConfig: {
      engine: 'bigquery',
      host: 'bigquery.googleapis.com',
      port: '443',
      database: 'enterprise_events',
      user: 'datax_svc@gcp.iam.gserviceaccount.com',
      password: '••••••••',
      table: 'enterprise_events_clean',
      quarantineTable: 'events_corrupt_dlq',
      writeMode: 'append',
      connectionUri: 'bigquery://datax-enterprise-prd/analytics/enterprise_events_clean'
    },
    rules: [
      { id: 'r_pl_1', name: 'Schema Column Count Guard', field: 'COLUMN_COUNT', severity: 'Critical', code: 'COLUMN_COUNT == EXPECTED_SCHEMA_COLUMNS', selected: true, desc: 'Detect upstream parquet schema drift immediately' },
      { id: 'r_pl_2', name: 'Partition Date Sanity', field: 'partition_date', severity: 'Critical', code: 'partition_date <= CURRENT_DATE()', selected: true, desc: 'Reject future-dated partition directories' },
      { id: 'r_pl_3', name: 'Payload MD5 Checksum', field: 'checksum', severity: 'Critical', code: 'checksum == CALCULATED_HASH', selected: true, desc: 'Verify bit-level data transfer integrity' },
      { id: 'r_pl_4', name: 'Primary Key Null Rate Zero', field: 'event_id', severity: 'Critical', code: 'event_id IS NOT NULL', selected: true, desc: 'Zero tolerance for null primary keys in lakehouse' }
    ]
  }
};

// Aliases for legacy compatibility
TEMPLATE_AUTOFILLS.healthcare_hipaa = TEMPLATE_AUTOFILLS.healthcare_hipaa_clinical;
TEMPLATE_AUTOFILLS.supply_chain = TEMPLATE_AUTOFILLS.supply_chain_inventory;

/**
 * Robust template resolver for any thread object, pack key, or string name.
 * Resolves against all 10 prioritized enterprise use cases.
 */
export const getWorkflowTemplate = (threadOrKey) => {
  if (!threadOrKey) return TEMPLATE_AUTOFILLS.sap_bw_s4hana;

  const key = typeof threadOrKey === 'string'
    ? threadOrKey.toLowerCase()
    : String(threadOrKey.packKey || threadOrKey.id || threadOrKey.name || '').toLowerCase();

  if (TEMPLATE_AUTOFILLS[key]) return TEMPLATE_AUTOFILLS[key];

  if (key.includes('ml') || key.includes('drift') || key.includes('psi') || key.includes('leakage') || key.includes('train')) return TEMPLATE_AUTOFILLS.ml_dataset_certification;
  if (key.includes('rag') || key.includes('firewall') || key.includes('contract') || key.includes('policy')) return TEMPLATE_AUTOFILLS.enterprise_rag_knowledge;
  if (key.includes('salesforce') || key.includes('sfdc') || key.includes('lead') || key.includes('opp')) return TEMPLATE_AUTOFILLS.salesforce_crm_bigquery;
  if (key.includes('telemetry') || key.includes('sre') || key.includes('incident') || key.includes('blob')) return TEMPLATE_AUTOFILLS.support_telemetry_vector;
  if (key.includes('snowflake') || key.includes('spend')) return TEMPLATE_AUTOFILLS.snowflake_s4hana_procurement;
  if (key.includes('supply') || key.includes('inventory') || key.includes('wms') || key.includes('sku')) return TEMPLATE_AUTOFILLS.supply_chain_inventory;
  if (key.includes('hipaa') || key.includes('health') || key.includes('patient') || key.includes('clinical') || key.includes('ehr')) return TEMPLATE_AUTOFILLS.healthcare_hipaa_clinical;
  if (key.includes('parquet') || key.includes('lakehouse') || key.includes('multicloud')) return TEMPLATE_AUTOFILLS.multicloud_parquet_lakehouse;
  if (key.includes('customer') || key.includes('mongo') || key.includes('identity')) return TEMPLATE_AUTOFILLS.customer_master_reconciliation;
  if (key.includes('gl') || key.includes('ledger') || key.includes('financial') || key.includes('sox')) return TEMPLATE_AUTOFILLS.financial_gl_ledger;

  return TEMPLATE_AUTOFILLS.sap_bw_s4hana;
};
