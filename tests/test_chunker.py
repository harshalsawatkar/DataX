import pytest
import os
import sys

_TEST_DIR = os.path.dirname(os.path.abspath(__file__))
_PROJECT_ROOT = os.path.dirname(_TEST_DIR)
_BACKEND_DIR = os.path.join(_PROJECT_ROOT, "backend")
for d in [_PROJECT_ROOT, _BACKEND_DIR, os.path.join(_BACKEND_DIR, "ai_substrate")]:
    if d not in sys.path:
        sys.path.insert(0, d)

from ai_substrate.chunker import (
    StructureAwareChunker,
    DocumentChunk
)


def test_chunker_preserves_tables_without_midcell_slicing():
    """
    Gate S1-20: Verifies that embedded markdown mapping tables
    are kept intact as whole table blocks and never sliced mid-cell.
    """
    chunker = StructureAwareChunker(max_chunk_words=100)

    doc = """# SAP S/4HANA Material Master Spec

## 1. General Architecture
This section describes the legacy R/3 to S/4HANA migration specifications.
Ensure all plant codes and storage locations conform to enterprise guidelines.

## 2. Field Mapping Table
| Legacy_Field | S4_Field | Data_Type | Mandatory | Description |
| :--- | :--- | :--- | :--- | :--- |
| MATNR | PRODUCT_ID | CHAR(18) | YES | Material unique identifier |
| MAKTX | PRODUCT_DESC | CHAR(40) | YES | Material descriptive name |
| WERKS | PLANT_CODE | CHAR(4) | YES | Operating plant identifier |
| LGORT | STORAGE_LOC | CHAR(4) | NO | Storage location bin |
| MEINS | BASE_UOM | UNIT(3) | YES | Base unit of measure |
| EKGRP | PURCH_GROUP | CHAR(3) | NO | Purchasing group responsible |

## 3. Post-Migration Validation
All records must undergo Layer-1 statistical verification before commit.
"""
    chunks = chunker.chunk_markdown(doc, filename="SAP_MARA_SPEC.md")

    # Table chunk verification
    table_chunks = [c for c in chunks if c.is_table]
    assert len(table_chunks) >= 1

    table_text = table_chunks[0].text
    # Check that all table columns and rows are together in the chunk
    assert "| MATNR | PRODUCT_ID |" in table_text
    assert "| EKGRP | PURCH_GROUP |" in table_text
    assert table_chunks[0].heading_path == ["SAP S/4HANA Material Master Spec", "2. Field Mapping Table"]


def test_chunker_tabular_rows_preserves_column_headers():
    """Verifies that spreadsheet row chunks replicate headers so embeddings have relational context."""
    chunker = StructureAwareChunker()
    rows = [
        {"vendor_id": f"VND_{i}", "vendor_name": f"Enterprise Supplier {i}", "spend_inr": 10000 * i}
        for i in range(1, 35)
    ]
    chunks = chunker.chunk_tabular_rows(rows, filename="vendors.xlsx", sheet_name="LFA1", rows_per_chunk=10)

    assert len(chunks) == 4
    for c in chunks:
        assert "Columns: vendor_id | vendor_name | spend_inr" in c.text
        assert c.sheet_name == "LFA1"
        assert c.is_table is True


def test_chunker_lifts_100_chunk_cap():
    """
    Gate S1-20: Verifies that documents with >100 sections
    are fully preserved rather than truncated at 100.
    """
    chunker = StructureAwareChunker(max_chunks_limit=2500)

    # 150 sections
    doc_sections = "\n\n".join(f"## Section {i}\nDetailed business mapping rule paragraph for field index {i}." for i in range(1, 151))
    chunks = chunker.chunk_markdown(doc_sections, filename="large_spec.md")

    assert len(chunks) >= 150
    assert chunks[-1].heading_path == ["Section 150"]
