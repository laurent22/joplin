if __name__ == "__main__":
    # Use the NoOp components for demonstration purposes.
    from thesaurus_nlp.similarity_ranker import NoOpSimilarityRanker
    from thesaurus_nlp.wordnet_service import NoOpWordNetService
    from thesaurus_nlp.pipeline import Pipeline
    from thesaurus_nlp.boundary.worker import Worker
    
    pipeline = Pipeline(NoOpWordNetService(), NoOpSimilarityRanker())
    worker = Worker(callback=pipeline.rank)
    worker.run()