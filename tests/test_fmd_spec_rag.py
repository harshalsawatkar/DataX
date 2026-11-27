import pytest
import os
import sys

_TEST_DIR = os.path.dirname(os.path.abspath(__file__))
_PROJECT_ROOT = os.path.dirname(_TEST_DIR)
_BACKEND_DIR = os.path.join(_PROJECT_ROOT, "backend")
for d in [_PROJECT_ROOT, _BACKEND_DIR, os.path.join(_BACKEND_DIR, "engines"), os.path.join(_BACKEND_DIR, "ai_substrate")]:
    if d not in sys.path:
        sys.path.insert(0, d)

from engines.fmd_mapping_engine import (
    seed_demo_workspace,
    ask_business_question
)
from ai_substrate.hybrid_store import get_hybrid_store


def test_fmd_ask_hybrid_spec_citations():
    """
    Gate S1-24: Verifies that ask_business_question retrieves grounded citations
    from BOTH structured Excel FMD rows and uploaded unstructured reference spec documents.
    """
    tid = "tenant_test_spec_rag"

    # 1. Seed Excel FMD workspace
    seed_res = seed_demo_workspace(tid)
    assert seed_res["status"] == "success"

    # 2. Index reference specification into hybrid store
    store = get_hybrid_store()
    spec_chunks = [
        {
            "text": "TIME S/4HANA Section 4.2: MAKT-MAKTX material description must be concatenated from legacy SAP description and CMMS asset tag where available.",
            "source": "TIME_R3.2_Material_Master_Spec.pdf",
            "heading_path": ["Design Spec", "Section 4.2 Material Description"]
        }
    ]
    store.index_document_chunks(spec_chunks, tenant_id=tid, source_doc="TIME_R3.2_Material_Master_Spec.pdf")

    # 3. Ask question via Migration Studio
    res = ask_business_question(
        tid=tid,
        question="What is the rule for MAKT-MAKTX material description?",
        target_table="MAKT",
        target_field="MAKTX"
    )

    assert res["status"] == "success"
    assert len(res["citations"]) >= 1, "Expected citations from Excel FMDs"
    assert len(res["spec_citations"]) >= 1, "Expected spec citations from uploaded PDF spec"
    assert res["spec_citations"][0]["file_name"] == "TIME_R3.2_Material_Master_Spec.pdf"
    assert "Section 4.2" in res["spec_citations"][0]["excerpt"]
