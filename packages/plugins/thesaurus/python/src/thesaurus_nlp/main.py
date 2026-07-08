if __name__ == "__main__":
    from thesaurus_nlp.similarity_ranker import NoOpSimilarityRanker
    from thesaurus_nlp.wordnet_service import WordNetService
    from thesaurus_nlp.pipeline import Pipeline
    from thesaurus_nlp.boundary.worker import Worker

    pipeline = Pipeline(WordNetService(), NoOpSimilarityRanker())
    worker = Worker(callback=pipeline.rank)
    worker.run()