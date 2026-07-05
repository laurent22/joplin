from thesaurus_nlp.domain.models import Candidate
from thesaurus_nlp.interfaces import AbstractWordNetService


class NoOpWordNetService(AbstractWordNetService):
    """A no-op implementation of the WordNet service."""

    def get_related_words(self, word: str) -> list[Candidate]:
        """Return an empty list of synonyms."""
        return []