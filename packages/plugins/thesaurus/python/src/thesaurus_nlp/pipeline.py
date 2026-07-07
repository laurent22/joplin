from thesaurus_nlp.boundary.schemas import RankRequest, RankResponse, SynonymEntry
from thesaurus_nlp.interfaces import AbstractPipeline, AbstractSimilarityRanker, AbstractWordNetService

class Pipeline(AbstractPipeline):
    def __init__(self, wordnet_service: AbstractWordNetService, similarity_ranker: AbstractSimilarityRanker):
        self.wordnet_service = wordnet_service
        self.similarity_ranker = similarity_ranker
        
    def rank(self, request: RankRequest, min_score: float = 0.0) -> RankResponse:
        """Run the pipeline with the given request."""
        # Step 1: Get related words from the WordNet service
        candidates = self.wordnet_service.get_related_words(request.word)
        
        # Step 2: Score the candidates based on the context
        scored_candidates = self.similarity_ranker.score_candidates(candidates, request.word, request.context)
        scored_candidates.sort(key=lambda x: x.score, reverse=True)

        # Step 3: Prepare the response
        synonyms = [SynonymEntry(word=candidate.word, score=candidate.score, pos=candidate.pos) for candidate in scored_candidates]
        synonyms = synonyms[:request.top_n] if request.top_n is not None else synonyms
        synonyms = [syn for syn in synonyms if syn.score >= min_score]
        
        return RankResponse(id=request.id, results=synonyms)

