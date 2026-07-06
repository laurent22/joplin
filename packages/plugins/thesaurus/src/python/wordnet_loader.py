import json
import re
from pathlib import Path
from typing import Dict, List, Set

SUPPORTED_POS = ['n', 'v', 'a', 'r']
_wordnet_backend = None


def normalize_word(word: str) -> str:
    """Normalize a lookup key so casing and whitespace do not affect results."""
    return re.sub(r'\s+', '', word.strip().lower())


def load_wordnet_data() -> None:
    """Initialize a bundled offline WordNet-style lookup table once."""
    global _wordnet_backend
    if _wordnet_backend is not None:
        return

    data_path = Path(__file__).with_name('wordnet_data.json')
    with data_path.open('r', encoding='utf-8') as handle:
        _wordnet_backend = json.load(handle)


def format_synonym(word: str, pos: str) -> Dict[str, object]:
    return {
        'word': word,
        'score': 1.0,
        'pos': pos,
    }


def _lookup_wordnet_synonyms(normalized_word: str) -> List[Dict[str, object]]:
    load_wordnet_data()

    if _wordnet_backend is None:
        return []

    if normalized_word not in _wordnet_backend:
        return []

    candidates: List[Dict[str, object]] = []
    seen: Set[str] = set()

    for entry in _wordnet_backend.get(normalized_word, []):
        word = entry.get('word')
        pos = entry.get('pos', 'n')
        if isinstance(word, str) and word not in seen:
            seen.add(word)
            candidates.append(format_synonym(word, pos))

    return candidates


def get_synonym_candidates(word: str) -> List[Dict[str, object]]:
    """Return candidate synonym entries for a word from the offline dataset."""
    normalized = normalize_word(word)
    if not normalized:
        return []

    candidates = _lookup_wordnet_synonyms(normalized)
    return sorted(candidates, key=lambda item: item['word'])


def main(words: List[str] | None = None) -> None:
    """Simple CLI entrypoint for manual testing from the terminal."""
    targets = words or []
    if not targets:
        targets = ['large']

    for word in targets:
        results = get_synonym_candidates(word)
        print(f'{word}: {results}')


if __name__ == '__main__':
    import sys
    main(sys.argv[1:])
