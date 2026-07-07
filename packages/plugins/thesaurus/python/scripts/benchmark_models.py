"""Benchmark sentence-transformer models for contextual thesaurus ranking.

The benchmark writes three CSV files under python/docs:
- similarity_ranking_results.csv: wide score table for quick inspection.
- similarity_ranking_details.csv: per candidate scores, ranks, and case latency.
- similarity_ranking_summary.csv: model-level quality and speed comparison.
"""

from __future__ import annotations

import argparse
import math
import statistics
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import pandas as pd

from thesaurus_nlp.domain.models import Candidate, ScoredCandidate
from thesaurus_nlp.similarity_ranker import SimilarityRanker


MODELS = {
    "MiniLM": "sentence-transformers/all-MiniLM-L6-v2",
    "MPNet": "sentence-transformers/all-mpnet-base-v2",
    "BGE": "BAAI/bge-base-en-v1.5",
}


@dataclass(frozen=True)
class BenchmarkCase:
    case_id: str
    category: str
    word: str
    context: str | None
    candidates: list[Candidate]
    expected_best: set[str]
    note: str


TEST_CASES = [
    BenchmarkCase(
        case_id="animal_cat",
        category="basic synonym",
        word="cat",
        context="The cat sat on the mat.",
        candidates=[
            Candidate(word="kitten", pos="n"),
            Candidate(word="dog", pos="n"),
            Candidate(word="feline", pos="n"),
        ],
        expected_best={"feline"},
        note="A direct synonym should beat a related but narrower word and an unrelated animal.",
    ),
    BenchmarkCase(
        case_id="river_bank",
        category="word sense disambiguation",
        word="bank",
        context="Watching the sunset, the two lovers sat together on the river bank.",
        candidates=[
            Candidate(word="shore", pos="n"),
            Candidate(word="levee", pos="n"),
            Candidate(word="depository", pos="n"),
            Candidate(word="fund", pos="n"),
        ],
        expected_best={"shore"},
        note="The context should prefer the riverside sense over finance senses.",
    ),
    BenchmarkCase(
        case_id="financial_bank",
        category="word sense disambiguation",
        word="bank",
        context="The bank approved the small business loan after reviewing the application.",
        candidates=[
            Candidate(word="shore", pos="n"),
            Candidate(word="financial institution", pos="n"),
            Candidate(word="lender", pos="n"),
            Candidate(word="embankment", pos="n"),
        ],
        expected_best={"financial institution", "lender"},
        note="Finance context should separate institutional synonyms from river terms.",
    ),
    BenchmarkCase(
        case_id="sunset",
        category="near synonym",
        word="sunset",
        context="Watching the sunset, the two lovers sat together on the river bank.",
        candidates=[
            Candidate(word="sundown", pos="n"),
            Candidate(word="dusk", pos="n"),
            Candidate(word="nightfall", pos="n"),
            Candidate(word="sunrise", pos="n"),
        ],
        expected_best={"sundown", "dusk"},
        note="Close synonyms should beat the antonym-like distractor.",
    ),
    BenchmarkCase(
        case_id="bright_idea",
        category="figurative language",
        word="bright",
        context="Her bright idea helped the team solve the production issue quickly.",
        candidates=[
            Candidate(word="intelligent", pos="adj"),
            Candidate(word="luminous", pos="adj"),
            Candidate(word="shiny", pos="adj"),
            Candidate(word="dull", pos="adj"),
        ],
        expected_best={"intelligent"},
        note="Figurative context should prefer mental sharpness over literal light.",
    ),
    BenchmarkCase(
        case_id="bright_lamp",
        category="literal sense",
        word="bright",
        context="The bright lamp lit every corner of the quiet room.",
        candidates=[
            Candidate(word="intelligent", pos="adj"),
            Candidate(word="luminous", pos="adj"),
            Candidate(word="radiant", pos="adj"),
            Candidate(word="dim", pos="adj"),
        ],
        expected_best={"luminous", "radiant"},
        note="Literal lighting context should prefer visual brightness.",
    ),
    BenchmarkCase(
        case_id="mouse_device",
        category="word sense disambiguation",
        word="mouse",
        context="She clicked the mouse to open the file on her laptop.",
        candidates=[
            Candidate(word="rodent", pos="n"),
            Candidate(word="pointer", pos="n"),
            Candidate(word="computer mouse", pos="n"),
            Candidate(word="keyboard", pos="n"),
        ],
        expected_best={"computer mouse", "pointer"},
        note="Computing context should beat the animal sense.",
    ),
    BenchmarkCase(
        case_id="mouse_animal",
        category="word sense disambiguation",
        word="mouse",
        context="The mouse hid behind the cupboard when the kitchen light turned on.",
        candidates=[
            Candidate(word="rodent", pos="n"),
            Candidate(word="pointer", pos="n"),
            Candidate(word="computer mouse", pos="n"),
            Candidate(word="rat", pos="n"),
        ],
        expected_best={"rodent", "rat"},
        note="Animal context should beat computing terms.",
    ),
    BenchmarkCase(
        case_id="legal_charge",
        category="word sense disambiguation",
        word="charge",
        context="The prosecutor filed a serious charge after reviewing the evidence.",
        candidates=[
            Candidate(word="accusation", pos="n"),
            Candidate(word="fee", pos="n"),
            Candidate(word="electrical load", pos="n"),
            Candidate(word="attack", pos="n"),
        ],
        expected_best={"accusation"},
        note="Legal context should prefer accusation over payment or electricity.",
    ),
    BenchmarkCase(
        case_id="phone_charge",
        category="word sense disambiguation",
        word="charge",
        context="My phone needs a charge before we leave for the airport.",
        candidates=[
            Candidate(word="accusation", pos="n"),
            Candidate(word="fee", pos="n"),
            Candidate(word="battery power", pos="n"),
            Candidate(word="attack", pos="n"),
        ],
        expected_best={"battery power"},
        note="Device context should prefer battery power.",
    ),
    BenchmarkCase(
        case_id="quick_response",
        category="basic synonym",
        word="quick",
        context="Thank you for the quick response to my support request.",
        candidates=[
            Candidate(word="fast", pos="adj"),
            Candidate(word="prompt", pos="adj"),
            Candidate(word="slow", pos="adj"),
            Candidate(word="clever", pos="adj"),
        ],
        expected_best={"prompt", "fast"},
        note="Response context should prefer promptness over unrelated senses.",
    ),
    BenchmarkCase(
        case_id="large_dataset",
        category="domain vocabulary",
        word="large",
        context="The experiment used a large dataset with millions of labeled examples.",
        candidates=[
            Candidate(word="big", pos="adj"),
            Candidate(word="substantial", pos="adj"),
            Candidate(word="tiny", pos="adj"),
            Candidate(word="lengthy", pos="adj"),
        ],
        expected_best={"substantial", "big"},
        note="Technical writing should still prefer size synonyms over antonyms.",
    ),
    BenchmarkCase(
        case_id="no_context_happy",
        category="no context fallback",
        word="happy",
        context=None,
        candidates=[
            Candidate(word="joyful", pos="adj"),
            Candidate(word="sad", pos="adj"),
            Candidate(word="content", pos="adj"),
            Candidate(word="angry", pos="adj"),
        ],
        expected_best={"joyful", "content"},
        note="When context is unavailable, lexical similarity should still help.",
    ),
]


def percentile(values: list[float], percent: float) -> float:
    if not values:
        return math.nan
    sorted_values = sorted(values)
    index = (len(sorted_values) - 1) * percent
    lower = math.floor(index)
    upper = math.ceil(index)
    if lower == upper:
        return sorted_values[int(index)]
    return sorted_values[lower] + (sorted_values[upper] - sorted_values[lower]) * (index - lower)


def model_metadata(ranker: SimilarityRanker) -> dict[str, Any]:
    transformer = ranker.model
    parameter_count = None
    embedding_dimension = None

    try:
        parameter_count = sum(parameter.numel() for parameter in transformer.parameters())
    except Exception:
        parameter_count = None

    if hasattr(transformer, "get_embedding_dimension"):
        embedding_dimension = transformer.get_embedding_dimension()
    else:
        embedding_dimension = transformer.get_sentence_embedding_dimension()

    return {
        "embedding_dimension": embedding_dimension,
        "max_sequence_length": getattr(transformer, "max_seq_length", None),
        "parameter_count": parameter_count,
    }


def score_with_timings(
    ranker: SimilarityRanker,
    case: BenchmarkCase,
    repeats: int,
) -> tuple[list[ScoredCandidate], list[float]]:
    timings = []
    scored_candidates = []

    for _ in range(repeats):
        start = time.perf_counter()
        scored_candidates = ranker.score_candidates(case.candidates, case.word, case.context)
        timings.append((time.perf_counter() - start) * 1000)

    return scored_candidates, timings


def detail_rows_for_case(
    model_name: str,
    case: BenchmarkCase,
    scored_candidates: list[ScoredCandidate],
    timings: list[float],
    load_seconds: float,
    metadata: dict[str, Any],
) -> list[dict[str, Any]]:
    ranked_candidates = sorted(scored_candidates, key=lambda candidate: candidate.score, reverse=True)
    ranks_by_word = {candidate.word: index + 1 for index, candidate in enumerate(ranked_candidates)}
    scores_by_word = {candidate.word: candidate.score for candidate in ranked_candidates}

    expected_ranks = [
        ranks_by_word[word]
        for word in case.expected_best
        if word in ranks_by_word
    ]
    expected_scores = [
        scores_by_word[word]
        for word in case.expected_best
        if word in scores_by_word
    ]
    distractor_scores = [
        candidate.score
        for candidate in ranked_candidates
        if candidate.word not in case.expected_best
    ]

    top_candidate = ranked_candidates[0].word
    best_expected_rank = min(expected_ranks) if expected_ranks else None
    reciprocal_rank = 1 / best_expected_rank if best_expected_rank else 0
    best_expected_score = max(expected_scores) if expected_scores else None
    best_distractor_score = max(distractor_scores) if distractor_scores else None
    expected_margin = (
        best_expected_score - best_distractor_score
        if best_expected_score is not None and best_distractor_score is not None
        else None
    )

    rows = []
    for candidate in ranked_candidates:
        rows.append({
            "case_id": case.case_id,
            "category": case.category,
            "word": case.word,
            "context": case.context,
            "note": case.note,
            "candidate": candidate.word,
            "pos": candidate.pos,
            "model": model_name,
            "score": candidate.score,
            "rank": ranks_by_word[candidate.word],
            "is_expected": candidate.word in case.expected_best,
            "top_candidate": top_candidate,
            "top_is_expected": top_candidate in case.expected_best,
            "best_expected_rank": best_expected_rank,
            "reciprocal_rank": reciprocal_rank,
            "expected_margin": expected_margin,
            "error": False,
            "error_message": None,
            "latency_first_ms": timings[0],
            "latency_mean_ms": statistics.fmean(timings),
            "latency_min_ms": min(timings),
            "latency_p95_ms": percentile(timings, 0.95),
            "repeats": len(timings),
            "model_load_seconds": load_seconds,
            **metadata,
        })

    return rows


def error_rows_for_case(
    model_name: str,
    case: BenchmarkCase,
    error: Exception,
    load_seconds: float,
    metadata: dict[str, Any],
) -> list[dict[str, Any]]:
    rows = []

    for candidate in case.candidates:
        rows.append({
            "case_id": case.case_id,
            "category": case.category,
            "word": case.word,
            "context": case.context,
            "note": case.note,
            "candidate": candidate.word,
            "pos": candidate.pos,
            "model": model_name,
            "score": None,
            "rank": None,
            "is_expected": candidate.word in case.expected_best,
            "top_candidate": None,
            "top_is_expected": False,
            "best_expected_rank": None,
            "reciprocal_rank": 0,
            "expected_margin": None,
            "error": True,
            "error_message": f"{type(error).__name__}: {error}",
            "latency_first_ms": None,
            "latency_mean_ms": None,
            "latency_min_ms": None,
            "latency_p95_ms": None,
            "repeats": 0,
            "model_load_seconds": load_seconds,
            **metadata,
        })

    return rows


def summarize(details_df: pd.DataFrame) -> pd.DataFrame:
    case_df = details_df.drop_duplicates(subset=["model", "case_id"])
    failed_cases = (
        case_df[case_df["error"]]
        .groupby("model")
        .size()
        .rename("failed_cases")
    )
    case_df = case_df[~case_df["error"]]

    summary = case_df.groupby("model").agg(
        cases=("case_id", "count"),
        top1_accuracy=("top_is_expected", "mean"),
        mean_reciprocal_rank=("reciprocal_rank", "mean"),
        mean_best_expected_rank=("best_expected_rank", "mean"),
        mean_expected_margin=("expected_margin", "mean"),
        mean_latency_ms=("latency_mean_ms", "mean"),
        p95_case_latency_ms=("latency_p95_ms", "mean"),
        first_case_latency_ms=("latency_first_ms", "mean"),
        model_load_seconds=("model_load_seconds", "first"),
        embedding_dimension=("embedding_dimension", "first"),
        max_sequence_length=("max_sequence_length", "first"),
        parameter_count=("parameter_count", "first"),
    )
    summary = summary.join(failed_cases, how="left")
    summary["failed_cases"] = summary["failed_cases"].fillna(0).astype(int)

    summary["decision_score"] = (
        summary["top1_accuracy"] * 100
        + summary["mean_reciprocal_rank"] * 25
        + summary["mean_expected_margin"].clip(lower=-1, upper=1) * 10
        - summary["mean_latency_ms"] / 100
    )

    return summary.sort_values(
        by=["top1_accuracy", "mean_reciprocal_rank", "mean_latency_ms"],
        ascending=[False, False, True],
    ).reset_index()


def write_score_pivot(details_df: pd.DataFrame, output_path: Path) -> None:
    pivot_df = details_df.pivot_table(
        index=["case_id", "category", "word", "context", "candidate", "is_expected", "error"],
        columns="model",
        values="score",
        aggfunc="first",
    ).reset_index()
    pivot_df.to_csv(output_path, index=False)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--repeats",
        type=int,
        default=5,
        help="Number of scoring runs per model and case. Defaults to 5.",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path(__file__).resolve().parents[1] / "docs",
        help="Directory for benchmark CSV files. Defaults to python/docs.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    if args.repeats < 1:
        raise ValueError("--repeats must be at least 1")

    args.output_dir.mkdir(parents=True, exist_ok=True)
    detail_rows = []

    for model_name, model_path in MODELS.items():
        print(f"Evaluating model: {model_name} ({model_path})")
        load_start = time.perf_counter()
        ranker = SimilarityRanker(model_name=model_path)
        load_seconds = time.perf_counter() - load_start
        metadata = model_metadata(ranker)

        for case in TEST_CASES:
            try:
                scored_candidates, timings = score_with_timings(ranker, case, args.repeats)
                detail_rows.extend(
                    detail_rows_for_case(
                        model_name=model_name,
                        case=case,
                        scored_candidates=scored_candidates,
                        timings=timings,
                        load_seconds=load_seconds,
                        metadata=metadata,
                    )
                )

                ranked = sorted(scored_candidates, key=lambda candidate: candidate.score, reverse=True)
                top_candidate = ranked[0].word
                status = "PASS" if top_candidate in case.expected_best else "MISS"
                print(
                    f"  {status} {case.case_id}: top={top_candidate}, "
                    f"expected={', '.join(sorted(case.expected_best))}, "
                    f"mean={statistics.fmean(timings):.1f}ms"
                )
            except Exception as error:
                detail_rows.extend(
                    error_rows_for_case(
                        model_name=model_name,
                        case=case,
                        error=error,
                        load_seconds=load_seconds,
                        metadata=metadata,
                    )
                )
                print(f"  ERROR {case.case_id}: {type(error).__name__}: {error}")

    details_df = pd.DataFrame(detail_rows)
    summary_df = summarize(details_df)

    details_path = args.output_dir / "similarity_ranking_details.csv"
    results_path = args.output_dir / "similarity_ranking_results.csv"
    summary_path = args.output_dir / "similarity_ranking_summary.csv"

    details_df.to_csv(details_path, index=False)
    write_score_pivot(details_df, results_path)
    summary_df.to_csv(summary_path, index=False)

    print()
    print("Model summary:")
    print(summary_df.to_string(index=False))
    print()
    print(f"Wrote detailed benchmark to {details_path}")
    print(f"Wrote score table to {results_path}")
    print(f"Wrote model summary to {summary_path}")


if __name__ == "__main__":
    main()
