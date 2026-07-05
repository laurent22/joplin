import re
from typing import Dict, List, Optional, Set

SUPPORTED_POS = ['n', 'v', 'a', 'r']
_wordnet_backend = None


def normalize_word(word: str) -> str:
    return re.sub(r'\s+', '', word.strip().lower())


def load_wordnet_data() -> None:
    """Initialize the WordNet backend once.

    This function is responsible for loading the WordNet data or library
    and storing the backend in a module-level variable.

    Later, get_synonym_candidates() can call this once before looking up a word.
    """
    global _wordnet_backend
    if _wordnet_backend is not None:
        return

    # TODO: choose one of these approaches and replace the placeholder below.
    # 1) Use an installed WordNet library such as NLTK and a bundled corpus.
    # 2) Load preprocessed WordNet files from src/python/wordnet_data.
    # 3) Initialize a custom local lookup index built at build time.
    _wordnet_backend = _init_placeholder_backend()


def _init_placeholder_backend() -> object:
    """Return a placeholder backend until real WordNet loading is implemented."""
    return {
        'synonyms': {
            'large': [
                ('big', 'a'),
                ('huge', 'a'),
                ('massive', 'a'),
            ],
        },
    }


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

    # TODO: replace this with the actual backend lookup call.
    placeholder = _wordnet_backend.get('synonyms', {})
    candidates: List[Dict[str, object]] = []
    seen: Set[str] = set()

    for word, pos in placeholder.get(normalized_word, []):
        if word not in seen:
            seen.add(word)
            candidates.append(format_synonym(word, pos))

    return candidates


def get_synonym_candidates(word: str) -> List[Dict[str, object]]:
    normalized = normalize_word(word)
    if not normalized:
        return []

    return _lookup_wordnet_synonyms(normalized)
