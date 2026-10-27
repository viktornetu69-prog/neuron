"""
Forecast Engine Plugin — прогнозирование нагрузки на систему.

Анализ исторических метрик, оценка ресурсов, рекомендации по масштабированию.
"""
import random
from datetime import datetime, timedelta
from typing import Dict, Any, List

PLUGIN_ID = "forecast_engine"
PLUGIN_NAME = "Forecast Engine Plugin"
PLUGIN_VERSION = "1.0.0"
PLUGIN_DESCRIPTION = "Прогнозирование нагрузки: анализ метрик, оценка ресурсов, масштабирование."
PLUGIN_AUTHOR = "NeuroConstructor"
PLUGIN_CATEGORY = "ai_assistant"
HAS_UI_COMPONENT = False
UI_POSITION = "sidebar"
SIDEBAR_ICON = "📊"
SIDEBAR_LABEL = "Прогнозирование"
ENABLED_BY_DEFAULT = True
IS_BUILTIN = True

CAPABILITIES = [
    "record_metrics",
    "predict_load",
    "estimate_resources",
    "should_scale",
    "get_forecast_summary",
]

DEPENDENCIES = "[]"


class ForecastEnginePlugin:
    def __init__(self):
        self.enabled = True
        self.config = {
            "history_size": 100,
            "prediction_horizon": 24,
            "alert_threshold": 0.8,
        }
        self._metrics = []

    def on_enable(self):
        print("[Forecast Engine Plugin] Enabled")
        return {"success": True}

    def record_metrics(self, load: float, memory: float, cpu: float) -> dict:
        self._metrics.append({
            "timestamp": datetime.now().isoformat(),
            "load": load,
            "memory": memory,
            "cpu": cpu,
        })
        if len(self._metrics) > self.config["history_size"]:
            self._metrics = self._metrics[-self.config["history_size"]:]
        return {"success": True, "total_records": len(self._metrics)}

    def predict_load(self, horizon: int = None) -> dict:
        horizon = horizon or self.config["prediction_horizon"]
        if not self._metrics:
            return {"success": False, "error": "No metrics recorded"}

        # Simple moving average forecast
        avg_load = sum(m["load"] for m in self._metrics) / len(self._metrics)
        predictions = []
        for h in range(horizon):
            predicted = avg_load + random.uniform(-0.1, 0.1)
            predictions.append({
                "hour": h,
                "predicted_load": round(max(0, min(1, predicted)), 3),
                "confidence": round(max(0.5, 0.9 - h * 0.01), 3),
            })

        return {
            "success": True,
            "predictions": predictions,
            "average_load": round(avg_load, 3),
            "trend": "increasing" if predictions[-1]["predicted_load"] > predictions[0]["predicted_load"] else "stable",
        }

    def estimate_resources(self) -> dict:
        if not self._metrics:
            return {"success": False, "error": "No metrics"}

        avg_memory = sum(m["memory"] for m in self._metrics) / len(self._metrics)
        avg_cpu = sum(m["cpu"] for m in self._metrics) / len(self._metrics)

        return {
            "success": True,
            "estimated_memory_gb": round(avg_memory * 16, 1),  # Scale to GB
            "estimated_cpu_cores": max(1, int(avg_cpu * 8)),
            "recommendation": "adequate" if avg_memory < 0.7 else "upgrade_needed",
        }

    def should_scale(self) -> dict:
        if not self._metrics:
            return {"success": True, "should_scale": False}

        avg = sum(m["load"] for m in self._metrics) / len(self._metrics)
        should = avg > self.config["alert_threshold"]

        return {
            "success": True,
            "should_scale": should,
            "current_avg": round(avg, 3),
            "threshold": self.config["alert_threshold"],
        }

    def get_forecast_summary(self) -> dict:
        return {
            "success": True,
            "metrics_count": len(self._metrics),
            "last_updated": self._metrics[-1]["timestamp"] if self._metrics else None,
            "avg_load": round(sum(m["load"] for m in self._metrics) / max(len(self._metrics), 1), 3),
        }

    def get_ui_config(self) -> dict:
        return {"metrics_count": len(self._metrics), "horizon": self.config["prediction_horizon"]}

    def execute(self, context) -> dict:
        method = context.config.get('method', 'get_ui_config')
        args = context.config.get('args', {})

        method_map = {
            'record_metrics': lambda: self.record_metrics(args.get('load', 0), args.get('memory', 0), args.get('cpu', 0)),
            'predict_load': lambda: self.predict_load(args.get('horizon', 24)),
            'estimate_resources': lambda: self.estimate_resources(),
            'should_scale': lambda: self.should_scale(),
            'get_forecast_summary': lambda: self.get_forecast_summary(),
            'get_ui_config': lambda: self.get_ui_config(),
        }

        handler = method_map.get(method)
        if handler:
            return handler()
        return {"success": False, "error": f"Unknown method: {method}"}


instance = ForecastEnginePlugin()
