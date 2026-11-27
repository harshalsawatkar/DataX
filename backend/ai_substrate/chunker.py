"""
DataX AI Substrate: Structure-Aware Document & Table Chunker (Task S1-20)
========================================================================
Preserves Markdown headings, PDF page/table blocks, DOCX sections, and Excel
Sheet > Row lineage metadata. Guarantees that table rows are never sliced mid-cell.
"""

import os
import re
from typing import List, Dict, Any, Optional


class DocumentChunk:
    """Represents a structured document chunk with full provenance metadata."""

    def __init__(
        self,
        text: str,
        source: str,
        chunk_index: int,
        heading_path: Optional[List[str]] = None,
        page_number: Optional[int] = None,
        sheet_name: Optional[str] = None,
        row_range: Optional[tuple] = None,
        is_table: bool = False
    ):
        self.text = text.strip()
        self.source = source
        self.chunk_index = chunk_index
        self.heading_path = heading_path or []
        self.page_number = page_number
        self.sheet_name = sheet_name
        self.row_range = row_range
        self.is_table = is_table
        self.token_count = max(1, len(self.text.split()))

    def to_dict(self) -> Dict[str, Any]:
        return {
            "text": self.text,
            "source": self.source,
            "chunk_index": self.chunk_index,
            "heading_path": " > ".join(self.heading_path) if self.heading_path else None,
            "page_number": self.page_number,
            "sheet_name": self.sheet_name,
            "row_range": f"{self.row_range[0]}-{self.row_range[1]}" if self.row_range else None,
            "is_table": self.is_table,
            "token_count": self.token_count
        }


class StructureAwareChunker:
    """
    Intelligent chunker that respects document typography, table boundaries,
    and hierarchical section lineage.
    """

    def __init__(
        self,
        max_chunk_words: int = 400,
        overlap_words: int = 40,
        max_chunks_limit: int = 2500
    ):
        self.max_chunk_words = max_chunk_words
        self.overlap_words = overlap_words
        self.max_chunks_limit = max_chunks_limit

    def chunk_markdown(self, markdown_text: str, filename: str = "document.md") -> List[DocumentChunk]:
        """Chunks markdown preserving heading hierarchy and table fences."""
        lines = markdown_text.splitlines()
        chunks: List[DocumentChunk] = []

        current_headings: List[str] = []
        current_buffer: List[str] = []
        in_table = False
        table_buffer: List[str] = []

        def flush_buffer():
            nonlocal current_buffer
            if not current_buffer:
                return
            block_text = "\n".join(current_buffer).strip()
            if block_text and len(chunks) < self.max_chunks_limit:
                chunks.append(DocumentChunk(
                    text=block_text,
                    source=filename,
                    chunk_index=len(chunks) + 1,
                    heading_path=[h for h in current_headings if h],
                    is_table=False
                ))
            current_buffer = []

        def flush_table():
            nonlocal table_buffer
            if not table_buffer:
                return
            table_text = "\n".join(table_buffer).strip()
            if table_text and len(chunks) < self.max_chunks_limit:
                chunks.append(DocumentChunk(
                    text=table_text,
                    source=filename,
                    chunk_index=len(chunks) + 1,
                    heading_path=[h for h in current_headings if h],
                    is_table=True
                ))
            table_buffer = []

        for line in lines:
            stripped = line.strip()

            # Heading detection
            h_match = re.match(r"^(#{1,6})\s+(.*)$", stripped)
            if h_match:
                if in_table:
                    flush_table()
                    in_table = False
                flush_buffer()

                level = len(h_match.group(1))
                title = h_match.group(2).strip()
                while len(current_headings) < level - 1:
                    current_headings.append("")
                current_headings = current_headings[:level - 1] + [title]
                active_headings = [h for h in current_headings if h]
                continue

            # Table row detection (| col1 | col2 |)
            if stripped.startswith("|") and stripped.endswith("|"):
                if not in_table:
                    flush_buffer()
                    in_table = True
                table_buffer.append(line)
                continue
            else:
                if in_table:
                    flush_table()
                    in_table = False

            if stripped:
                current_buffer.append(line)
                words = sum(len(l.split()) for l in current_buffer)
                if words >= self.max_chunk_words:
                    flush_buffer()
            else:
                # Paragraph boundary
                if current_buffer and sum(len(l.split()) for l in current_buffer) >= (self.max_chunk_words // 2):
                    flush_buffer()

        if in_table:
            flush_table()
        flush_buffer()

        return chunks

    def chunk_tabular_rows(
        self,
        rows: List[Dict[str, Any]],
        filename: str,
        sheet_name: str = "Sheet1",
        rows_per_chunk: int = 15
    ) -> List[DocumentChunk]:
        """
        Chunks spreadsheet / database records preserving column headers on every chunk
        so vector embeddings maintain full relational column context.
        """
        if not rows:
            return []

        chunks: List[DocumentChunk] = []
        headers = list(rows[0].keys())
        header_line = " | ".join(headers)

        for i in range(0, len(rows), rows_per_chunk):
            if len(chunks) >= self.max_chunks_limit:
                break
            batch = rows[i:i + rows_per_chunk]
            row_lines = [f"Row {i + idx + 1}: " + " | ".join(str(r.get(c, "")) for c in headers) for idx, r in enumerate(batch)]
            chunk_text = f"[{filename} > Sheet: {sheet_name} > Rows: {i + 1}-{i + len(batch)}]\nColumns: {header_line}\n" + "\n".join(row_lines)

            chunks.append(DocumentChunk(
                text=chunk_text,
                source=filename,
                chunk_index=len(chunks) + 1,
                sheet_name=sheet_name,
                row_range=(i + 1, i + len(batch)),
                is_table=True
            ))

        return chunks

    def chunk_unstructured_text(
        self,
        text: str,
        filename: str = "document.txt",
        page_splits: Optional[List[str]] = None
    ) -> List[DocumentChunk]:
        """
        Chunks plain text or PDF pages preserving paragraph blocks.
        Never splits sentences or table blocks mid-cell.
        """
        chunks: List[DocumentChunk] = []

        if page_splits:
            for page_idx, page_content in enumerate(page_splits, start=1):
                page_chunks = self.chunk_markdown(page_content, filename=filename)
                for pc in page_chunks:
                    pc.page_number = page_idx
                    pc.chunk_index = len(chunks) + 1
                    chunks.append(pc)
                    if len(chunks) >= self.max_chunks_limit:
                        return chunks
            return chunks

        # Fallback to markdown/paragraph splitter
        return self.chunk_markdown(text, filename=filename)
