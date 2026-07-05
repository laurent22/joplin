# Architecture Story
`RankingService` creates a `RankRequest` and sends it to the Python process through `PythonProcessManager`.

On the Python side, a `Worker` receives the request. The Worker is responsible for the process boundary: deserializing the request, validating required fields, invoking the ranking workflow, catching unrecoverable errors, and returning a `RankResponse`.

The Worker passes the validated `RankRequest` to `RankingOrchestrator`.

`RankingOrchestrator` coordinates the ranking use case. It sends `RankRequest.word` to `WordNetService.get_related_words()`. `WordNetService` queries the WordNet database and returns a list of `Candidate` objects, where each candidate contains the related word, part of speech, and source metadata.

`RankingOrchestrator` then passes the original word, the context sentence, and the candidate list to `SimilarityRanker.score_candidates()`.

`SimilarityRanker` creates a new version of the context sentence for each candidate by replacing the target word with the candidate word. It embeds the original context and each candidate-modified context using MiniLM, computes cosine similarity between the original context embedding and each candidate context embedding, and returns a list of `ScoredCandidate` objects.

`RankingOrchestrator` sorts the scored candidates by similarity score, applies any filtering rules, limits the result set to `RankRequest.topN`, and maps the final candidates into a list of `SynonymEntry(word, score, pos)` objects.

The final result list is returned to the Worker. The Worker builds a successful `RankResponse(RankRequest.id, results)`.

If an unrecoverable error occurs, the Worker returns `RankResponse(RankRequest.id, error)`. Expected empty-result cases, such as no WordNet candidates being found, should return a successful response with an empty results list rather than an error.
