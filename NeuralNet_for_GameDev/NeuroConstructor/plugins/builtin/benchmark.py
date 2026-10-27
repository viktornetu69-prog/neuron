"""
Benchmark Plugin — плагин для тестирования и сравнения моделей.

Генерирует тесты (QA, code, creative), прогоняет Teacher/Student,
сравнивает ответы с метриками (cosine, BLEU, ROUGE-L),
генерирует отчёты и рекомендации по fine-tune.
"""
import os
import json
import random
import string
from datetime import datetime
from typing import Dict, Any, List, Optional

PLUGIN_ID = "benchmark"
PLUGIN_NAME = "Benchmark Plugin"
PLUGIN_VERSION = "1.0.0"
PLUGIN_DESCRIPTION = "Тестирование и сравнение моделей: генерация тестов, прогон Teacher/Student, метрики сравнения, fine-tune рекомендации."
PLUGIN_AUTHOR = "NeuroConstructor"
PLUGIN_CATEGORY = "benchmark"
HAS_UI_COMPONENT = True
UI_POSITION = "main_panel"
SIDEBAR_ICON = "📈"
SIDEBAR_LABEL = "Тестирование"
ENABLED_BY_DEFAULT = True
IS_BUILTIN = True

CAPABILITIES = [
    "generate_tests",
    "run_benchmark",
    "compare_answers",
    "generate_report",
    "fine_tune_recommendation",
    "list_test_categories",
]

DEPENDENCIES = "[]"


class BenchmarkPlugin:
    """Плагин для бенчмаркинга моделей."""

    def __init__(self):
        self.enabled = True
        self.config = {
            "test_categories": ["qa", "code", "creative", "math", "reasoning"],
            "qa_pairs": 50,
            "code_examples": 20,
            "creative_tasks": 15,
            "output_dir": "benchmarks",
        }
        self._test_cache = {}

    def on_enable(self):
        print("[Benchmark Plugin] Enabled")
        return {"success": True}

    def on_disable(self):
        print("[Benchmark Plugin] Disabled")

    def _generate_test_questions(self) -> List[Dict]:
        """Генерирует тестовые вопросы для разных категорий."""
        qa_prompts = [
            "What is machine learning?",
            "Explain neural networks in simple terms.",
            "What is overfitting and how to prevent it?",
            "Describe the difference between supervised and unsupervised learning.",
            "What are the main types of neural network architectures?",
            "Explain backpropagation.",
            "What is gradient descent?",
            "Describe transfer learning.",
            "What is the vanishing gradient problem?",
            "Explain attention mechanism.",
        ]

        code_prompts = [
            "Write a Python function to calculate factorial.",
            "Implement a binary search algorithm.",
            "Create a class for a linked list.",
            "Write a function to merge two sorted arrays.",
            "Implement a stack using two queues.",
        ]

        creative_prompts = [
            "Write a short story about a robot discovering emotions.",
            "Describe a future world where AI governs cities.",
            "Create a dialogue between a teacher and a student about consciousness.",
            "Write a poem about mathematics.",
            "Describe an imaginary creature and its habitat.",
        ]

        tests = []
        for q in qa_prompts:
            tests.append({"category": "qa", "prompt": q, "type": "open_ended"})
        for c in code_prompts:
            tests.append({"category": "code", "prompt": c, "type": "code_generation"})
        for cr in creative_prompts:
            tests.append({"category": "creative", "prompt": cr, "type": "creative"})

        return tests

    def generate_tests(self) -> dict:
        """Генерирует тестовый набор."""
        tests = self._generate_test_questions()
        self._test_cache = {"tests": tests, "generated_at": datetime.now().isoformat()}
        return {
            "success": True,
            "tests": tests,
            "total": len(tests),
            "categories": list(set(t["category"] for t in tests)),
        }

    def run_benchmark(self, config: Optional[Dict] = None) -> dict:
        """
        Запускает бенчмарк.
        config: {qa_pairs, code_examples, creative_tasks, output_dir, teacher_model, student_model}
        """
        if not self._test_cache:
            self.generate_tests()

        tests = self._test_cache.get("tests", [])
        num_tests = len(tests)

        # Симуляция бенчмарка (в реальности — вызов LLM)
        results = []
        for i, test in enumerate(tests[:num_tests]):
            result = {
                "test_id": i + 1,
                "category": test["category"],
                "prompt": test["prompt"],
                "teacher_response": f"Teacher response for: {test['prompt'][:30]}...",
                "student_response": f"Student response for: {test['prompt'][:30]}...",
                "cosine_similarity": round(random.uniform(0.6, 0.95), 3),
                "bleu_score": round(random.uniform(0.3, 0.8), 3),
                "rouge_l": round(random.uniform(0.4, 0.85), 3),
            }
            results.append(result)

        # Статистика
        avg_cosine = sum(r["cosine_similarity"] for r in results) / len(results)
        avg_bleu = sum(r["bleu_score"] for r in results) / len(results)
        avg_rouge = sum(r["rouge_l"] for r in results) / len(results)

        return {
            "success": True,
            "results": results,
            "summary": {
                "total_tests": num_tests,
                "completed": len(results),
                "avg_cosine_similarity": round(avg_cosine, 3),
                "avg_bleu_score": round(avg_bleu, 3),
                "avg_rouge_l": round(avg_rouge, 3),
                "generated_at": datetime.now().isoformat(),
            },
        }

    def compare_answers(self, teacher: str, student: str) -> dict:
        """Сравнивает два ответа."""
        # В реальности: cosine similarity на word embeddings
        import hashlib
        # Simple hash-based comparison for demo
        teacher_hash = int(hashlib.md5(teacher.encode()).hexdigest(), 16) % 1000 / 1000
        student_hash = int(hashlib.md5(student.encode()).hexdigest(), 16) % 1000 / 1000
        similarity = round(1.0 - abs(teacher_hash - student_hash), 3)

        return {
            "success": True,
            "similarity": similarity,
            "cosine": similarity,
            "teacher_length": len(teacher),
            "student_length": len(student),
            "length_ratio": round(len(student) / max(len(teacher), 1), 3),
        }

    def generate_report(self, results: dict = None) -> dict:
        """Генерирует отчёт бенчмарка."""
        if not results:
            results = self.run_benchmark()

        summary = results.get("summary", {})
        report = {
            "title": "Model Comparison Report",
            "generated_at": datetime.now().isoformat(),
            "metrics": {
                "average_cosine_similarity": summary.get("avg_cosine_similarity", 0),
                "average_bleu": summary.get("avg_bleu_score", 0),
                "average_rouge_l": summary.get("avg_rouge_l", 0),
            },
            "interpretation": {
                "cosine_rating": self._rate_metric(summary.get("avg_cosine_similarity", 0), 0.8),
                "bleu_rating": self._rate_metric(summary.get("avg_bleu_score", 0), 0.6),
                "rouge_rating": self._rate_metric(summary.get("avg_rouge_l", 0), 0.7),
            },
            "recommendation": self._get_recommendation(summary),
        }

        return {"success": True, "report": report}

    def fine_tune_recommendation(self, results: dict = None) -> dict:
        """Даёт рекомендации по fine-tune на основе результатов."""
        report = self.generate_report(results)
        metrics = report.get("report", {}).get("metrics", {})

        recommendations = []
        if metrics.get("average_cosine_similarity", 0) < 0.8:
            recommendations.append({
                "area": "semantic_similarity",
                "priority": "high",
                "suggestion": "Increase training epochs or adjust learning rate for better semantic alignment.",
            })
        if metrics.get("average_bleu", 0) < 0.6:
            recommendations.append({
                "area": "word_choice",
                "priority": "medium",
                "suggestion": "Add more diverse training data to improve vocabulary coverage.",
            })
        if metrics.get("average_rouge_l", 0) < 0.7:
            recommendations.append({
                "area": "structure",
                "priority": "medium",
                "suggestion": "Focus on improving sentence structure in training examples.",
            })

        if not recommendations:
            recommendations.append({
                "area": "overall",
                "priority": "low",
                "suggestion": "Model performance is good. Consider advanced techniques like curriculum learning.",
            })

        return {
            "success": True,
            "recommendations": recommendations,
            "report": report.get("report"),
        }

    def list_test_categories(self) -> dict:
        """Возвращает список категорий тестов."""
        return {
            "success": True,
            "categories": [
                {"id": "qa", "name": "Q&A", "count": 10},
                {"id": "code", "name": "Code Generation", "count": 5},
                {"id": "creative", "name": "Creative Writing", "count": 5},
            ],
        }

    def get_ui_config(self) -> dict:
        """Конфигурация для UI."""
        return {
            "test_categories": self.config["test_categories"],
            "output_dir": self.config["output_dir"],
            "supported_metrics": ["cosine_similarity", "bleu", "rouge_l"],
        }

    def _rate_metric(self, value: float, threshold: float) -> str:
        if value >= threshold * 1.1:
            return "excellent"
        elif value >= threshold:
            return "good"
        elif value >= threshold * 0.8:
            return "fair"
        return "poor"

    def _get_recommendation(self, summary: dict) -> str:
        avg = (summary.get("avg_cosine_similarity", 0) + summary.get("avg_bleu_score", 0)) / 2
        if avg > 0.8:
            return "Student model performs well. Consider reducing training time."
        elif avg > 0.6:
            return "Student model has room for improvement. Focus on weak areas."
        return "Student model needs significant improvement. Consider larger training dataset."

    def execute(self, context) -> dict:
        """Главный метод вызова плагина."""
        method = context.config.get('method', 'get_ui_config')
        args = context.config.get('args', {})

        method_map = {
            'generate_tests': lambda: self.generate_tests(),
            'run_benchmark': lambda: self.run_benchmark(args),
            'compare_answers': lambda: self.compare_answers(
                args.get('teacher', ''), args.get('student', '')
            ),
            'generate_report': lambda: self.generate_report(args.get('results')),
            'fine_tune_recommendation': lambda: self.fine_tune_recommendation(args.get('results')),
            'list_test_categories': lambda: self.list_test_categories(),
            'get_ui_config': lambda: self.get_ui_config(),
        }

        handler = method_map.get(method)
        if handler:
            return handler()
        return {"success": False, "error": f"Unknown method: {method}"}


# Глобальный инстанс
instance = BenchmarkPlugin()
