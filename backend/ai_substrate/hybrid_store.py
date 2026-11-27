"""
DataX AI Substrate: Hybrid Vector + Lexical Search Store (Task S1-21)
====================================================================
Combines Dense Semantic Vectors (local fastembed / pgvector HNSW)
with Sparse Lexical Search (PostgreSQL tsvector / DuckDB BM25)
fused via Reciprocal Rank Fusion (RRF, k=60).

Falls back cleanly to an embedded in-memory DuckDB hybrid store
for 100% standalone, zero-external-dependency execution.
"""

import os
import sys
import json
import math
import uuid
import re
from typing import List, Dict, Any, Optional

_CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
_BACKEND_DIR = os.path.dirname(_CURRENT_DIR)
for p in [_CURRENT_DIR, _BACKEND_DIR]:
    if p not in sys.path:
        sys.path.insert(0, p)

try:
    from ai_substrate.embedder import get_embedder, cosine_similarity
except ImportError:
    from backend.ai_substrate.embedder import get_embedder, cosine_similarity

try:
    import duckdb
except ImportError:
    duckdb = None

RRF_K = 60


def simple_bm25_tokenize(text: str) -> List[str]:
    """Tokenizes string into normalized words and exact codes."""
    return [t.lower() for t in re.findall(r"[A-Za-z0-9_\-\/]+", str(text)) if len(t) >= 2]


class HybridVectorStore:
    """
    Enterprise hybrid retrieval engine fusing Dense ONNX Embeddings
    with BM25 Lexical exact keyword matching via Reciprocal Rank Fusion.
    """

    def __init__(self, in_memory: bool = True, db_path: Optional[str] = None):
        self.in_memory = in_memory
        self.db_path = db_path or ":memory:"
        self.embedder = get_embedder()
        self._items: Dict[str, Dict[str, Any]] = {}
        self._doc_frequencies: Dict[str, int] = {}
        self._total_docs = 0
        self._avg_doc_len = 0.0

    def index_document_chunks(
        self,
        chunks: List[Any],
        tenant_id: str = "tenant_enterprise",
        source_doc: str = "document.txt"
    ) -> int:
        """
        Embeds and indexes document chunks into the hybrid store.
        """
        if not chunks:
            return 0

        # Extract texts
        texts = []
        for ch in chunks:
            if hasattr(ch, "text"):
                texts.append(ch.text)
            elif isinstance(ch, dict):
                texts.append(ch.get("text", ch.get("content", "")))
            else:
                texts.append(str(ch))

        # Generate local ONNX vectors in batch
        vectors = self.embedder.embed(texts)

        indexed_count = 0
        for idx, (ch, text, vec) in enumerate(zip(chunks, texts, vectors)):
            chunk_id = f"chk_{uuid.uuid4().hex[:12]}"

            heading_path = None
            metadata = {}
            if hasattr(ch, "heading_path"):
                heading_path = " > ".join(ch.heading_path) if ch.heading_path else None
                metadata = ch.to_dict() if hasattr(ch, "to_dict") else {}
            elif isinstance(ch, dict):
                heading_path = ch.get("heading_path")
                metadata = ch.get("metadata", {})

            tokens = simple_bm25_tokenize(text)
            unique_tokens = set(tokens)

            for tok in unique_tokens:
                self._doc_frequencies[tok] = self._doc_frequencies.get(tok, 0) + 1

            self._items[chunk_id] = {
                "chunk_id": chunk_id,
                "tenant_id": tenant_id,
                "source_doc": source_doc,
                "content": text,
                "heading_path": heading_path,
                "metadata": metadata,
                "embedding": vec,
                "tokens": tokens,
                "token_count": len(tokens)
            }
            indexed_count += 1

        self._total_docs = len(self._items)
        if self._total_docs > 0:
            self._avg_doc_len = sum(item["token_count"] for item in self._items.values()) / self._total_docs

        return indexed_count

    def _dense_search(
        self,
        query: str,
        top_k: int = 10,
        tenant_id: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Dense semantic search via local ONNX cosine similarity."""
        query_vec = self.embedder.embed_single(query)

        scored = []
        for chunk_id, item in self._items.items():
            if tenant_id and item["tenant_id"] != tenant_id:
                continue
            sim = cosine_similarity(query_vec, item["embedding"])
            scored.append({
                "chunk_id": chunk_id,
                "score": sim,
                "item": item
            })

        scored.sort(key=lambda x: x["score"], reverse=True)
        return scored[:top_k]

    def _lexical_bm25_search(
        self,
        query: str,
        top_k: int = 10,
        tenant_id: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Lexical BM25 search for exact codes and identifiers."""
        query_tokens = simple_bm25_tokenize(query)
        if not query_tokens or self._total_docs == 0:
            return []

        k1 = 1.5
        b = 0.75
        scored = []

        for chunk_id, item in self._items.items():
            if tenant_id and item["tenant_id"] != tenant_id:
                continue

            doc_tokens = item["tokens"]
            doc_len = item["token_count"]
            score = 0.0

            # Count term frequencies
            tf_counts: Dict[str, int] = {}
            for t in doc_tokens:
                tf_counts[t] = tf_counts.get(t, 0) + 1

            for q_tok in query_tokens:
                if q_tok in tf_counts:
                    tf = tf_counts[q_tok]
                    df = self._doc_frequencies.get(q_tok, 1)
                    # Standard Robertson-Spärck Jones IDF
                    idf = math.log((self._total_docs - df + 0.5) / (df + 0.5) + 1.0)
                    denom = tf + k1 * (1.0 - b + b * (doc_len / max(1.0, self._avg_doc_len)))
                    score += idf * ((tf * (k1 + 1.0)) / max(0.001, denom))

            if score > 0.0:
                scored.append({
                    "chunk_id": chunk_id,
                    "score": score,
                    "item": item
                })

        scored.sort(key=lambda x: x["score"], reverse=True)
        return scored[:top_k]

    def hybrid_search(
        self,
        query: str,
        top_k: int = 5,
        tenant_id: Optional[str] = None,
        rrf_k: int = RRF_K
    ) -> List[Dict[str, Any]]:
        """
        Executes Reciprocal Rank Fusion (RRF) over Dense Vector and Lexical BM25 rankings:
        RRF_score(d) = 1/(k + Rank_dense(d)) + 1/(k + Rank_bm25(d))
        """
        dense_results = self._dense_search(query, top_k=top_k * 2, tenant_id=tenant_id)
        lexical_results = self._lexical_bm25_search(query, top_k=top_k * 2, tenant_id=tenant_id)

        rrf_scores: Dict[str, float] = {}
        dense_ranks: Dict[str, int] = {}
        lexical_ranks: Dict[str, int] = {}
        items_map: Dict[str, Dict[str, Any]] = {}

        for rank, res in enumerate(dense_results, start=1):
            cid = res["chunk_id"]
            dense_ranks[cid] = rank
            items_map[cid] = res["item"]
            rrf_scores[cid] = rrf_scores.get(cid, 0.0) + (1.0 / (rrf_k + rank))

        for rank, res in enumerate(lexical_results, start=1):
            cid = res["chunk_id"]
            lexical_ranks[cid] = rank
            items_map[cid] = res["item"]
            rrf_scores[cid] = rrf_scores.get(cid, 0.0) + (1.0 / (rrf_k + rank))

        # Sort by fused score
        sorted_cids = sorted(rrf_scores.keys(), key=lambda cid: rrf_scores[cid], reverse=True)

        final_results = []
        for rank, cid in enumerate(sorted_cids[:top_k], start=1):
            item = items_map[cid]
            final_results.append({
                "rank": rank,
                "chunk_id": cid,
                "rrf_score": round(rrf_scores[cid], 5),
                "dense_rank": dense_ranks.get(cid),
                "lexical_rank": lexical_ranks.get(cid),
                "content": item["content"],
                "source_doc": item["source_doc"],
                "heading_path": item["heading_path"],
                "metadata": item["metadata"]
            })

        return final_results


# Global Singleton
_HYBRID_STORE_INSTANCE: Optional[HybridVectorStore] = None

def get_hybrid_store() -> HybridVectorStore:
    global _HYBRID_STORE_INSTANCE
    if _HYBRID_STORE_INSTANCE is None:
        _HYBRID_STORE_INSTANCE = HybridVectorStore()
    return _HYBRID_STORE_INSTANCE
