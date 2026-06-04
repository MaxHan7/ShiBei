#!/usr/bin/env python3

from __future__ import annotations

import argparse
import datetime as dt
import json
import os
from collections import Counter, defaultdict
from pathlib import Path
from typing import Literal

import dspy


ROOT = Path("quality-test-set/results/dspy/distractors")
DEFAULT_DATASET = ROOT / "datasets/dspy-distractor-quality-judge-devtest.v2.jsonl"
BASELINES_DIR = ROOT / "baselines"
ANALYSIS_DIR = ROOT / "analysis"
JUDGE_VERSION = "v3"

VALID_LABELS = {"accept", "fixable", "reject"}
HIGH_RISK_TRANSITIONS = {
    ("reject", "accept"),
    ("accept", "reject"),
}

INPUT_FIELDS = [
    "knowledge_point_title",
    "knowledge_point_claim",
    "stem",
    "correct_option",
    "candidate_distractor",
    "sibling_options",
    "source_context",
    "correct_understanding",
    "common_misconception",
    "explanation",
    "memory_angle",
    "all_options_with_ids",
    "correct_option_id",
]

CORE_REQUIRED_FIELDS = [
    "knowledge_point_title",
    "stem",
    "correct_option",
    "candidate_distractor",
    "sibling_options",
    "source_context",
    "all_options_with_ids",
    "correct_option_id",
]


class DistractorQualityJudge(dspy.Signature):
    """Judge whether a candidate distractor is useful for a lightweight review question.

    Judge in this order:
    1. First classify the candidate's relation to the correct answer:
       - same_meaning: it says essentially the same thing as the correct answer.
       - near_correct_boundary: it is close enough to be a second reasonable answer.
       - different_but_same_context: it is clearly wrong but in the same topic/context.
       - unrelated: it is outside the question's useful context.
    2. same_meaning and near_correct_boundary must not be accepted.
    3. Only different_but_same_context can become accept or fixable.
    4. Accept lightweight obvious-wrong options when they still teach a real boundary.
    5. Use fixable for useful directions with weak wording, weak scope, or low specificity.

    Labels:
    - accept: clearly wrong, same context, useful for learning a boundary, ready to use.
    - fixable: useful direction, but wording/scope/specificity needs revision.
    - reject: effectively correct, multi-answer risk, irrelevant, duplicate, or not worth repairing.
    """

    knowledge_point_title: str = dspy.InputField(desc="The reviewed knowledge point title.")
    knowledge_point_claim: str = dspy.InputField(desc="The core claim this question should reinforce.")
    stem: str = dspy.InputField(desc="The question stem.")
    correct_option: str = dspy.InputField(desc="The single correct answer.")
    candidate_distractor: str = dspy.InputField(desc="The candidate wrong option being judged.")
    sibling_options: str = dspy.InputField(desc="Other options in the same question, one per line.")
    source_context: str = dspy.InputField(desc="Original article context that supports the question.")
    correct_understanding: str = dspy.InputField(desc="The intended correct understanding after answering.")
    common_misconception: str = dspy.InputField(desc="The misconception this question or option group should help correct.")
    explanation: str = dspy.InputField(desc="The answer explanation shown after answering.")
    memory_angle: str = dspy.InputField(desc="The cognitive action or review angle, e.g. core_understanding or scenario_application.")
    all_options_with_ids: str = dspy.InputField(desc="Full option group with ids and correct/candidate flags.")
    correct_option_id: str = dspy.InputField(desc="The id of the single correct option.")

    candidate_answer_relation: Literal[
        "same_meaning",
        "near_correct_boundary",
        "different_but_same_context",
        "unrelated",
    ] = dspy.OutputField(
        desc=(
            "Relationship between candidate and correct answer. Use same_meaning or "
            "near_correct_boundary before any quality label if it may be another correct answer."
        )
    )
    is_correct_equivalent: Literal["yes", "no"] = dspy.OutputField(
        desc="yes if the candidate is semantically equivalent to the correct option or intended understanding."
    )
    has_multiselect_risk: Literal["yes", "no"] = dspy.OutputField(
        desc="yes if the candidate could reasonably be selected as a second correct answer."
    )
    same_context: Literal["yes", "no"] = dspy.OutputField(
        desc="yes if the candidate is in the same question and knowledge-point context."
    )
    learning_value: Literal["high", "medium", "low"] = dspy.OutputField(
        desc="Whether this wrong option helps the learner distinguish a real boundary."
    )
    fixability: Literal["ready", "needs_revision", "not_worth_fixing"] = dspy.OutputField(
        desc="ready for accept, needs_revision for fixable, not_worth_fixing for reject."
    )
    quality_label: Literal["accept", "fixable", "reject"] = dspy.OutputField(
        desc="One of accept, fixable, reject."
    )
    issue_category: str = dspy.OutputField(
        desc="Short snake_case issue category, e.g. accepted_distractor, too_extreme_low_value, correct_equivalent_multiselect_risk."
    )
    rationale: str = dspy.OutputField(desc="Brief reason in Chinese.")


def read_jsonl(path: Path) -> list[dict]:
    return [json.loads(line) for line in path.read_text().splitlines() if line.strip()]


def write_json(path: Path, data: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n")


def write_text(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text)


def normalize_label(value: object) -> str:
    label = str(value or "").strip().lower()
    if label in VALID_LABELS:
        return label
    # Keep bad model outputs visible instead of silently mapping them.
    return f"invalid:{label or 'empty'}"


def make_example(row: dict) -> dspy.Example:
    payload = dict(row)
    for field in INPUT_FIELDS:
        payload.setdefault(field, "")
    payload["sibling_options"] = "\n".join(row.get("sibling_options") or [])
    payload["all_options_with_ids"] = "\n".join(
        f"{option.get('id')}. {option.get('text')} "
        f"{'(correct)' if option.get('isCorrect') else ''}"
        f"{'(candidate)' if option.get('isCandidate') else ''}".strip()
        for option in row.get("all_options_with_ids") or []
    )
    return dspy.Example(**payload).with_inputs(*INPUT_FIELDS)


def label_score(gold_label: str, predicted_label: str, gold_issue: str, predicted_issue: str) -> float:
    if predicted_label != gold_label:
        return 0.0
    if predicted_issue == gold_issue:
        return 1.0
    return 0.8


def normalize_yes_no(value: object) -> str:
    text = str(value or "").strip().lower()
    if text in {"yes", "y", "true", "是"}:
        return "yes"
    if text in {"no", "n", "false", "否"}:
        return "no"
    return f"invalid:{text or 'empty'}"


def normalize_choice(value: object, valid: set[str], empty: str = "invalid:empty") -> str:
    text = str(value or "").strip().lower()
    return text if text in valid else f"invalid:{text or empty}"


def normalize_relation(value: object) -> str:
    text = str(value or "").strip().lower()
    aliases = {
        "same": "same_meaning",
        "equivalent": "same_meaning",
        "correct_equivalent": "same_meaning",
        "near_correct": "near_correct_boundary",
        "near": "near_correct_boundary",
        "same_context_wrong": "different_but_same_context",
        "different_same_context": "different_but_same_context",
        "different": "different_but_same_context",
        "irrelevant": "unrelated",
    }
    text = aliases.get(text, text)
    valid = {"same_meaning", "near_correct_boundary", "different_but_same_context", "unrelated"}
    return text if text in valid else f"invalid:{text or 'empty'}"


def is_correct_equivalent_issue(issue: str) -> bool:
    lowered = str(issue or "").lower()
    return any(token in lowered for token in ["correct_equivalent", "multiselect", "second_correct", "correct_boundary"])


def configure_lm(model: str, temperature: float, max_tokens: int) -> None:
    lm = dspy.LM(model, temperature=temperature, max_tokens=max_tokens)
    dspy.configure(lm=lm)


def build_program(mode: str, rows: list[dict], fewshot_k: int):
    program = dspy.Predict(DistractorQualityJudge)
    if mode != "few-shot":
        return program

    fewshot_rows = [row for row in rows if row.get("split_hint") == "fewshot_pool"]
    if not fewshot_rows:
        raise RuntimeError("No few-shot pool rows found. Expected split_hint=fewshot_pool.")
    trainset = [make_example(row) for row in fewshot_rows]
    optimizer = dspy.LabeledFewShot(k=min(fewshot_k, len(trainset)))
    return optimizer.compile(student=program, trainset=trainset)


def run_predictions(program, rows: list[dict], limit: int | None = None) -> list[dict]:
    selected = rows[:limit] if limit else rows
    results = []
    for index, row in enumerate(selected, 1):
        example = make_example(row)
        prediction = program(**example.inputs())
        predicted_label = normalize_label(getattr(prediction, "quality_label", ""))
        predicted_issue = str(getattr(prediction, "issue_category", "") or "").strip()
        candidate_answer_relation = normalize_relation(getattr(prediction, "candidate_answer_relation", ""))
        is_correct_equivalent = normalize_yes_no(getattr(prediction, "is_correct_equivalent", ""))
        has_multiselect_risk = normalize_yes_no(getattr(prediction, "has_multiselect_risk", ""))
        same_context = normalize_yes_no(getattr(prediction, "same_context", ""))
        learning_value = normalize_choice(getattr(prediction, "learning_value", ""), {"high", "medium", "low"})
        fixability = normalize_choice(getattr(prediction, "fixability", ""), {"ready", "needs_revision", "not_worth_fixing"})
        gold_label = row["gold_quality_label"]
        gold_issue = row["gold_issue_category"]
        score = label_score(gold_label, predicted_label, gold_issue, predicted_issue)
        hard_fail_reasons = []
        gold_is_correct_equivalent = is_correct_equivalent_issue(gold_issue)
        if gold_is_correct_equivalent and predicted_label == "accept":
            hard_fail_reasons.append("accepted_correct_equivalent_or_multiselect_risk")
        if gold_label == "reject" and predicted_label == "accept":
            hard_fail_reasons.append("accepted_reject_gold")
        if predicted_label == "accept" and candidate_answer_relation in {"same_meaning", "near_correct_boundary"}:
            hard_fail_reasons.append("accepted_self_reported_second_correct_relation")
        if predicted_label == "accept" and (is_correct_equivalent == "yes" or has_multiselect_risk == "yes"):
            hard_fail_reasons.append("self_reported_multiselect_risk_but_accept")
        results.append(
            {
                "index": index,
                "sample_id": row["sample_id"],
                "source_phase": row["source_phase"],
                "article_slug": row["article_slug"],
                "question_id": row["question_id"],
                "candidate_distractor": row["candidate_distractor"],
                "gold_quality_label": gold_label,
                "predicted_quality_label": predicted_label,
                "gold_issue_category": gold_issue,
                "predicted_issue_category": predicted_issue,
                "candidate_answer_relation": candidate_answer_relation,
                "is_correct_equivalent": is_correct_equivalent,
                "has_multiselect_risk": has_multiselect_risk,
                "same_context": same_context,
                "learning_value": learning_value,
                "fixability": fixability,
                "score": score,
                "rationale": str(getattr(prediction, "rationale", "") or "").strip(),
                "review_note": row.get("review_note", ""),
                "missing_context_fields": row.get("missing_context_fields", []),
                "hard_fail_reasons": hard_fail_reasons,
                "high_risk": (gold_label, predicted_label) in HIGH_RISK_TRANSITIONS,
            }
        )
    return results


def summarize(results: list[dict]) -> dict:
    total = len(results)
    exact = sum(1 for row in results if row["gold_quality_label"] == row["predicted_quality_label"])
    issue_exact = sum(
        1
        for row in results
        if row["gold_quality_label"] == row["predicted_quality_label"]
        and row["gold_issue_category"] == row["predicted_issue_category"]
    )
    avg_score = sum(row["score"] for row in results) / total if total else 0

    confusion = defaultdict(Counter)
    by_source = defaultdict(lambda: {"total": 0, "exact": 0, "avg_score_sum": 0.0})
    by_label = defaultdict(lambda: {"total": 0, "exact": 0})
    high_risk = []
    hard_failures = []
    over_strict_errors = []
    second_correct_risk_errors = []
    invalid_outputs = []
    relation_counts = Counter()
    relation_by_gold = defaultdict(Counter)
    second_correct_relation_accepts = []

    for row in results:
        gold = row["gold_quality_label"]
        pred = row["predicted_quality_label"]
        confusion[gold][pred] += 1
        relation = row.get("candidate_answer_relation", "invalid:missing")
        relation_counts[relation] += 1
        relation_by_gold[gold][relation] += 1

        source = row["source_phase"]
        by_source[source]["total"] += 1
        by_source[source]["avg_score_sum"] += row["score"]
        if gold == pred:
            by_source[source]["exact"] += 1

        by_label[gold]["total"] += 1
        if gold == pred:
            by_label[gold]["exact"] += 1

        if row["high_risk"]:
            high_risk.append(row)
        if row["hard_fail_reasons"]:
            hard_failures.append(row)
        if gold == "accept" and pred == "reject":
            over_strict_errors.append(row)
        if is_correct_equivalent_issue(row["gold_issue_category"]) and pred == "accept":
            second_correct_risk_errors.append(row)
        if pred == "accept" and relation in {"same_meaning", "near_correct_boundary"}:
            second_correct_relation_accepts.append(row)
        if pred.startswith("invalid:"):
            invalid_outputs.append(row)
        if relation.startswith("invalid:"):
            invalid_outputs.append(row)

    fixable_rows = [row for row in results if row["gold_quality_label"] == "fixable"]
    fixable_recall = (
        sum(1 for row in fixable_rows if row["predicted_quality_label"] == "fixable") / len(fixable_rows)
        if fixable_rows
        else 0
    )

    return {
        "total": total,
        "label_accuracy": exact / total if total else 0,
        "issue_exact_accuracy": issue_exact / total if total else 0,
        "average_metric_score": avg_score,
        "confusion_matrix": {gold: dict(counter) for gold, counter in confusion.items()},
        "by_source_phase": {
            key: {
                "total": value["total"],
                "label_accuracy": value["exact"] / value["total"] if value["total"] else 0,
                "average_metric_score": value["avg_score_sum"] / value["total"] if value["total"] else 0,
            }
            for key, value in by_source.items()
        },
        "by_gold_label": {
            key: {
                "total": value["total"],
                "label_accuracy": value["exact"] / value["total"] if value["total"] else 0,
            }
            for key, value in by_label.items()
        },
        "high_risk_errors": high_risk,
        "hard_failures": hard_failures,
        "over_strict_errors": over_strict_errors,
        "second_correct_risk_errors": second_correct_risk_errors,
        "second_correct_relation_accepts": second_correct_relation_accepts,
        "fixable_recall": fixable_recall,
        "candidate_answer_relation_counts": dict(relation_counts),
        "candidate_answer_relation_by_gold": {
            key: dict(counter) for key, counter in relation_by_gold.items()
        },
        "invalid_outputs": invalid_outputs,
        "wrong_predictions": [
            row for row in results if row["gold_quality_label"] != row["predicted_quality_label"]
        ],
    }


def pct(value: float) -> str:
    return f"{value * 100:.1f}%"


def render_report(run: dict) -> str:
    summary = run["summary"]
    lines = [
        f"# DSPy Phase B DistractorQualityJudge Baseline {run.get('judge_version', '')}: {run['mode']}",
        "",
        f"Date: {run['generated_at']}",
        f"Model: `{run['model']}`",
        f"Dataset: `{run['dataset_path']}`",
        f"Rows: {summary['total']}",
        "",
        "## Summary",
        "",
        f"- Label accuracy: {pct(summary['label_accuracy'])}",
        f"- Issue exact accuracy: {pct(summary['issue_exact_accuracy'])}",
        f"- Average metric score: {summary['average_metric_score']:.3f}",
        f"- Fixable recall: {pct(summary['fixable_recall'])}",
        f"- Hard failures: {len(summary['hard_failures'])}",
        f"- Over-strict accept -> reject errors: {len(summary['over_strict_errors'])}",
        f"- Second-correct risk accepted: {len(summary['second_correct_risk_errors'])}",
        f"- Self-reported second-correct relation accepted: {len(summary.get('second_correct_relation_accepts', []))}",
        f"- High-risk errors: {len(summary['high_risk_errors'])}",
        f"- Invalid label outputs: {len(summary['invalid_outputs'])}",
        "",
        "## By Source Phase",
        "",
        "| Source phase | Rows | Label accuracy | Avg score |",
        "| --- | ---: | ---: | ---: |",
    ]

    for source, row in sorted(summary["by_source_phase"].items()):
        lines.append(
            f"| `{source}` | {row['total']} | {pct(row['label_accuracy'])} | {row['average_metric_score']:.3f} |"
        )

    lines.extend(["", "## Confusion Matrix", "", "| Gold \\ Pred | accept | fixable | reject | invalid |", "| --- | ---: | ---: | ---: | ---: |"])
    for gold in ["accept", "fixable", "reject"]:
        counter = summary["confusion_matrix"].get(gold, {})
        invalid = sum(count for label, count in counter.items() if label.startswith("invalid:"))
        lines.append(
            f"| {gold} | {counter.get('accept', 0)} | {counter.get('fixable', 0)} | {counter.get('reject', 0)} | {invalid} |"
        )

    lines.extend(["", "## Candidate Answer Relation", "", "| Gold label | same_meaning | near_correct_boundary | different_but_same_context | unrelated | invalid |", "| --- | ---: | ---: | ---: | ---: | ---: |"])
    for gold in ["accept", "fixable", "reject"]:
        counter = summary.get("candidate_answer_relation_by_gold", {}).get(gold, {})
        invalid = sum(count for label, count in counter.items() if label.startswith("invalid:"))
        lines.append(
            f"| {gold} | {counter.get('same_meaning', 0)} | {counter.get('near_correct_boundary', 0)} | {counter.get('different_but_same_context', 0)} | {counter.get('unrelated', 0)} | {invalid} |"
        )

    lines.extend(["", "## High-Risk Errors", ""])
    if summary["high_risk_errors"]:
        for row in summary["high_risk_errors"]:
            lines.append(
                f"- `{row['sample_id']}`: {row['gold_quality_label']} -> {row['predicted_quality_label']} | candidate: {row['candidate_distractor']} | predicted issue: `{row['predicted_issue_category']}` | rationale: {row['rationale']}"
            )
    else:
        lines.append("- None.")

    lines.extend(["", "## Hard Failures", ""])
    if summary["hard_failures"]:
        for row in summary["hard_failures"]:
            lines.append(
                f"- `{row['sample_id']}`: gold `{row['gold_quality_label']}` / pred `{row['predicted_quality_label']}` | candidate: {row['candidate_distractor']} | reasons: {', '.join(row['hard_fail_reasons'])}"
            )
    else:
        lines.append("- None.")

    lines.extend(["", "## Over-Strict Errors", ""])
    if summary["over_strict_errors"]:
        for row in summary["over_strict_errors"][:20]:
            lines.append(
                f"- `{row['sample_id']}`: accept -> reject | candidate: {row['candidate_distractor']} | predicted issue: `{row['predicted_issue_category']}`"
            )
    else:
        lines.append("- None.")

    lines.extend(["", "## Second-Correct Risk Accepted", ""])
    if summary["second_correct_risk_errors"]:
        for row in summary["second_correct_risk_errors"]:
            lines.append(
                f"- `{row['sample_id']}`: {row['candidate_distractor']} | gold issue: `{row['gold_issue_category']}` | rationale: {row['rationale']}"
            )
    else:
        lines.append("- None.")

    lines.extend(["", "## Self-Reported Second-Correct Relation Accepted", ""])
    if summary.get("second_correct_relation_accepts"):
        for row in summary["second_correct_relation_accepts"]:
            lines.append(
                f"- `{row['sample_id']}`: relation `{row['candidate_answer_relation']}` but pred `accept` | candidate: {row['candidate_distractor']} | rationale: {row['rationale']}"
            )
    else:
        lines.append("- None.")

    lines.extend(["", "## Wrong Predictions", ""])
    if summary["wrong_predictions"]:
        for row in summary["wrong_predictions"]:
            lines.append(
                f"- `{row['sample_id']}` ({row['source_phase']}): gold `{row['gold_quality_label']}` / pred `{row['predicted_quality_label']}`; candidate: {row['candidate_distractor']}; note: {row.get('review_note') or '-'}"
            )
    else:
        lines.append("- None.")

    lines.extend(
        [
            "",
            "## Interpretation Guide",
            "",
            "- If few-shot improves non-Hook rows over zero-shot and hard failures decline, Phase A examples transfer.",
            "- If `reject -> accept` or second-correct risk remains common, do not optimize yet; fix task wording or metric first.",
            "- If `fixable` recall remains near zero, keep fixable as a softer review queue and refine label examples before optimizer.",
            "",
        ]
    )
    return "\n".join(lines)


def validate_rows(rows: list[dict]) -> dict:
    counts = Counter(row["gold_quality_label"] for row in rows)
    sources = Counter(row["source_phase"] for row in rows)
    for row in rows:
        if row["gold_quality_label"] not in VALID_LABELS:
            raise ValueError(f"Invalid label for {row['sample_id']}: {row['gold_quality_label']}")
        for field in CORE_REQUIRED_FIELDS:
            if field == "sibling_options":
                if not row.get(field):
                    raise ValueError(f"Missing {field} for {row['sample_id']}")
            elif field == "all_options_with_ids":
                if not row.get(field):
                    raise ValueError(f"Missing {field} for {row['sample_id']}")
            elif not str(row.get(field, "")).strip():
                raise ValueError(f"Missing {field} for {row['sample_id']}")
    return {"rows": len(rows), "labels": dict(counts), "sources": dict(sources)}


def main() -> None:
    parser = argparse.ArgumentParser(description="Run DSPy Phase B distractor quality judge baseline.")
    parser.add_argument("--dataset", default=str(DEFAULT_DATASET))
    parser.add_argument("--mode", choices=["zero-shot", "few-shot"], default="zero-shot")
    parser.add_argument("--model", default=os.environ.get("DSPY_MODEL") or ("deepseek/deepseek-chat" if os.environ.get("DEEPSEEK_API_KEY") else "openai/gpt-4o-mini"))
    parser.add_argument("--fewshot-k", type=int, default=9)
    parser.add_argument("--temperature", type=float, default=0.0)
    parser.add_argument("--max-tokens", type=int, default=700)
    parser.add_argument("--limit", type=int, default=None)
    parser.add_argument("--inspect-history", action="store_true", help="Print the most recent DSPy LM call for prompt/demo inspection.")
    parser.add_argument("--dry-run", action="store_true", help="Validate dataset and write no model outputs.")
    args = parser.parse_args()

    dataset_path = Path(args.dataset)
    rows = read_jsonl(dataset_path)
    validation = validate_rows(rows)
    print(json.dumps({"dataset": str(dataset_path), **validation}, ensure_ascii=False, indent=2))
    if args.dry_run:
        return

    timestamp = dt.datetime.now().strftime("%Y%m%d-%H%M%S")
    configure_lm(args.model, args.temperature, args.max_tokens)
    program = build_program(args.mode, rows, args.fewshot_k)
    results = run_predictions(program, rows, args.limit)
    if args.inspect_history:
        dspy.inspect_history(n=1)
    summary = summarize(results)
    run = {
        "kind": "dspy_phase_b_distractor_quality_judge_baseline",
        "judge_version": JUDGE_VERSION,
        "generated_at": dt.datetime.now().isoformat(),
        "mode": args.mode,
        "model": args.model,
        "dataset_path": str(dataset_path),
        "fewshot_k": args.fewshot_k if args.mode == "few-shot" else 0,
        "limit": args.limit,
        "summary": summary,
        "results": results,
    }

    json_path = BASELINES_DIR / f"phase-b-quality-judge-{JUDGE_VERSION}-{args.mode}-{timestamp}.json"
    md_path = ANALYSIS_DIR / f"phase-b-quality-judge-{JUDGE_VERSION}-baseline-{args.mode}-{timestamp}.md"
    write_json(json_path, run)
    write_text(md_path, render_report(run))
    print(json.dumps({"json": str(json_path), "analysis": str(md_path), "summary": summary}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
