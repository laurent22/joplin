from thesaurus_nlp.boundary.schemas import RankRequest, RankResponse
from thesaurus_nlp.interfaces import AbstractPipeline

class NoOpPipeline(AbstractPipeline):
    def rank(self, request: RankRequest) -> RankResponse:
        """Run the pipeline with the given request."""
        return RankResponse(id=request.id, results=[])

