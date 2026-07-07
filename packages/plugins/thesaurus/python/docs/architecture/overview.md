# Architecture Story
`RankingService` creates a `RankRequest` and sends it to the Python process through `PythonProcessManager`.

On the Python side, a `Worker` receives the request. The Worker is responsible for the process boundary: deserializing the request, validating required fields, invoking the ranking workflow, catching unrecoverable errors, and returning a `RankResponse`.

The Worker passes the validated `RankRequest` to `RankingOrchestrator`.

`RankingOrchestrator` coordinates the ranking use case. It sends `RankRequest.word` to `WordNetService.get_related_words()`. `WordNetService` queries the WordNet database and returns a list of `Candidate` objects, where each candidate contains the related word, part of speech, and source metadata.

`RankingOrchestrator` then passes the original word, the context sentence, and the candidate list to `SimilarityRanker.score_candidates()`.

`SimilarityRanker` creates a new version of the context sentence for each candidate by replacing the target word with the candidate word. It embeds the original context and each candidate-modified context using MPNet, computes cosine similarity between the original context embedding and each candidate context embedding, and returns a list of `ScoredCandidate` objects.

`RankingOrchestrator` sorts the scored candidates by similarity score, applies any filtering rules, limits the result set to `RankRequest.topN`, and maps the final candidates into a list of `SynonymEntry(word, score, pos)` objects.

The final result list is returned to the Worker. The Worker builds a successful `RankResponse(RankRequest.id, results)`.

If an unrecoverable error occurs, the Worker returns `RankResponse(RankRequest.id, error)`. Expected empty-result cases, such as no WordNet candidates being found, should return a successful response with an empty results list rather than an error.

# Similarity Ranker
Three sentence-transformer models were compared:

1. MiniLM: `sentence-transformers/all-MiniLM-L6-v2`
2. MPNet: `sentence-transformers/all-mpnet-base-v2`
3. BGE: `BAAI/bge-base-en-v1.5`

The benchmark script is at `python/scripts/benchmark_models.py`. It writes the full per-candidate score table to `python/docs/similarity_ranking_results.csv`, detailed case-level metrics to `python/docs/similarity_ranking_details.csv`, and model-level metrics to `python/docs/similarity_ranking_summary.csv`.

The expanded benchmark uses 13 labelled cases that cover basic synonyms, near synonyms, word-sense disambiguation, literal versus figurative meanings, domain vocabulary, antonym distractors, and the no-context fallback path. Each case identifies one or more acceptable top candidates. The benchmark measures ranking quality and runtime over five scoring repeats.

Latest benchmark summary:

| Model | Top-1 accuracy | Mean reciprocal rank | Mean expected rank | Mean latency | P95 latency | Parameters | Decision score |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| MPNet | 84.6% | 0.923 | 1.15 | 100.6 ms | 111.3 ms | 109.5M | 107.4 |
| BGE | 76.9% | 0.872 | 1.31 | 101.9 ms | 112.7 ms | 109.5M | 98.0 |
| MiniLM | 46.2% | 0.705 | 1.69 | 24.5 ms | 29.2 ms | 22.7M | 63.7 |

MPNet is the recommended model. It has the strongest quality result, with the highest top-1 accuracy, best mean reciprocal rank, and best expected-candidate rank. Its latency is effectively tied with BGE in this benchmark, while its ranking quality is noticeably better. MiniLM is much faster and much smaller, but it missed too many context-sensitive cases to be a good default for the thesaurus feature.

Notable misses:

| Model | Missed cases |
| --- | --- |
| MPNet | `river_bank`, `mouse_animal` |
| BGE | `bright_idea`, `mouse_animal`, `phone_charge` |
| MiniLM | `animal_cat`, `river_bank`, `sunset`, `bright_idea`, `bright_lamp`, `mouse_animal`, `phone_charge` |

Decision: use `sentence-transformers/all-mpnet-base-v2` as the default similarity-ranking model. Keep MiniLM only as a possible speed-first fallback for constrained environments, and keep BGE as a reasonable alternative if future benchmarks show better performance on a larger or more representative dataset.

The current benchmark is intentionally small and hand-labelled, so it should be treated as a project decision benchmark rather than a comprehensive NLP evaluation. If the candidate generation strategy changes, rerun the benchmark because the ranking task can shift when WordNet produces different candidate sets.
