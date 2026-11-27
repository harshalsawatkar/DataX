"""
DataX AI Substrate Package
Provides unified local/BYOK embeddings, structure-aware chunking, hybrid search, and LangGraph harness.
"""

from .embedder import DataXEmbedder, get_embedder, cosine_similarity

__all__ = ["DataXEmbedder", "get_embedder", "cosine_similarity"]
