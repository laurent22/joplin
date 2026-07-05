from dataclasses import dataclass

@dataclass
class Candidate:
    word: str
    pos: str
    source: str | None = None

@dataclass
class ScoredCandidate(Candidate):
    score: float = 0.0
