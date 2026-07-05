from thesaurus_nlp.boundary.schemas import RankRequest, RankResponse
from thesaurus_nlp.domain.models import Candidate, ScoredCandidate
from thesaurus_nlp.interfaces import AbstractSimilarityRanker


class NoOpSimilarityRanker(AbstractSimilarityRanker):
    """A no-op similarity ranker that returns the input synonyms without any changes."""

    def score_candidates(self, candidates: list[Candidate], context: str | None) -> list[ScoredCandidate]:
        """Return the input candidates as scored candidates with a default score of 0.0."""
        return [ScoredCandidate(**candidate.__dict__, score=0.0) for candidate in candidates]
