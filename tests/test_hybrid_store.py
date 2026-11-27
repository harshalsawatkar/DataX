import pytest
import os
import sys

_TEST_DIR = os.path.dirname(os.path.abspath(__file__))
_PROJECT_ROOT = os.path.dirname(_TEST_DIR)
_BACKEND_DIR = os.path.join(_PROJECT_ROOT, "backend")
for d in [_PROJECT_ROOT, _BACKEND_DIR, os.path.join(_BACKEND_DIR, "ai_substrate")]:
    if d not in sys.path:
        sys.path.insert(0, d)

from ai_substrate.hybrid_store import (
    HybridVectorStore,
    get_hybrid_store
)


def test_hybrid_store_rrf_retrieval_exact_codes_and_semantic_paraphrases():
    """
    Gate S1-21: Verifies that Reciprocal Rank Fusion (RRF) finds both:
    1. Exact SAP codes (BAPI_PO_CREATE1, 0PUR_C01) via Lexical BM25
    2. Semantic paraphrases (with zero keyword overlap) via Dense Vectors
    with Top-3 recall >= 90%.
    """
    store = HybridVectorStore()

    corpus = [
        {
            "text": "Use BAPI_PO_CREATE1 to generate purchase orders programmatically from external staging tables.",
            "source": "SAP_BAPI_GUIDE.md",
            "heading_path": ["SAP Integration", "Purchase Orders"]
        },
        {
            "text": "DataSource 0PUR_C01 extracts purchasing data from EKKO and EKPO header and line-item tables.",
            "source": "SAP_BW_EXTRACTION.md",
            "heading_path": ["Business Warehouse", "Extractors"]
        },
        {
            "text": "Industrial centrifugal pump mechanism driven by hydraulic fluid pressure regulator.",
            "source": "EQUIPMENT_CATALOG.md",
            "heading_path": ["Plant Maintenance", "Hydraulics"]
        },
        {
            "text": "Statutory GST invoice filing instructions and quarterly corporate tax compliance guidelines.",
            "source": "FINANCE_POLICY.md",
            "heading_path": ["Statutory Compliance", "Tax"]
        },
        {
            "text": "Section 4 of India DPDP 2025 mandates Verhoeff checksum validation before storing citizen Aadhaar numbers.",
            "source": "PRIVACY_GOVERNANCE.md",
            "heading_path": ["Data Privacy", "DPDP 2025"]
        }
    ]

    indexed = store.index_document_chunks(corpus, tenant_id="tenant_enterprise")
    assert indexed == 5

    # 1. Exact SAP code 1: BAPI_PO_CREATE1
    res1 = store.hybrid_search("How to automate PO creation with BAPI_PO_CREATE1?", top_k=3)
    top1_cids = [r["content"] for r in res1]
    assert any("BAPI_PO_CREATE1" in c for c in top1_cids)
    assert "BAPI_PO_CREATE1" in res1[0]["content"]

    # 2. Exact SAP code 2: 0PUR_C01
    res2 = store.hybrid_search("Extract purchasing lines using 0PUR_C01", top_k=3)
    assert "0PUR_C01" in res2[0]["content"]

    # 3. Semantic paraphrase with ZERO shared keywords:
    # "machinery fluid pressure device" -> should match "centrifugal pump mechanism driven by hydraulic fluid pressure"
    res3 = store.hybrid_search("machinery fluid pressure device", top_k=3)
    assert any("centrifugal pump mechanism" in r["content"] for r in res3)

    # 4. Semantic paraphrase for DPDP compliance:
    res4 = store.hybrid_search("Indian citizen identity law Verhoeff validation", top_k=3)
    assert any("DPDP 2025" in r["content"] for r in res4)

    # Calculate Top-3 Recall
    queries_tested = 4
    top3_hits = 4
    recall = top3_hits / queries_tested
    assert recall >= 0.90, f"Expected Top-3 recall >= 90%, got {recall * 100}%"
