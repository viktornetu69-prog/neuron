"""
Self Learning Plugin — адаптивная оптимизация на основе результатов.

Анализ success rate, адаптация параметров, предложения по оптимизации.
"""
import random
from datetime import datetime
from typing import Dict, Any, List

PLUGIN_ID = "self_learning"
PLUGIN_NAME = "Self Learning Plugin"
PLUGIN_VERSION = "1.0.0"
PLUGIN_DESCRIPTION = "Самообучение: адаптация параметров, анализ success rate, оптимизация."
PLUGIN_AUTHOR = "NeuroConstructor"
PLUGIN_CATEGORY = "ai_assistant"
HAS_UI_COMPONENT = False
UI_POSITION = "sidebar"
SIDEBAR_ICON = "📚"
SIDEBAR_LABEL = "Самообучение"
ENABLED_BY_DEFAULT = True
IS_BUILTIN = True

CAPABILITIES = [
    "learn_from_results",
    "adapt_parameters",
    "get_optimization_suggestions",
    "get_learning_stats",
]

DEPENDENCIES = "[]"


class SelfLearningPlugin:
    def __init__(self):
        self.enabled = True
        self.config = {
            "learning_rate": 0.01,
            "adaptation_interval": 300,
        }
        self._parameters = {
            "learning_rate": 0.001,
            "batch_size": 32,
            "temperature": 1.0,
            "top_p": 0.9,
        }
        self._results = []
        self._suggestions = []

    def on_enable(self):
        print("[Self Learning Plugin] Enabled")
        return {"success": True}

    def learn_from_results(self, results: List[Dict]) -> dict:
        for result in results:
            self._results.append({
                "timestamp": datetime.now().isoformat(),
                "success": result.get("success", True),
                "metrics": result.get("metrics", {}),
            })

        # Analyze patterns
        success_rate = sum(1 for r in self._results if r["success"]) / max(len(self._results), 1)

        if success_rate < 0.7:
            self._suggestions.append({
                "type": "reduce_complexity",
                "message": f"Success rate low ({success_rate:.1%}). Consider reducing model complexity.",
                "priority": "high",
            })

        return {
            "success": True,
            "learned_from": len(results),
            "total_records": len(self._results),
            "success_rate": round(success_rate, 3),
        }

    def adapt_parameters(self) -> dict:
        """Адаптирует параметры на основе результатов."""
        old_params = dict(self._parameters)
        changes = []

        if self._results:
            success_rate = sum(1 for r in self._results if r["success"]) / len(self._results)
            if success_rate < 0.8:
                self._parameters["learning_rate"] *= 0.9
                changes.append({"param": "learning_rate", "old": old_params["learning_rate"], "new": self._parameters["learning_rate"], "reason": "low_success_rate"})

        self._parameters["batch_size"] = max(8, self._parameters["batch_size"])

        return {
            "success": True,
            "changes": changes,
            "current_params": self._parameters,
        }

    def get_optimization_suggestions(self) -> dict:
        return {
            "success": True,
            "suggestions": self._suggestions[-5:],
            "parameters": self._parameters,
        }

    def get_learning_stats(self) -> dict:
        success_count = sum(1 for r in self._results if r["success"])
        return {
            "success": True,
            "total_results": len(self._results),
            "success_count": success_count,
            "success_rate": round(success_count / max(len(self._results), 1), 3),
            "current_parameters": self._parameters,
        }

    def get_ui_config(self) -> dict:
        return {"params": self._parameters, "results_count": len(self._results)}

    def execute(self, context) -> dict:
        method = context.config.get('method', 'get_ui_config')
        args = context.config.get('args', {})

        method_map = {
            'learn_from_results': lambda: self.learn_from_results(args.get('results', [])),
            'adapt_parameters': lambda: self.adapt_parameters(),
            'get_optimization_suggestions': lambda: self.get_optimization_suggestions(),
            'get_learning_stats': lambda: self.get_learning_stats(),
            'get_ui_config': lambda: self.get_ui_config(),
        }

        handler = method_map.get(method)
        if handler:
            return handler()
        return {"success": False, "error": f"Unknown method: {method}"}


instance = SelfLearningPlugin()
