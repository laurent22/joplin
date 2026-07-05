from abc import ABC, abstractmethod

from thesaurus_nlp.boundary.schemas import RankRequest, RankResponse
from thesaurus_nlp.domain.models import Candidate, ScoredCandidate

class AbstractPipeline(ABC):
    @abstractmethod
    def rank(self, request: RankRequest) -> RankResponse:
        """Run the pipeline with the given request."""
        ...

class AbstractWordNetService(ABC):
    @abstractmethod
    def get_related_words(self, word: str) -> list[Candidate]:
        """Get related words for the given word."""
        ...

class AbstractSimilarityRanker(ABC):
    @abstractmethod
    def score_candidates(self, candidates: list[Candidate], context: str) -> list[ScoredCandidate]:
        """Score the given candidates based on the context."""
        ...

