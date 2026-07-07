from dataclasses import dataclass

@dataclass
class Candidate:
    word: str
    pos: str
    source: str | None = None

@dataclass
class ScoredCandidate(Candidate):
    score: float = 0.0

    @classmethod
    def from_candidate(cls, candidate: Candidate, score: float) -> 'ScoredCandidate':
        """Create a ScoredCandidate from a Candidate and a score."""
        return cls(word=candidate.word, pos=candidate.pos, source=candidate.source, score=score)