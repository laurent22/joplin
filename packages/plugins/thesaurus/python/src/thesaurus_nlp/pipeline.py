from thesaurus_nlp.boundary.schemas import RankRequest, RankResponse, SynonymEntry
from thesaurus_nlp.interfaces import AbstractPipeline, AbstractSimilarityRanker, AbstractWordNetService

class Pipeline(AbstractPipeline):
    def __init__(self, wordnet_service: AbstractWordNetService, similarity_ranker: AbstractSimilarityRanker):
        self.wordnet_service = wordnet_service
        self.similarity_ranker = similarity_ranker
        
    def rank(self, request: RankRequest) -> RankResponse:
        """Run the pipeline with the given request."""
        # Step 1: Get related words from the WordNet service
        candidates = self.wordnet_service.get_related_words(request.word)
        
        # Step 2: Score the candidates based on the context
        scored_candidates = self.similarity_ranker.score_candidates(candidates, request.context)
        
        # Step 3: Prepare the response
        synonyms = [SynonymEntry(word=candidate.word, score=candidate.score, pos=candidate.pos) for candidate in scored_candidates]
        
        return RankResponse(id=request.id, results=synonyms)

