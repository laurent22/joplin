import json
import re
from pathlib import Path
from typing import Any

from thesaurus_nlp.domain.models import Candidate
from thesaurus_nlp.interfaces import AbstractWordNetService


class WordNetService(AbstractWordNetService):
    """Load related-word candidates from the bundled offline dataset."""

    def __init__(self) -> None:
        self._backend: dict[str, list[dict[str, Any]]] | None = None

    def _normalize_word(self, word: str) -> str:
        return re.sub(r'\s+', '', word.strip().lower())

    def _load_backend(self) -> None:
        if self._backend is not None:
            return

        data_path = Path(__file__).resolve().parents[3] / 'src' / 'python' / 'wordnet_data.json'
        with data_path.open('r', encoding='utf-8') as handle:
            self._backend = json.load(handle)

    def get_related_words(self, word: str) -> list[Candidate]:
        """Return related-word candidates for the given word."""
        normalized = self._normalize_word(word)
        if not normalized:
            return []

        self._load_backend()
        if self._backend is None:
            return []

        raw_candidates = self._backend.get(normalized, [])
        seen: set[str] = set()
        candidates: list[Candidate] = []

        for entry in raw_candidates:
            candidate_word = entry.get('word')
            pos = entry.get('pos', 'n')
            if isinstance(candidate_word, str) and candidate_word not in seen:
                seen.add(candidate_word)
                candidates.append(Candidate(word=candidate_word, pos=pos, source='offline-wordnet'))

        return sorted(candidates, key=lambda item: item.word)


class NoOpWordNetService(WordNetService):
    """Backward-compatible alias for the concrete WordNet service."""

    pass