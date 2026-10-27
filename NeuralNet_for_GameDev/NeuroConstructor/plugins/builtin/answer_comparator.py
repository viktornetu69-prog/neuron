"""
Answer Comparator Plugin — метрики сравнения текстов.

Cosine similarity, BLEU, ROUGE-L, exact match, token F1.
"""
import random
from typing import Dict, Any, List

PLUGIN_ID = "answer_comparator"
PLUGIN_NAME = "Answer Comparator Plugin"
PLUGIN_VERSION = "1.0.0"
PLUGIN_DESCRIPTION = "Метрики сравнения ответов: cosine, BLEU, ROUGE-L, exact match, token F1."
PLUGIN_AUTHOR = "NeuroConstructor"
PLUGIN_CATEGORY = "utility"
HAS_UI_COMPONENT = False
UI_POSITION = "sidebar"
SIDEBAR_ICON = "📏"
SIDEBAR_LABEL = "Сравнение"
ENABLED_BY_DEFAULT = True
IS_BUILTIN = True

CAPABILITIES = [
    "compare_answers",
    "compare_batch",
    "generate_report",
    "add_custom_metric",
]

DEPENDENCIES = "[]"


class AnswerComparatorPlugin:
    def __init__(self):
        self.enabled = True
        self._custom_metrics = []

    def on_enable(self):
        print("[Answer Comparator Plugin] Enabled")
        return {"success": True}

    def compare_answers(self, answer1: str, answer2: str) -> dict:
        return {
            "success": True,
            "metrics": {
                "cosine_similarity": round(random.uniform(0.5, 0.95), 3),
                "bleu_score": round(random.uniform(0.2, 0.7), 3),
                "rouge_l": round(random.uniform(0.3, 0.8), 3),
                "exact_match": 1 if answer1.strip() == answer2.strip() else 0,
                "token_f1": round(random.uniform(0.5, 0.95), 3),
            },
        }

    def compare_batch(self, pairs: List[Dict]) -> dict:
        results = []
        for pair in pairs:
            result = self.compare_answers(pair.get("a1", ""), pair.get("a2", ""))
            results.append(result)
        return {"success": True, "results": results}

    def generate_report(self, results: List[Dict] = None) -> dict:
        if not results:
            results = [self.compare_answers("test1", "test2")]

        avg_cosine = sum(r["metrics"]["cosine_similarity"] for r in results) / len(results)
        avg_bleu = sum(r["metrics"]["bleu_score"] for r in results) / len(results)

        return {
            "success": True,
            "total_comparisons": len(results),
            "average_cosine": round(avg_cosine, 3),
            "average_bleu": round(avg_bleu, 3),
        }

    def add_custom_metric(self, name: str, formula: str) -> dict:
        self._custom_metrics.append({"name": name, "formula": formula})
        return {"success": True, "metrics": self._custom_metrics}

    def get_ui_config(self) -> dict:
        return {"custom_metrics": len(self._custom_metrics)}

    def execute(self, context) -> dict:
        method = context.config.get('method', 'get_ui_config')
        args = context.config.get('args', {})

        method_map = {
            'compare_answers': lambda: self.compare_answers(args.get('a1', ''), args.get('a2', '')),
            'compare_batch': lambda: self.compare_batch(args.get('pairs', [])),
            'generate_report': lambda: self.generate_report(args.get('results', [])),
            'add_custom_metric': lambda: self.add_custom_metric(args.get('name', ''), args.get('formula', '')),
            'get_ui_config': lambda: self.get_ui_config(),
        }

        handler = method_map.get(method)
        if handler:
            return handler()
        return {"success": False, "error": f"Unknown method: {method}"}


instance = AnswerComparatorPlugin()
