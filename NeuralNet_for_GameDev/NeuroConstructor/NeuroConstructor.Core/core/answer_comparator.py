"""
Answer Comparator — сравнение ответов Teacher vs Student для LM Benchmark.

Поддерживаемые метрики:
- Cosine Similarity (char n-gram / word n-gram)
- BLEU Score (n-gram based, simplified)
- ROUGE-L (Longest Common Subsequence)
- Exact Match
- Token-level F1 / Precision / Recall
- Perplexity estimation (token ratio)
"""

import math
import os
import json
from typing import List, Dict, Optional, Tuple, Any
from collections import Counter
from dataclasses import dataclass, field


# ─── N-gram utilities ────────────────────────────────────────────────────────

def _char_ngrams(text: str, n: int) -> List[str]:
    """Generate character n-grams."""
    return [text[i:i+n] for i in range(len(text) - n + 1)]


def _word_ngrams(tokens: List[str], n: int) -> List[str]:
    """Generate word n-grams."""
    return [' '.join(tokens[i:i+n]) for i in range(len(tokens) - n + 1)]


def _tokenize(text: str) -> List[str]:
    """Simple whitespace + punctuation tokenizer."""
    import re
    return re.findall(r'\b\w+\b|[^\w\s]', text, re.UNICODE)


# ─── Metrics ──────────────────────────────────────────────────────────────────

@dataclass
class MetricResult:
    name: str
    score: float          # 0..1
    details: Optional[Dict] = field(default_factory=dict)


class AnswerComparator:
    """Compare two text answers using multiple metrics."""

    @staticmethod
    def cosine_similarity_char(
        text1: str,
        text2: str,
        n: int = 3
    ) -> float:
        """
        Cosine similarity using character n-grams.
        Vector = TF of each n-gram.
        """
        ngrams1 = _char_ngrams(text1, n)
        ngrams2 = _char_ngrams(text2, n)

        if not ngrams1 or not ngrams2:
            return 0.0

        counts1 = Counter(ngrams1)
        counts2 = Counter(ngrams2)

        all_ngrams = set(counts1.keys()) | set(counts2.keys())

        dot = 0.0
        norm1 = 0.0
        norm2 = 0.0

        for ng in all_ngrams:
            c1 = counts1.get(ng, 0)
            c2 = counts2.get(ng, 0)
            dot += c1 * c2
            norm1 += c1 * c1
            norm2 += c2 * c2

        if norm1 == 0 or norm2 == 0:
            return 0.0

        return dot / (math.sqrt(norm1) * math.sqrt(norm2))

    @staticmethod
    def cosine_similarity_word(
        text1: str,
        text2: str,
        n: int = 2
    ) -> float:
        """Cosine similarity using word n-grams."""
        tokens1 = _tokenize(text1)
        tokens2 = _tokenize(text2)

        ngrams1 = _word_ngrams(tokens1, n)
        ngrams2 = _word_ngrams(tokens2, n)

        if not ngrams1 or not ngrams2:
            return 0.0

        counts1 = Counter(ngrams1)
        counts2 = Counter(ngrams2)

        all_ngrams = set(counts1.keys()) | set(counts2.keys())

        dot = 0.0
        norm1 = 0.0
        norm2 = 0.0

        for ng in all_ngrams:
            c1 = counts1.get(ng, 0)
            c2 = counts2.get(ng, 0)
            dot += c1 * c2
            norm1 += c1 * c1
            norm2 += c2 * c2

        if norm1 == 0 or norm2 == 0:
            return 0.0

        return dot / (math.sqrt(norm1) * math.sqrt(norm2))

    @staticmethod
    def bleu_score(
        reference: str,
        hypothesis: str,
        max_n: int = 4,
        weights: Optional[List[float]] = None
    ) -> float:
        """
        Simplified BLEU score (0..1).
        Uses modified n-gram precision + brevity penalty.
        """
        ref_tokens = _tokenize(reference)
        hyp_tokens = _tokenize(hypothesis)

        if not hyp_tokens:
            return 1.0 if not ref_tokens else 0.0

        if weights is None:
            weights = [0.25, 0.25, 0.25, 0.25]

        # Count n-grams for each order
        ref_counts = [Counter() for _ in range(max_n + 1)]
        hyp_counts = [Counter() for _ in range(max_n + 1)]

        for order in range(1, max_n + 1):
            for ng in _word_ngrams(ref_tokens, order):
                ref_counts[order][ng] += 1
            for ng in _word_ngrams(hyp_tokens, order):
                hyp_counts[order][ng] += 1

        # Modified precision for each order
        log_precision = 0.0
        valid_orders = 0
        for order in range(1, max_n + 1):
            ngrams = _word_ngrams(hyp_tokens, order)
            if not ngrams:
                continue
            clipped = sum(
                min(hyp_counts[order][ng], ref_counts[order][ng])
                for ng in ngrams
            )
            precision = clipped / len(ngrams)
            if precision > 0:
                log_precision += weights[order - 1] * math.log(precision)
                valid_orders += 1

        if valid_orders == 0:
            return 0.0

        avg_precision = math.exp(log_precision)

        # Brevity penalty
        bp = min(1.0, math.exp(1 - len(ref_tokens) / max(len(hyp_tokens), 1)))

        return bp * avg_precision

    @staticmethod
    def rouge_l(reference: str, hypothesis: str) -> float:
        """
        ROUGE-L score based on Longest Common Subsequence (LCS).
        F-score: 2 * (precision * recall) / (precision + recall)
        """
        ref_tokens = _tokenize(reference)
        hyp_tokens = _tokenize(hypothesis)

        if not ref_tokens or not hyp_tokens:
            return 1.0 if not ref_tokens and not hyp_tokens else 0.0

        # LCS using DP
        m, n = len(ref_tokens), len(hyp_tokens)
        dp = [[0] * (n + 1) for _ in range(m + 1)]

        for i in range(1, m + 1):
            for j in range(1, n + 1):
                if ref_tokens[i-1] == hyp_tokens[j-1]:
                    dp[i][j] = dp[i-1][j-1] + 1
                else:
                    dp[i][j] = max(dp[i-1][j], dp[i][j-1])

        lcs_len = dp[m][n]

        precision = lcs_len / max(len(hyp_tokens), 1)
        recall = lcs_len / max(len(ref_tokens), 1)

        if precision + recall == 0:
            return 0.0

        f1 = 2 * precision * recall / (precision + recall)
        return f1

    @staticmethod
    def exact_match(reference: str, hypothesis: str) -> bool:
        """Exact string match (case-insensitive, stripped)."""
        return reference.strip().lower() == hypothesis.strip().lower()

    @staticmethod
    def token_f1(reference: str, hypothesis: str) -> Tuple[float, float, float]:
        """
        Token-level Precision, Recall, F1.
        Returns (precision, recall, f1).
        """
        ref_tokens = set(_tokenize(reference.lower()))
        hyp_tokens = set(_tokenize(hypothesis.lower()))

        if not ref_tokens and not hyp_tokens:
            return 1.0, 1.0, 1.0
        if not ref_tokens or not hyp_tokens:
            return 0.0, 0.0, 0.0

        intersection = ref_tokens & hyp_tokens
        precision = len(intersection) / len(hyp_tokens)
        recall = len(intersection) / len(ref_tokens)

        if precision + recall == 0:
            return 0.0, 0.0, 0.0

        f1 = 2 * precision * recall / (precision + recall)
        return precision, recall, f1

    @staticmethod
    def semantic_similarity_embedding(
        text1: str,
        text2: str,
        model: Any = None
    ) -> float:
        """
        Semantic similarity using embedding model (optional).
        Falls back to char n-gram cosine if no model provided.
        """
        if model is not None:
            try:
                emb1 = model.encode(text1)
                emb2 = model.encode(text2)
                dot = float(emb1 @ emb2.T)
                norm1 = float(emb1 @ emb1.T)
                norm2 = float(emb2 @ emb2.T)
                if norm1 == 0 or norm2 == 0:
                    return 0.0
                return dot / (math.sqrt(norm1) * math.sqrt(norm2))
            except Exception:
                pass
        return AnswerComparator.cosine_similarity_char(text1, text2)


# ─── Comparison Engine ───────────────────────────────────────────────────────

@dataclass
class ComparisonResult:
    test_id: str
    question: str
    teacher_answer: str
    student_answer: str
    metrics: Dict[str, float] = field(default_factory=dict)
    passed: bool = False
    overall_score: float = 0.0

    def to_dict(self) -> Dict:
        return {
            "test_id": self.test_id,
            "question": self.question[:200],
            "teacher_answer": self.teacher_answer[:200],
            "student_answer": self.student_answer[:200],
            "metrics": self.metrics,
            "passed": self.passed,
            "overall_score": round(self.overall_score, 4),
        }


class ComparisonEngine:
    """Run comparison of Teacher vs Student answers."""

    def __init__(self, weights: Optional[Dict[str, float]] = None):
        self.weights = weights or {
            "cosine_char": 0.25,
            "cosine_word": 0.20,
            "bleu": 0.15,
            "rouge_l": 0.20,
            "token_f1": 0.20,
        }

    def compare(
        self,
        test_id: str,
        question: str,
        teacher_answer: str,
        student_answer: str,
    ) -> ComparisonResult:
        """Compare a single pair of answers."""
        # Compute metrics
        cosine_char = AnswerComparator.cosine_similarity_char(teacher_answer, student_answer)
        cosine_word = AnswerComparator.cosine_similarity_word(teacher_answer, student_answer)
        bleu = AnswerComparator.bleu_score(teacher_answer, student_answer)
        rouge_l = AnswerComparator.rouge_l(teacher_answer, student_answer)
        em = 1.0 if AnswerComparator.exact_match(teacher_answer, student_answer) else 0.0
        precision, recall, token_f1 = AnswerComparator.token_f1(teacher_answer, student_answer)

        # Weighted overall score
        w = self.weights
        overall = (
            cosine_char * w["cosine_char"] +
            cosine_word * w["cosine_word"] +
            bleu * w["bleu"] +
            rouge_l * w["rouge_l"] +
            token_f1 * w["token_f1"]
        )

        metrics = {
            "cosine_similarity_char": round(cosine_char, 4),
            "cosine_similarity_word": round(cosine_word, 4),
            "bleu_score": round(bleu, 4),
            "rouge_l": round(rouge_l, 4),
            "exact_match": em,
            "token_precision": round(precision, 4),
            "token_recall": round(recall, 4),
            "token_f1": round(token_f1, 4),
        }

        # Pass threshold: 85%
        passed = overall >= 0.85

        return ComparisonResult(
            test_id=test_id,
            question=question,
            teacher_answer=teacher_answer,
            student_answer=student_answer,
            metrics=metrics,
            passed=passed,
            overall_score=overall,
        )

    def compare_batch(
        self,
        test_cases: List[Dict[str, str]]
    ) -> List[ComparisonResult]:
        """Compare a batch of test cases."""
        results = []
        for i, tc in enumerate(test_cases):
            result = self.compare(
                test_id=f"test_{i+1:03d}",
                question=tc.get("question", tc.get("prompt", "")),
                teacher_answer=tc.get("teacher_answer", tc.get("expected", "")),
                student_answer=tc.get("student_answer", tc.get("actual", "")),
            )
            results.append(result)
        return results


# ─── Report Generator ────────────────────────────────────────────────────────

class BenchmarkReport:
    """Generate benchmark comparison report."""

    @staticmethod
    def generate(results: List[ComparisonResult]) -> Dict:
        """Generate comprehensive benchmark report."""
        if not results:
            return {"error": "No results to report"}

        total = len(results)
        passed = sum(1 for r in results if r.passed)
        failed = total - passed

        # Aggregate metrics
        avg_cosine_char = sum(r.metrics["cosine_similarity_char"] for r in results) / total
        avg_cosine_word = sum(r.metrics["cosine_similarity_word"] for r in results) / total
        avg_bleu = sum(r.metrics["bleu_score"] for r in results) / total
        avg_rouge_l = sum(r.metrics["rouge_l"] for r in results) / total
        avg_token_f1 = sum(r.metrics["token_f1"] for r in results) / total
        avg_overall = sum(r.overall_score for r in results) / total
        exact_match_count = sum(1 for r in results if r.metrics["exact_match"] > 0)

        # Score distribution
        excellent = sum(1 for r in results if r.overall_score >= 0.95)
        good = sum(1 for r in results if 0.85 <= r.overall_score < 0.95)
        mediocre = sum(1 for r in results if 0.70 <= r.overall_score < 0.85)
        poor = sum(1 for r in results if r.overall_score < 0.70)

        # Worst cases (top 10 failed)
        worst = sorted(results, key=lambda r: r.overall_score)[:10]

        report = {
            "total_tests": total,
            "passed": passed,
            "failed": failed,
            "pass_rate": round(passed / total * 100, 2),
            "overall_similarity": round(avg_overall * 100, 2),
            "metrics": {
                "avg_cosine_char": round(avg_cosine_char * 100, 2),
                "avg_cosine_word": round(avg_cosine_word * 100, 2),
                "avg_bleu": round(avg_bleu * 100, 2),
                "avg_rouge_l": round(avg_rouge_l * 100, 2),
                "avg_token_f1": round(avg_token_f1 * 100, 2),
            },
            "distribution": {
                "excellent_95_100": excellent,
                "good_85_95": good,
                "mediocre_70_85": mediocre,
                "poor_below_70": poor,
            },
            "exact_matches": exact_match_count,
            "worst_cases": [r.to_dict() for r in worst],
            "individual_results": [r.to_dict() for r in results],
        }

        return report

    @staticmethod
    def save_report(report: Dict, output_path: str) -> str:
        """Save report to JSON file."""
        os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(report, f, indent=2, ensure_ascii=False)
        return output_path

    @staticmethod
    def format_summary(report: Dict) -> str:
        """Format report as human-readable summary."""
        lines = [
            "=" * 60,
            "  BENCHMARK REPORT — Teacher vs Student Comparison",
            "=" * 60,
            f"  Total tests:        {report['total_tests']}",
            f"  Passed:             {report['passed']} ({report['pass_rate']}%)",
            f"  Failed:             {report['failed']}",
            f"  Overall similarity: {report['overall_similarity']}%",
            "",
            "  Metrics (avg %):",
            f"    Cosine char:      {report['metrics']['avg_cosine_char']}",
            f"    Cosine word:      {report['metrics']['avg_cosine_word']}",
            f"    BLEU:             {report['metrics']['avg_bleu']}",
            f"    ROUGE-L:          {report['metrics']['avg_rouge_l']}",
            f"    Token F1:         {report['metrics']['avg_token_f1']}",
            "",
            "  Distribution:",
            f"    Excellent (≥95%): {report['distribution']['excellent_95_100']}",
            f"    Good (85-95%):    {report['distribution']['good_85_95']}",
            f"    Mediocre (70-85%):{report['distribution']['mediocre_70_85']}",
            f"    Poor (<70%):      {report['distribution']['poor_below_70']}",
            "",
        ]

        if report['worst_cases']:
            lines.append("  Worst cases (top 10):")
            for i, case in enumerate(report['worst_cases'][:10], 1):
                lines.append(f"    {i}. {case['test_id']} — {case['overall_score']:.2%}")
                lines.append(f"       Q: {case['question'][:80]}...")

        lines.append("=" * 60)
        return "\n".join(lines)
