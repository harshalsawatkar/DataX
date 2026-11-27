import pytest
import os
import sys

_TEST_DIR = os.path.dirname(os.path.abspath(__file__))
_PROJECT_ROOT = os.path.dirname(_TEST_DIR)
_BACKEND_DIR = os.path.join(_PROJECT_ROOT, "backend")
for d in [_PROJECT_ROOT, _BACKEND_DIR, os.path.join(_BACKEND_DIR, "ai_substrate")]:
    if d not in sys.path:
        sys.path.insert(0, d)

from ai_substrate.embedder import (
    DataXEmbedder,
    get_embedder,
    cosine_similarity
)


def test_embedder_dimension_and_normalization():
    """Gate S1-19: Verifies local ONNX embedder outputs 384-dim normalized unit vectors."""
    embedder = get_embedder()
    assert embedder.dimension == 384

    vec = embedder.embed_single("SAP Material Master MARA table")
    assert len(vec) == 384

    # Assert unit norm (sum of squares == 1.0)
    norm_sq = sum(x * x for x in vec)
    assert abs(norm_sq - 1.0) < 1e-3


def test_embedder_semantic_similarity_discrimination():
    """
    Gate S1-19: Verifies real semantic discrimination:
    sim("hydraulic pump", "centrifugal pump") > 0.75
    sim("hydraulic pump", "quarterly tax return") < 0.52
    with semantic separation > 0.20
    """
    embedder = get_embedder()

    sim_related = embedder.similarity("hydraulic pump", "centrifugal pump")
    sim_unrelated = embedder.similarity("hydraulic pump", "quarterly tax return")

    assert sim_related > 0.75, f"Expected sim_related > 0.75, got {sim_related}"
    assert sim_unrelated < 0.52, f"Expected sim_unrelated < 0.52, got {sim_unrelated}"
    assert (sim_related - sim_unrelated) > 0.20, f"Expected separation > 0.20, got {sim_related - sim_unrelated}"


def test_embedder_batch_embedding_throughput():
    """Verifies batch embedding handles multiple strings consistently."""
    embedder = get_embedder()
    batch = [
        "Purchase Order Delivery Date",
        "Vendor Invoice Reconciliation",
        "Aadhaar Number Tokenization",
        "Data Quality Consensus Guard"
    ]
    results = embedder.embed(batch)
    assert len(results) == 4
    for r in results:
        assert len(r) == 384


def test_embedder_v1_embeddings_api_endpoint():
    """Gate S1-19: Verifies POST /v1/embeddings returns real 384-dim vectors."""
    from fastapi.testclient import TestClient
    from service import app

    client = TestClient(app)
    payload = {
        "input": ["Centrifugal hydraulic pump", "GST invoice reconciliation"],
        "model": "BAAI/bge-small-en-v1.5"
    }
    resp = client.post("/v1/embeddings", json=payload)
    assert resp.status_code == 200

    data = resp.json()
    assert data["object"] == "list"
    assert len(data["data"]) == 2
    assert len(data["data"][0]["embedding"]) == 384
    assert len(data["data"][1]["embedding"]) == 384
    assert data["dimension"] == 384
    assert data["usage"]["total_tokens"] > 0
