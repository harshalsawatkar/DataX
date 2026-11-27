import {
  FileText,
  Database,
  Globe,
  Bot,
  ShieldAlert,
  Lock,
  EyeOff,
  Split,
  DollarSign,
  UserCheck,
  GitBranch,
  Layers,
  FileCheck2,
  AlertTriangle,
  Play
} from 'lucide-react';

export const FIREWALL_NODE_CATALOG = [
  {
    category: '1. Ingestion Sources',
    items: [
      {
        type: 'file_doc',
        category: 'Ingest',
        illo: 'source',
        name: 'Document ingestion',
        desc: 'Extract text from PDF, DOCX, TXT, or Markdown documents',
        system: 'Vendor contract PDF',
        metaKey: 'File',
        metaVal: 'Vendor_Contract.pdf',
        defaultStatus: 'Demo',
        icon: FileText,
        variant: 'blue',
        defaultConfig: {
          sampleDoc: 'Vendor_Contract.pdf',
          sampleText:
            'This agreement entered into by Harshal (SSN: 987-65-4321, harshal@enterprise.internal) contains proprietary OpenAI key [OPENAI_KEY_REDACTED] and database uri [DATABASE_URI_REDACTED].',
          maxBytes: 10485760
        }
      },
      {
        type: 'db_source',
        category: 'Ingest',
        illo: 'source',
        name: 'Database column extractor',
        desc: 'Extract unstructured text chunks or agent logs from PostgreSQL or MongoDB',
        system: 'PostgreSQL corpus',
        metaKey: 'Table',
        metaVal: 'master_knowledge_docs',
        defaultStatus: 'Active',
        icon: Database,
        variant: 'blue',
        defaultConfig: {
          engine: 'postgres',
          table: 'master_knowledge_docs',
          textColumn: 'body',
          limit: 100
        }
      },
      {
        type: 'web_crawler',
        category: 'Ingest',
        illo: 'source',
        name: 'Web & API doc crawler',
        desc: 'Fetch public URLs or internal wiki pages with semantic tag strip',
        system: 'Public documentation URL',
        metaKey: 'Host',
        metaVal: 'docs.datax.internal',
        defaultStatus: 'Active',
        icon: Globe,
        variant: 'blue',
        defaultConfig: {
          url: 'https://docs.datax.internal/api/security',
          stripNavAndFooter: true
        }
      },
      {
        type: 'agent_telemetry',
        category: 'Intercept',
        illo: 'source',
        name: 'Agent tool interceptor',
        desc: 'Synchronously capture in-flight tool calls (Stripe refund, SQL drop, AWS API)',
        system: 'In-flight webhook proxy',
        metaKey: 'Agent',
        metaVal: 'support_bot_v2',
        defaultStatus: 'Active',
        icon: Bot,
        variant: 'purple',
        defaultConfig: {
          agentName: 'support_bot_v2',
          targetTool: 'stripe_refund',
          sampleArgs: JSON.stringify(
            { amount: 1200, user_id: 'usr_84920', reason: 'customer disputed charge' },
            null,
            2
          )
        }
      }
    ]
  },
  {
    category: '2. Inspection & Scrubbers',
    items: [
      {
        type: 'chunker_node',
        category: 'Chunker',
        illo: 'pack',
        name: 'Semantic chunker',
        desc: 'Split documents into overlapping chunks before vector embedding calculation',
        system: 'Overlap token splitter',
        metaKey: 'Window',
        metaVal: '1,200 tokens',
        defaultStatus: 'Active',
        icon: Split,
        variant: 'blue',
        defaultConfig: {
          chunkSize: 1200,
          chunkOverlap: 120
        }
      },
      {
        type: 'secret_scrubber',
        category: 'Secrets',
        illo: 'quarantine',
        name: 'Secret & key scrubber',
        desc: 'Redact OpenAI, AWS, GitHub PATs, JWT bearer tokens, and high-entropy secrets',
        system: 'High entropy + key filter',
        metaKey: 'Signatures',
        metaVal: '4',
        defaultStatus: 'Auto-redact',
        icon: Lock,
        variant: 'amber',
        defaultConfig: {
          redactOpenAi: true,
          redactAws: true,
          redactDbPass: true,
          redactHighEntropy: true
        }
      },
      {
        type: 'pii_scrubber',
        category: 'PII',
        illo: 'autofix',
        name: 'PII redactor',
        desc: 'Deterministic masking of SSN, Credit Cards (Luhn check), Emails, and Phones',
        system: 'SSN, card & email',
        metaKey: 'Method',
        metaVal: 'AES-GCM token',
        defaultStatus: 'Auto-mask',
        icon: EyeOff,
        variant: 'amber',
        defaultConfig: {
          maskSsn: true,
          maskCards: true,
          maskEmails: true,
          maskPhones: false
        }
      },
      {
        type: 'prompt_injection',
        category: 'Injection',
        illo: 'sandbox',
        name: 'Prompt injection guard',
        desc: 'Detect DAN, system-override, exfiltration, and adversarial escape payloads (<5ms AST scan)',
        system: 'Deterministic AST scan',
        metaKey: 'Policy',
        metaVal: 'Jailbreak filter',
        defaultStatus: 'Armed',
        icon: ShieldAlert,
        variant: 'red',
        defaultConfig: {
          action: 'quarantine',
          sensitivity: 0.85
        }
      }
    ]
  },
  {
    category: '3. Policy & Governance Gates',
    items: [
      {
        type: 'financial_guard',
        category: 'Policy',
        illo: 'sandbox',
        name: 'Financial drain guard',
        desc: 'Enforce maximum financial transaction bounds and rate-limit high-dollar agent actions',
        system: 'Transaction bound gate',
        metaKey: 'Ceiling',
        metaVal: '$5,000',
        defaultStatus: 'Armed',
        icon: DollarSign,
        variant: 'orange',
        defaultConfig: {
          hardCapLimit: 5000,
          hitlThreshold: 500,
          financialFields: 'amount, refund_amount, total'
        }
      },
      {
        type: 'hitl_gate',
        category: 'Review',
        illo: 'autofix',
        name: 'Human approval gate',
        desc: 'Pause execution and alert security stewards when high-risk actions are detected',
        system: 'Security steward queue',
        metaKey: 'Hold above',
        metaVal: '$500',
        defaultStatus: 'Armed',
        icon: UserCheck,
        variant: 'orange',
        defaultConfig: {
          timeoutSeconds: 300,
          fallbackAction: 'hold',
          approverRoles: 'Admin, Security Auditor'
        }
      },
      {
        type: 'router_gate',
        category: 'Router',
        illo: 'pack',
        name: 'Policy decision router',
        desc: '3-way split: Compliant (pass-through), Sanitized (modified), Quarantined (blocked)',
        system: '3-way split router',
        metaKey: 'Paths',
        metaVal: '3-way split',
        defaultStatus: 'Active',
        icon: GitBranch,
        variant: 'purple',
        defaultConfig: {
          allowClean: true,
          allowSanitized: true,
          quarantineRiskThreshold: 6.0
        }
      }
    ]
  },
  {
    category: '4. Sinks & Deliverables',
    items: [
      {
        type: 'rag_ledger',
        category: 'Target',
        illo: 'target',
        name: 'Verified RAG ledger',
        desc: 'Commit clean text chunks to persistent on-prem ledger (rag_chunks_clean)',
        system: 'PostgreSQL pgvector',
        metaKey: 'Table',
        metaVal: 'rag_chunks_clean',
        defaultStatus: 'Ready',
        icon: Layers,
        variant: 'green',
        defaultConfig: {
          tableName: 'rag_chunks_clean',
          computeSha256Seal: true
        }
      },
      {
        type: 'vector_sink',
        category: 'Target',
        illo: 'target',
        name: 'Vector database sink',
        desc: 'Publish sanitized document chunks to pgvector or Pinecone embeddings table',
        system: 'Pinecone / pgvector',
        metaKey: 'Index',
        metaVal: 'enterprise_kb',
        defaultStatus: 'Ready',
        icon: FileCheck2,
        variant: 'green',
        defaultConfig: {
          sinkType: 'pgvector',
          collection: 'enterprise_knowledge_base'
        }
      },
      {
        type: 'quarantine_sink',
        category: 'DLQ',
        illo: 'quarantine',
        name: 'Quarantine store',
        desc: 'Isolate malicious prompt injections and credential leaks with cryptographic audit hash',
        system: 'Dead-letter isolation',
        metaKey: 'Table',
        metaVal: 'firewall_dlq',
        defaultStatus: 'Locked',
        icon: AlertTriangle,
        variant: 'red',
        defaultConfig: {
          tableName: 'firewall_dlq',
          notifyOnQuarantine: true
        }
      },
      {
        type: 'agent_executor',
        category: 'Target',
        illo: 'target',
        name: 'Safe tool execution',
        desc: 'Dispatch sanitized payload to live customer API/tool with tamper-evident audit receipt',
        system: 'Stripe / Production API',
        metaKey: 'Tool',
        metaVal: 'stripe_refund',
        defaultStatus: 'Ready',
        icon: Play,
        variant: 'green',
        defaultConfig: {
          dispatchMode: 'dry_run_first'
        }
      }
    ]
  }
];

export const FIREWALL_TEMPLATES = [
  {
    id: 'rag_pre_embedding',
    shortLabel: 'RAG sanitizer',
    subtitle: 'Pre-embedding firewall',
    name: 'RAG sanitizer',
    description:
      'Ingest raw documents, split into chunks, scrub credentials and PII, block prompt injections, and commit verified chunks to pgvector.',
    nodes: [
      {
        id: 'node_f1',
        type: 'file_doc',
        illo: 'source',
        category: 'Ingest',
        title: 'Document ingestion',
        system: 'Vendor contract PDF',
        status: 'Demo',
        metaKey: 'File',
        metaVal: 'Vendor_Contract.pdf',
        x: 160,
        y: 205,
        variant: 'blue',
        config: {
          sampleDoc: 'Vendor_Contract.pdf',
          sampleText:
            'Vendor agreement between AAVIL Inc and Partner Corp. Contact Harshal at harshal@enterprise.internal (SSN: 987-65-4321). OpenAI credentials: [API_KEY_REDACTED]. DB connection: [DB_CONNECTION_REDACTED].'
        }
      },
      {
        id: 'node_f2',
        type: 'chunker_node',
        illo: 'pack',
        category: 'Chunker',
        title: 'Semantic chunker',
        system: 'Overlap token splitter',
        status: 'Active',
        metaKey: 'Window',
        metaVal: '1,200 tokens',
        x: 394,
        y: 205,
        variant: 'indigo',
        config: { chunkSize: 1200, chunkOverlap: 120 }
      },
      {
        id: 'node_f3',
        type: 'secret_scrubber',
        illo: 'quarantine',
        category: 'Secrets',
        title: 'Secret & key scrubber',
        system: 'High entropy + key filter',
        status: 'Auto-redact',
        metaKey: 'Signatures',
        metaVal: '4',
        x: 628,
        y: 85,
        variant: 'orange',
        config: {
          redactOpenAi: true,
          redactAws: true,
          redactDbPass: true,
          redactHighEntropy: true
        }
      },
      {
        id: 'node_f4',
        type: 'pii_scrubber',
        illo: 'autofix',
        category: 'PII',
        title: 'PII redactor',
        system: 'SSN, card & email',
        status: 'Auto-mask',
        metaKey: 'Method',
        metaVal: 'AES-GCM token',
        x: 628,
        y: 335,
        variant: 'purple',
        config: { maskSsn: true, maskCards: true, maskEmails: true, maskPhones: false }
      },
      {
        id: 'node_f5',
        type: 'prompt_injection',
        illo: 'sandbox',
        category: 'Injection',
        title: 'Prompt injection guard',
        system: 'Deterministic AST scan',
        status: 'Armed',
        metaKey: 'Policy',
        metaVal: 'Jailbreak filter',
        x: 862,
        y: 205,
        variant: 'purple',
        config: { action: 'quarantine', sensitivity: 0.85 }
      },
      {
        id: 'node_f6',
        type: 'rag_ledger',
        illo: 'target',
        category: 'Target',
        title: 'Verified RAG ledger',
        system: 'PostgreSQL pgvector',
        status: 'Ready',
        metaKey: 'Table',
        metaVal: 'rag_chunks_clean',
        x: 1096,
        y: 85,
        variant: 'green',
        config: { tableName: 'rag_chunks_clean' }
      },
      {
        id: 'node_f7',
        type: 'quarantine_sink',
        illo: 'quarantine',
        category: 'DLQ',
        title: 'Quarantine store',
        system: 'Dead-letter isolation',
        status: 'Locked',
        metaKey: 'Table',
        metaVal: 'firewall_dlq',
        x: 1096,
        y: 335,
        variant: 'orange',
        config: { tableName: 'firewall_dlq' }
      }
    ],
    edges: [
      { id: 'e1-2', source: 'node_f1', target: 'node_f2', label: 'Raw', variant: 'blue', fromSlot: 'mid', toSlot: 'mid' },
      { id: 'e2-3', source: 'node_f2', target: 'node_f3', label: '', variant: 'blue', fromSlot: 'upper', toSlot: 'mid' },
      { id: 'e2-4', source: 'node_f2', target: 'node_f4', label: '', variant: 'blue', fromSlot: 'lower', toSlot: 'mid' },
      { id: 'e3-5', source: 'node_f3', target: 'node_f5', label: '', variant: 'blue', fromSlot: 'mid', toSlot: 'upper' },
      { id: 'e4-5', source: 'node_f4', target: 'node_f5', label: '', variant: 'blue', fromSlot: 'mid', toSlot: 'lower' },
      { id: 'e5-6', source: 'node_f5', target: 'node_f6', label: 'Compliant', variant: 'blue', fromSlot: 'upper', toSlot: 'mid' },
      { id: 'e5-7', source: 'node_f5', target: 'node_f7', label: 'Violations', variant: 'dashed', fromSlot: 'lower', toSlot: 'mid' }
    ]
  },
  {
    id: 'agent_tool_guard',
    shortLabel: 'Agent tool guard',
    subtitle: 'In-flight tool firewall',
    name: 'Agent tool guard',
    description:
      'Intercept in-flight autonomous agent tool calls, verify financial bounds, scrub secrets, trigger HITL on high amounts, and safely dispatch.',
    nodes: [
      {
        id: 'node_ag1',
        type: 'agent_telemetry',
        illo: 'source',
        category: 'Intercept',
        title: 'Agent tool interceptor',
        system: 'In-flight webhook proxy',
        status: 'Active',
        metaKey: 'Agent',
        metaVal: 'support_bot_v2',
        x: 160,
        y: 205,
        variant: 'blue',
        config: {
          agentName: 'support_bot_v2',
          targetTool: 'stripe_refund',
          sampleArgs: JSON.stringify(
            { amount: 1200, currency: 'usd', customer_id: 'cus_8812' },
            null,
            2
          )
        }
      },
      {
        id: 'node_ag2',
        type: 'financial_guard',
        illo: 'sandbox',
        category: 'Policy',
        title: 'Financial drain guard',
        system: 'Transaction bound gate',
        status: 'Armed',
        metaKey: 'Ceiling',
        metaVal: '$5,000',
        x: 394,
        y: 205,
        variant: 'purple',
        config: { hardCapLimit: 5000, hitlThreshold: 500 }
      },
      {
        id: 'node_ag3',
        type: 'hitl_gate',
        illo: 'autofix',
        category: 'Review',
        title: 'Human approval gate',
        system: 'Security steward queue',
        status: 'Armed',
        metaKey: 'Hold above',
        metaVal: '$500',
        x: 628,
        y: 85,
        variant: 'orange',
        config: { approverRoles: 'Admin, Security Lead', timeoutSeconds: 300 }
      },
      {
        id: 'node_ag4',
        type: 'secret_scrubber',
        illo: 'quarantine',
        category: 'Secrets',
        title: 'In-flight arg sanitizer',
        system: 'Payload key & PII masker',
        status: 'Auto-redact',
        metaKey: 'Signatures',
        metaVal: '4',
        x: 628,
        y: 335,
        variant: 'indigo',
        config: { redactOpenAi: true, redactAws: true, redactDbPass: true, redactHighEntropy: true }
      },
      {
        id: 'node_ag5',
        type: 'agent_executor',
        illo: 'target',
        category: 'Target',
        title: 'Safe tool execution',
        system: 'Stripe / Production API',
        status: 'Ready',
        metaKey: 'Tool',
        metaVal: 'stripe_refund',
        x: 862,
        y: 85,
        variant: 'green',
        config: { dispatchMode: 'dry_run_first' }
      },
      {
        id: 'node_ag6',
        type: 'quarantine_sink',
        illo: 'quarantine',
        category: 'DLQ',
        title: 'Blocked calls ledger',
        system: 'PostgreSQL audit queue',
        status: 'Locked',
        metaKey: 'Table',
        metaVal: 'firewall_events',
        x: 862,
        y: 335,
        variant: 'orange',
        config: { tableName: 'datax_firewall_events' }
      }
    ],
    edges: [
      { id: 'eag1-2', source: 'node_ag1', target: 'node_ag2', label: 'Payload', variant: 'blue', fromSlot: 'mid', toSlot: 'mid' },
      { id: 'eag2-3', source: 'node_ag2', target: 'node_ag3', label: '', variant: 'blue', fromSlot: 'upper', toSlot: 'mid' },
      { id: 'eag2-4', source: 'node_ag2', target: 'node_ag4', label: '', variant: 'blue', fromSlot: 'lower', toSlot: 'mid' },
      { id: 'eag3-5', source: 'node_ag3', target: 'node_ag5', label: 'Approved', variant: 'blue', fromSlot: 'mid', toSlot: 'mid' },
      { id: 'eag4-5', source: 'node_ag4', target: 'node_ag5', label: '', variant: 'blue', fromSlot: 'upper', toSlot: 'lower' },
      { id: 'eag4-6', source: 'node_ag4', target: 'node_ag6', label: 'Blocked', variant: 'dashed', fromSlot: 'lower', toSlot: 'mid' }
    ]
  }
];
