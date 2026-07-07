import logging

from sentence_transformers import SentenceTransformer
from sentence_transformers.util import cos_sim

from thesaurus_nlp.domain.enums import DEFAULT_MODEL, ModelType
from thesaurus_nlp.domain.models import Candidate, ScoredCandidate
from thesaurus_nlp.interfaces import AbstractSimilarityRanker

logger = logging.getLogger(__name__)

class NoOpSimilarityRanker(AbstractSimilarityRanker):
    """A no-op similarity ranker that returns the input synonyms without any changes."""

    def score_candidates(self, candidates: list[Candidate], word: str, context: str | None) -> list[ScoredCandidate]:
        """Return the input candidates as scored candidates with a default score of 0.0."""
        return [ScoredCandidate.from_candidate(candidate, 0.0) for candidate in candidates]

class SimilarityRanker(AbstractSimilarityRanker):
    """Scores candidates based on cosine similarity of context embeddings."""

    def __init__(self, model_name: ModelType | None = None):
        model_name = model_name or DEFAULT_MODEL
        try:
            self.model = SentenceTransformer(model_name, local_files_only=True)
        except Exception:
            logger.info(f"Model '{model_name}' not found locally. Downloading...")
            self.model = SentenceTransformer(model_name)
            
    @staticmethod
    def _replace_word(sentence, old_word, new_word):
        words = sentence.split()
        return " ".join(new_word if w.strip(".,!?;:").lower() == old_word.lower() else w for w in words)
    
    def _get_candidate_contexts(self, candidates: list[Candidate], word: str, context: str | None) -> list[str]:
        """Generate candidate contexts by replacing the target word with each candidate."""
        if context is None:
            return [candidate.word for candidate in candidates]
        return [self._replace_word(context, word, candidate.word) for candidate in candidates]
    
    def score_candidates(self, candidates: list[Candidate], word: str, context: str | None) -> list[ScoredCandidate]:
        """Score the given candidates based on the context using cosine similarity."""
        if not candidates:
            return []

        candidate_contexts = self._get_candidate_contexts(candidates, word, context)
        embeddings = self.model.encode([context or word] + candidate_contexts, normalize_embeddings=True, convert_to_tensor=True)
        scores = cos_sim(embeddings[0:1], embeddings[1:]).flatten().tolist()

        logger.info(f"Scoring candidates for word '{word}': {dict(zip([c.word for c in candidates], scores))}")

        return [ScoredCandidate.from_candidate(candidate, score) for candidate, score in zip(candidates, scores)]